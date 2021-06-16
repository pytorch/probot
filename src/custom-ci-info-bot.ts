import * as probot from 'probot';

export const futureLabel = 'ci/future';

// https://gist.github.com/pierrejoubert73/902cc94d79424356a8d20be2b382e1ab
const dummy = `
<details>
<summary>Click to expand...</summary>

_Hello,_ **world!**
</details>
`.trim();

// this has other fields too but we don't use them
interface Label {
  name: string;
}

export function myBot(app: probot.Application): void {
  app.on('pull_request.edited', async context => {
    const {owner, repo} = context.repo();
    const {number, labels, body} = context.payload.pull_request;
    context.log.info({owner, repo, number, body}, 'custom CI info start');
    if (!labels.map((label: Label) => label.name).includes(futureLabel)) {
      context.log.info({futureLabel}, 'ignoring PR, missing CI future label');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/camelcase
    const update = {owner, repo, pull_number: number, body: dummy};
    context.log.info(update, 'updating PR body');
    await context.github.pulls.update(update);
  });
}
