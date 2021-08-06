import nock from 'nock';
import * as probot from 'probot';
import * as utils from './utils';
import {CIFlowBot} from '../src/ciflow-bot';

nock.disableNetConnect();
jest.setTimeout(30000); // 30 seconds

describe('CIFlowBot Unit Tests', () => {
  const pr_number = 5;
  const owner = 'ezyang';
  const repo = 'testing-ideal-computing-machine';

  beforeEach(() => {
    jest
      .spyOn(CIFlowBot.prototype, 'getUserPermission')
      .mockResolvedValue('write');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('parseContext for pull_request.opened', async () => {
    const event = require('./fixtures/pull_request.opened.json');
    event.payload.pull_request.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;

    const ciflow = new CIFlowBot(new probot.Context(event, null, null));
    await ciflow.setContext();
    expect(ciflow.valid()).toBe(true);
  });

  test('parseContext for pull_request.reopened', async () => {
    const event = require('./fixtures/pull_request.reopened.json');
    event.payload.pull_request.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;

    const ciflow = new CIFlowBot(new probot.Context(event, null, null));
    await ciflow.setContext();
    expect(ciflow.valid()).toBe(true);
  });

  describe('parseContext for issue_comment.created with valid or invalid comments', () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.user.login = event.payload.issue.user.login;

    const validComments = [
      `@${CIFlowBot.bot_assignee} ciflow`,
      `@${CIFlowBot.bot_assignee} ciflow rerun`,
      `Some other comments, \n@${CIFlowBot.bot_assignee} ciflow rerun\nNew comments\n`
    ];
    test.each(validComments)(
      `valid comment: %s`,
      async (validComment: string) => {
        event.payload.comment.body = validComment;
        const ciflow = new CIFlowBot(new probot.Context(event, null, null));
        await ciflow.setContext();
        expect(ciflow.valid()).toBe(true);
      }
    );

    const invalidComments = [
      `invalid`,
      `@${CIFlowBot.bot_assignee}` // without commands appended after the @assignee
    ];
    test.each(invalidComments)(
      'invalid comment: %s',
      async (invalidComment: string) => {
        event.payload.comment.body = invalidComment;
        const ciflow = new CIFlowBot(new probot.Context(event, null, null));
        await ciflow.setContext();
        expect(ciflow.valid()).toBe(false);
      }
    );
  });

  test('parseContext for issue_comment.created with comment author that has write permission', async () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.body = `@${CIFlowBot.bot_assignee} ciflow rerun`;
    event.payload.comment.user.login = 'non-exist-user';

    const ciflow = new CIFlowBot(new probot.Context(event, null, null));
    jest.spyOn(ciflow, 'getUserPermission').mockResolvedValue('write');
    await ciflow.setContext();
    expect(ciflow.valid()).toBe(true);
  });

  test('parseContext for issue_comment.created with comment author that has read permission', async () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.body = `@${CIFlowBot.bot_assignee} ciflow rerun`;
    event.payload.comment.user.login = 'non-exist-user';

    const ciflow = new CIFlowBot(new probot.Context(event, null, null));
    jest.spyOn(ciflow, 'getUserPermission').mockResolvedValue('read');
    await ciflow.setContext();
    expect(ciflow.valid()).toBe(false);
  });
});

describe('CIFlowBot Integration Tests', () => {
  let p: probot.Probot;
  const pr_number = 5;
  const owner = 'ezyang';
  const repo = 'testing-ideal-computing-machine';

  beforeEach(() => {
    p = utils.testProbot();
    p.load(CIFlowBot.main);

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, {token: 'test'});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('pull_request.opened event: add_default_labels strategy happy path', async () => {
    jest.spyOn(CIFlowBot.prototype, 'rollout').mockReturnValue(true);

    const event = require('./fixtures/pull_request.opened.json');
    event.payload.pull_request.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;

    const scope = nock('https://api.github.com')
      .post(`/repos/${owner}/${repo}/issues/${pr_number}/labels`, body => {
        expect(body).toMatchObject(['ciflow/default']);
        return true;
      })
      .reply(200)
      .post(`/repos/${owner}/${repo}/issues/${pr_number}/assignees`, body => {
        expect(body).toMatchObject({assignees: [CIFlowBot.bot_assignee]});
        return true;
      })
      .reply(200)
      .delete(`/repos/${owner}/${repo}/issues/${pr_number}/assignees`, body => {
        expect(body).toMatchObject({assignees: [CIFlowBot.bot_assignee]});
        return true;
      })
      .reply(200);

    await p.receive(event);

    if (!scope.isDone()) {
      console.error('pending mocks: %j', scope.pendingMocks());
    }
    scope.done();
  });

  test('pull_request.opened event: add_default_labels strategy not rolled out', async () => {
    const event = require('./fixtures/pull_request.opened.json');
    event.payload.pull_request.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;

    const scope = nock('https://api.github.com');
    await p.receive(event);

    if (!scope.isDone()) {
      console.error('pending mocks: %j', scope.pendingMocks());
    }
    scope.done();
  });

  test('issue_comment.created event: add_default_labels strategy happy path', async () => {
    jest.spyOn(CIFlowBot.prototype, 'rollout').mockReturnValue(true);

    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.body = `@${CIFlowBot.bot_assignee} ciflow rerun`;
    event.payload.comment.user.login = 'non-exist-user';

    for (const permission of ['write', 'admin']) {
      const scope = nock('https://api.github.com')
        .get(
          `/repos/${owner}/${repo}/collaborators/${event.payload.comment.user.login}/permission`
        )
        .reply(200, {permission: `${permission}`})
        .post(`/repos/${owner}/${repo}/issues/${pr_number}/labels`, body => {
          expect(body).toMatchObject(['ciflow/default']);
          return true;
        })
        .reply(200)
        .post(`/repos/${owner}/${repo}/issues/${pr_number}/assignees`, body => {
          expect(body).toMatchObject({assignees: [CIFlowBot.bot_assignee]});
          return true;
        })
        .reply(200)
        .delete(
          `/repos/${owner}/${repo}/issues/${pr_number}/assignees`,
          body => {
            expect(body).toMatchObject({assignees: [CIFlowBot.bot_assignee]});
            return true;
          }
        )
        .reply(200);

      await p.receive(event);

      if (!scope.isDone()) {
        console.error('pending mocks: %j', scope.pendingMocks());
      }
      scope.done();
    }
  });

  test('issue_comment.created event: add_default_labels strategy not not enough permission', async () => {
    jest.spyOn(CIFlowBot.prototype, 'rollout').mockReturnValue(true);

    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.body = `@${CIFlowBot.bot_assignee} ciflow rerun`;
    event.payload.comment.user.login = 'non-exist-user';

    for (const permission of ['read', 'none']) {
      const scope = nock('https://api.github.com')
        .get(
          `/repos/${owner}/${repo}/collaborators/${event.payload.comment.user.login}/permission`
        )
        .reply(200, {permission: `${permission}`});
      await p.receive(event);

      if (!scope.isDone()) {
        console.error('pending mocks: %j', scope.pendingMocks());
      }
      scope.done();
    }
  });
});
