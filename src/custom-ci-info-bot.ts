import * as probot from 'probot';

// https://gist.github.com/pierrejoubert73/902cc94d79424356a8d20be2b382e1ab
const dummy = `
<details>
<summary>Click to expand...</summary>

_Hello,_ **world!**
</details>
`.trim();

export default function myBot(app: probot.Application): void {
  app.on('pull_request.edited', async context => {
    const {owner, repo} = context.repo();
    const {number, labels, body} = context.payload.pull_request;
    context.log.info({owner, repo, number, body}, 'custom CI info start');
    if (!labels.map(label => label.name).includes('ci/future')) {
      context.log.info('ignoring PR because it has no ci/future label');
      return;
    }
    const update = {owner, repo, pull_number: number, body: dummy};
    context.log.info(update, 'updating PR body');
    await context.github.pulls.update(update);
  });
}
