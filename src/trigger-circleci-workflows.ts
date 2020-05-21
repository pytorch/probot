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
    {data},
    `Build triggered successfully for ${context.payload['pull_request']['html_url']}`
  );
}

export function circlePipelineEndpoint(repoKey: string): string {
  return `/api/v2/project/github/${repoKey}/pipeline`;
}

export function genParameters(
  config: object,
  context: probot.Context,
  appliedLabels: string[]
): object {
  context.log.debug({config, appliedLabels}, 'genParameters');
  const parameters = {};
  const labelsToParams = config['labels_to_circle_params'];
  for (const label of Object.keys(labelsToParams)) {
    // ci/all is a special label that will set all to true
    if (appliedLabels.includes('ci/all') || appliedLabels.includes(label)) {
      parameters[labelsToParams[label]] = true;
    }
  }
  return parameters;
}

async function runBot(context: probot.Context): Promise<void> {
  try {
    if (context.payload['pull_request']['head']['repo']['fork']) {
      context.log.warn(
        `PR ${context.payload['pull_request']['html_url']} came from a fork, refusing to do work`
      );
      return;
    }
    const config = await loadConfig(context);
    if (
      Object.keys(config).length === 0 ||
      !config['labels_to_circle_params']
    ) {
      context.log.debug(
        `No configuration found for repository ${utils.repoKey(context)}`,
        'trigger-circleci-workflows'
      );
      return;
    }
    const labels = await getAppliedLabels(context);
    const parameters = genParameters(config, context, labels);
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

export function myBot(app: probot.Application): void {
  app.on('pull_request.labeled', runBot);
  app.on('pull_request.synchronize', runBot);
}

export default myBot;
