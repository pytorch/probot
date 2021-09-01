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
