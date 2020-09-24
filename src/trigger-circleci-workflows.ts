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

function isValidConfig(context: probot.Context, config: object): boolean {
  if (Object.keys(config).length === 0 || !config['labels_to_circle_params']) {
    context.log.debug(
      `No valid configuration found for repository ${utils.repoKey(context)}`
    );
    return false;
  }
  return true;
}

function stripReference(reference: string): string {
  return reference.replace(/refs\/(heads|tags)\//, '');
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
  data: object
): Promise<void> {
  const repoKey = utils.repoKey(context);
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
  context.log.info({data}, `Build triggered successfully for ${repoKey}`);
}

export function circlePipelineEndpoint(repoKey: string): string {
  return `/api/v2/project/github/${repoKey}/pipeline`;
}

export function genCircleParametersForPR(
  config: object,
  context: probot.Context,
  appliedLabels: string[]
): object {
  context.log.debug({config, appliedLabels}, 'genParametersForPR');
  const parameters = {};
  const labelsToParams = config['labels_to_circle_params'];
  for (const label of Object.keys(labelsToParams)) {
    // ci/all is a special label that will set all to true
    if (appliedLabels.includes('ci/all') || appliedLabels.includes(label)) {
      parameters[labelsToParams[label].parameter] = true;
    }
  }
  return parameters;
}

function genCircleParametersForPush(
  config: object,
  context: probot.Context
): object {
  const parameters = {};
  const labelsToParams = config['labels_to_circle_params'];
  const onTag: boolean = context.payload['ref'].startsWith('refs/tags');
  const strippedRef: string = stripReference(context.payload['ref']);
  for (const label of Object.keys(labelsToParams)) {
    context.log.debug({label}, 'genParametersForPush');
    if (!labelsToParams[label]['default_true_on']) {
      context.log.debug(
        `No default_true_on found for ${label}`,
        'genParametersForPush'
      );
      continue;
    }
    const defaultTrueOn = labelsToParams[label]['default_true_on'];
    const refsToMatch = onTag ? 'tags' : 'branches';
    context.log.debug({defaultTrueOn, refsToMatch, strippedRef});
    for (const pattern of defaultTrueOn[refsToMatch]) {
      context.log.debug({pattern}, 'genParametersForPush');
      if (strippedRef.match(pattern)) {
        parameters[labelsToParams[label].parameter] = true;
      }
    }
  }
  return parameters;
}

async function runBotForPR(context: probot.Context): Promise<void> {
  try {
    let triggerBranch = context.payload['pull_request']['head']['ref'];
    if (context.payload['pull_request']['head']['repo']['fork']) {
      triggerBranch = `pull/${context.payload['pull_request']['number']}/head`;
    }
    const config = await loadConfig(context);
    if (!isValidConfig(context, config)) {
      return;
    }
    const labels = await getAppliedLabels(context);
    const parameters = genCircleParametersForPR(config, context, labels);
    context.log.debug({config, labels, parameters}, 'runBot');
    if (Object.keys(parameters).length !== 0) {
      await triggerCircleCI(context, {
        branch: triggerBranch,
        parameters
      });
    } else {
      context.log.info(
        `No labels applied for ${context.payload['number']}, not triggering an extra CircleCI build`
      );
    }
  } catch (err) {
    context.log.error(err, 'runBotForPR');
  }
}

async function runBotForPush(context: probot.Context): Promise<void> {
  try {
    context.log.debug('Recieved push!');
    const config = await loadConfig(context);
    if (!isValidConfig(context, config)) {
      return;
    }
    const onTag: boolean = context.payload['ref'].startsWith('refs/tags');
    const parameters = genCircleParametersForPush(config, context);
    const refKey: string = onTag ? 'tag' : 'branch';
    context.log.debug({parameters}, 'runBot');
    if (Object.keys(parameters).length !== 0) {
      await triggerCircleCI(context, {
        [refKey]: stripReference(context.payload['ref']),
        parameters
      });
    }
  } catch (err) {
    context.log.error(err, 'runBotForPush');
  }
}

export function myBot(app: probot.Application): void {
  app.on('pull_request.labeled', runBotForPR);
  app.on('pull_request.synchronize', runBotForPR);
  app.on('push', runBotForPush);
}

export default myBot;
