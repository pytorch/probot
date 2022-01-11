import * as probot from 'probot';

function mergeBot(app: probot.Application): void {
  const cmdPat = new RegExp('@pytorchbot\\s+merge\\s+this');
  app.on('issue_comment.created', async ctx => {
    const commentBody = ctx.payload?.comment?.body;
    const owner = ctx.payload?.repository?.owner?.login;
    const repo = ctx.payload?.repository?.name;
    const prNum = ctx.payload?.issue?.number;
    if (commentBody?.match(cmdPat)) {
      await ctx.github.repos.createDispatchEvent({
        owner,
        repo,
        event_type: 'try-merge',
        client_payload: {
          pr_num: prNum
        }
      });
      await ctx.github.issues.createComment({
        body: 'Hello World',
        owner,
        repo,
        issue_number: prNum
      });
    }
  });
}

export default mergeBot;
