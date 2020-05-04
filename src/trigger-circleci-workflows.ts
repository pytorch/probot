import axios from 'axios';
import * as probot from 'probot';
import * as utils from './utils';

export const configName = 'pytorch-circleci-labels.yml';
export const circleAPIUrl = 'https://circleci.com';
const circleToken = process.env.CIRCLE_TOKEN;
const repoMap = new Map<string, object>();

async function loadConfig(context: probot.Context): Promise<object> {
  const repoKey = utils.repoKey(context);
  let configObj = repoMap.get(repoKey);
  if (configObj === undefined) {
    context.log.debug(`Grabbing config for ${repoKey}`, 'loadConfig');
    configObj = await context.config(configName);
    if (configObj === null || !configObj['labels_to_circle_params']) {
      return {};
    }
    context.log.debug({configObj}, 'loadConfig');
    repoMap.set(repoKey, configObj);
  }
  return repoMap.get(repoKey);
}

async function getAppliedLabels(context: probot.Context): Promise<string[]> {
  const appliedLabels = new Array<string>();
  // Check if we already have the applied labels in our context payload
  if (context.payload['pull_request']['labels']) {
    for (const label of context.payload['pull_request']['labels']) {
      appliedLabels.push(label['name']);
    }
  }
  context.log.debug({appliedLabels}, 'getAppliedLabels');
  return appliedLabels;
}

async function triggerCircleCI(
  context: probot.Context,
  parameters: object
): Promise<void> {
  const repoKey = utils.repoKey(context);
  const branch = context.payload['pull_request']['head']['ref'];
  const data = {branch, parameters};
  context.log.debug({repoKey, data}, 'triggerCircleCI');
  await axios
    .post(`${circleAPIUrl}${circlePipelineEndpoint(repoKey)}`, data, {
      validateStatus: () => {
        return true;
      },
      auth: {
        username: circleToken,
        password: ''
      }
    })
    .then(resp => {
      if (resp.status !== 201) {
        throw Error(
          `Error triggering downstream circleci workflow (${
            resp.status
          }): ${JSON.stringify(resp.data)}`
        );
      }
    });
  context.log.info(
    `Build triggered successfully for ${context.payload['pull_request']['html_url']}`
  );
}

export function circlePipelineEndpoint(repoKey: string): string {
  return `/api/v2/project/github/${repoKey}/pipeline`;
}

export function isOnFork(context: probot.Context): boolean {
  const fork = context.payload['pull_request']['head']['repo']['fork'];
  context.log.debug({fork}, 'isOnFork');
  if (fork) {
    context.log.info(
      `PR ${context.payload['pull_request']['html_url']} came from a fork, refusing to do work`
    );
  }
  return fork;
}

async function runOnPR(context: probot.Context): Promise<void> {
  try {
    if (isOnFork(context)) {
      // Don't do anything
      return;
    }
    const config = await loadConfig(context);
    if (Object.keys(config).length === 0) {
      context.log.debug(
        `No configuration found for repository ${utils.repoKey(context)}`,
        'trigger-circleci-workflows'
      );
      return;
    }
    const labels = await getAppliedLabels(context);
    const parameters = {};
    for (const label of labels) {
      if (label in config['labels_to_circle_params']) {
        parameters[config['labels_to_circle_params'][label]] = true;
      }
    }
    context.log.debug({config, labels, parameters}, 'runBot');
    if (Object.keys(parameters).length !== 0) {
      await triggerCircleCI(context, parameters);
    } else {
      context.log.info(
        `No labels applied for ${context.payload['number']}, not triggering an extra CircleCI build`
      );
    }
  } catch (err) {
    context.log.error(err, 'trigger-circleci-workflows');
  }
}

export function genHelpComment(config: object): string {
  const availableLabels = Object.keys(config)
    .map(label => {
      return `* \`${label}\``;
    })
    .join('\n');
  return `## :robot: This pull request has options for additional testing! :robot:

Apply the following labels to run more tests for your pull request:
${availableLabels}

**NOTE**: These may be out of date, for a full list of options consult your repositories [configuration](../blob/master/.github/${configName})

---
Comment made with [pytorch-probot](https://github.com/pytorch/pytorch-probot)`;
}
async function postHelpComment(context: probot.Context): Promise<void> {
  context.log.debug('Posting help comment!', 'postHelpComment');
  if (isOnFork(context)) {
    // Don't do anything
    return;
  }
  const config = await loadConfig(context);
  if (Object.keys(config).length === 0) {
    context.log.debug(
      `No configuration found for repository ${utils.repoKey(context)}`,
      'trigger-circleci-workflows'
    );
    return;
  }
  const body = genHelpComment(config['labels_to_circle_params']);
  context.log.debug({body}, 'postHelpComment');
  const createCommentResp = await context.github.issues.createComment(
    context.issue({body})
  );
  context.log.info(
    `Created usage comment on issue ${createCommentResp.data['html_url']}`
  );
}

export function myBot(app: probot.Application): void {
  app.on('pull_request.opened', postHelpComment);
  app.on('pull_request.labeled', runOnPR);
  app.on('pull_request.synchronize', runOnPR);
}

export default myBot;
