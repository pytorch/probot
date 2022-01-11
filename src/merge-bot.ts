import * as probot from 'probot';

function mergeBot(app: probot.Application): void {
  const cmdPat = new RegExp(`@pytorchbot\smerge\sthis`);
  app.on('issue_comment.created', async ctx => {
    var comment_body = ctx.payload?.comment?.body;
    const owner = ctx.payload?.repository?.owner?.login;
    const repo = ctx.payload?.repository?.name;
    const pr_num = ctx.payload?.issue?.number;
    if (comment_body?.match(cmdPat)) {
      await ctx.github.repos.createDispatchEvent({
        owner: owner,
        repo: repo,
        event_type: 'try-merge',
        client_payload: {
          pr_num: pr_num
        }
      });
      await ctx.github.issues.createComment({
        body: 'Hello World',
        owner: owner,
        repo: repo,
        issue_number: pr_num
      });
    }
  });
}

export default mergeBot;
