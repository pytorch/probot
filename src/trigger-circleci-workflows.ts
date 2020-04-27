import * as probot from 'probot';

async function runBot(context: probot.Context): Promise<void> {
  const config: any = await context.config(
    '.github/pytorch-circleci-labels.yml'
  );
  if (config.github_labels_to_circleci_params) {
    context.log.info(
      `Found the following for our configuration: ${JSON.stringify(
        config.github_labels_to_circleci_params
      )}`
    );
  }
}

function myBot(app: probot.Application): void {
  app.on('pull_request.labeled', runBot);
  app.on('pull_request.synchronize', runBot);
}

export default myBot;
