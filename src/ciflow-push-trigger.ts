import {Context, Probot} from 'probot';

function isCIFlowLabel(label: string): boolean {
  return label.startsWith('ciflow/');
}

function labelToTag(label: string, prNum: number): string {
  return `${label}/${prNum}`;
}

function getAllPRTags(context: Context<'pull_request'>): string[] {
  const prNum = context.payload.pull_request.number;
  const labels = context.payload.pull_request.labels
    .map(label => label.name)
    .filter(isCIFlowLabel);

  context.log.info(labels, 'Found labels on PR');
  return labels.map(label => labelToTag(label, prNum));
}

/**
 * Make sure `tag` points to `head_sha`, deleting old tags as necessary.
 * @param tag  looks like "ciflow/trunk/12345", where 12345 is the PR number.
 * @param headSha
 */
async function syncTag(
  context: Context<'pull_request'>,
  tag: string,
  headSha: string
): Promise<void> {
  context.log.info(`Synchronizing tag ${tag} to head sha ${headSha}`);
  const matchingTags = await context.octokit.git.listMatchingRefs(
    context.repo({ref: `tags/${tag}`})
  );
  if (matchingTags.data.length > 0) {
    context.log.info(matchingTags.data, 'Found matching tags');
  } else {
    context.log.info(`No matching tags`);
  }
  for (const match of matchingTags.data) {
    if (match.object.sha === headSha) {
      context.log.info(`Tag ${tag} already points to ${headSha}`);
      return;
    }

    context.log.info(
      `deleting out of date tag ${tag} on sha ${match.object.sha}`
    );
    await context.octokit.git.deleteRef(context.repo({ref: `tags/${tag}`}));
  }

  context.log.info(`Creating tag ${tag} on head sha ${headSha}`);
  await context.octokit.git.createRef(
    context.repo({ref: `refs/tags/${tag}`, sha: headSha})
  );
}

/**
 * Remove a tag from the repo if necessary.
 * @param tag  looks like "ciflow/trunk/12345", where 12345 is the PR number.
 */
async function rmTag(context: Context, tag: string): Promise<void> {
  context.log.info(`Cleaning up tag ${tag}`);
  const matchingTags = await context.octokit.git.listMatchingRefs(
    context.repo({ref: `tags/${tag}`})
  );
  for (const match of matchingTags.data) {
    if (match.ref === `refs/tags/${tag}`) {
      context.log.info(`Deleting tag ${tag} on sha ${match.object.sha}`);
      await context.octokit.git.deleteRef(context.repo({ref: `tags/${tag}`}));
      return;
    }
  }
  context.log.info(`No matching tags for ${tag}`);
}

/**
 * We check all the CIFlow labels on the PR and make sure the corresponding tags
 * are pointing to the PR's head SHA.
 */
async function handleSyncEvent(
  context: Context<'pull_request'>
): Promise<void> {
  context.log.debug(context, 'START Processing sync event');

  const author = context.payload.pull_request.user.login;
  if (author !== 'suo') {
    context.log.info(`Ignoring pull request from ${author}`);
    return;
  }

  const headSha = context.payload.pull_request.head.sha;
  const tags = getAllPRTags(context);
  const promises = tags.map(async tag => await syncTag(context, tag, headSha));
  await Promise.all(promises);
  context.log.info('END Processing sync event');
}

// Remove the tag corresponding to the removed label.
async function handleUnlabeledEvent(
  context: Context<'pull_request.unlabeled'>
): Promise<void> {
  context.log.debug(context, 'START Processing unlabeled event');

  const author = context.payload.pull_request.user.login;
  if (author !== 'suo') {
    context.log.info(`Ignoring pull request from ${author}`);
    return;
  }

  const label = context.payload.label.name;
  if (!isCIFlowLabel(label)) {
    return;
  }
  const prNum = context.payload.pull_request.number;
  const tag = labelToTag(context.payload.label.name, prNum);
  // @ts-expect-error complex union type because of context generic
  await rmTag(context, tag);
}

// Remove all tags as this PR is closed.
async function handleClosedEvent(
  context: Context<'pull_request.closed'>
): Promise<void> {
  context.log.debug(context, 'START Processing rm event');

  const author = context.payload.pull_request.user.login;
  if (author !== 'suo') {
    context.log.info(`Ignoring pull request from ${author}`);
    return;
  }

  const tags = getAllPRTags(context);
  const promises = tags.map(async tag => await rmTag(context, tag));
  await Promise.all(promises);
}

// Add the tag corresponding to the new label.
async function handleLabelEvent(
  context: Context<'pull_request.labeled'>
): Promise<void> {
  context.log.debug(context, 'START Processing label event');

  const author = context.payload.pull_request.user.login;
  if (author !== 'suo') {
    context.log.info(`Ignoring pull request from ${author}`);
    return;
  }

  const label = context.payload.label.name;
  if (!isCIFlowLabel(label)) {
    return;
  }
  const prNum = context.payload.pull_request.number;
  const tag = labelToTag(context.payload.label.name, prNum);
  await syncTag(context, tag, context.payload.pull_request.head.sha);
}

function pushTrigger(app: Probot): void {
  app.on('pull_request.labeled', async context => handleLabelEvent(context));
  app.on(
    [
      'pull_request.synchronize',
      'pull_request.opened',
      'pull_request.reopened'
    ],
    async context => handleSyncEvent(context)
  );
  app.on('pull_request.closed', async context => handleClosedEvent(context));
  app.on('pull_request.unlabeled', async context =>
    handleUnlabeledEvent(context)
  );
}

export default pushTrigger;
