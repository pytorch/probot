import {parseSubscriptions} from './subscriptions';
import {CachedIssueTracker} from './utils';
import * as probot from 'probot';

function myBot(app: probot.Application): void {
  const tracker = new CachedIssueTracker(
    app,
    'tracking_issue',
    parseSubscriptions
  );

  async function loadSubscriptions(context: probot.Context): Promise<object> {
    return tracker.loadIssue(context);
  }

  async function runBotForLabels(
    context: probot.Context,
    payloadType: string
  ): Promise<void> {
    const subscriptions = await loadSubscriptions(context);
    context.log('payload_type=', payloadType);
    const labels = context.payload[payloadType]['labels'].map(e => e['name']);
    context.log({labels});
    const cc = new Set();
    // eslint-disable-next-line github/array-foreach
    labels.forEach(l => {
      if (l in subscriptions) {
        // eslint-disable-next-line github/array-foreach
        subscriptions[l].forEach(u => cc.add(u));
      }
    });
    context.log({cc: Array.from(cc)}, 'from subscriptions');
    if (cc.size) {
      const body = context.payload[payloadType]['body'];
      const reCC = /cc( +@[a-zA-Z0-9-/]+)+/;
      const oldCCMatch = body.match(reCC);
      const prevCC = new Set();
      if (oldCCMatch) {
        const oldCCString = oldCCMatch[0];
        context.log({oldCCString}, 'previous cc string');
        let m;
        const reUsername = /@([a-zA-Z0-9-/]+)/g;
        while ((m = reUsername.exec(oldCCString)) !== null) {
          prevCC.add(m[1]);
          cc.add(m[1]);
        }
        context.log({prevCC: Array.from(prevCC)}, 'pre-existing ccs');
      }
      // Invariant: prevCC is a subset of cc
      if (prevCC.size !== cc.size) {
        let newCCString = 'cc';
        // eslint-disable-next-line github/array-foreach
        cc.forEach(u => {
          newCCString += ` @${u}`;
        });
        const newBody = oldCCMatch
          ? body.replace(reCC, newCCString)
          : `${body}\n\n${newCCString}`;
        context.log({newBody});
        if (payloadType === 'issue') {
          await context.github.issues.update(context.issue({body: newBody}));
        } else if (payloadType === 'pull_request') {
          await context.github.pulls.update(context.issue({body: newBody}));
        }
      } else {
        context.log('no action: no change from existing cc list on issue');
      }
    } else {
      context.log('no action: cc list from subscription is empty');
    }
  }

  app.on('issues.labeled', async context => {
    await runBotForLabels(context, 'issue');
  });
  app.on('pull_request.labeled', async context => {
    await runBotForLabels(context, 'pull_request');
  });
}

export default myBot;
