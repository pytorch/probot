import * as probot from 'probot';

export function repoKey(context: probot.Context): string {
  const repo = context.repo();
  return `${repo.owner}/${repo.repo}`;
}
