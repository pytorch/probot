import * as probot from 'probot';

export function repoKey(context: probot.Context): string {
  const repo = context.repo();
  return `${repo.owner}/${repo.repo}`;
}

export class CachedConfigTracker {
  repoConfigs = {};

  constructor(app: probot.Application) {
    app.on('push', async context => {
      if (context.payload.ref === 'refs/heads/master') {
        await this.loadConfig(context, /* force */ true);
      }
    });
  }

  async loadConfig(context: probot.Context, force = false): Promise<object> {
    const key = repoKey(context);
    if (!(key in this.repoConfigs) || force) {
      context.log({key}, 'loadConfig');
      this.repoConfigs[key] = await context.config('pytorch-probot.yml');
    }
    return this.repoConfigs[key];
  }
}

export class CachedIssueTracker extends CachedConfigTracker {
  repoIssues = {};
  configName: string;
  issueParser: (data: string) => object;

  constructor(
    app: probot.Application,
    configName: string,
    issueParser: (data: string) => object
  ) {
    super(app);
    this.configName = configName;
    this.issueParser = issueParser;

    app.on('issues.edited', async context => {
      const config = await this.loadConfig(context);
      const issue = context.issue();
      if (config[this.configName] === issue.number) {
        await this.loadIssue(context, /* force */ true);
      }
    });
  }

  async loadIssue(context: probot.Context, force = false): Promise<object> {
    const key = repoKey(context);
    if (!(key in this.repoIssues) || force) {
      context.log({key}, 'loadIssue');
      const config = await this.loadConfig(context);
      if (config != null && this.configName in config) {
        const subsPayload = await context.github.issues.get(
          context.repo({issue_number: config[this.configName]})
        );
        const subsText = subsPayload.data['body'];
        context.log({subsText});
        this.repoIssues[key] = this.issueParser(subsText);
      } else {
        context.log(
          `${this.configName} is not found in config, initializing with empty string`
        );
        this.repoIssues[key] = this.issueParser('');
      }
      context.log({parsedIssue: this.repoIssues[key]});
    }
    return this.repoIssues[key];
  }
}
