import nock from 'nock';
import * as probot from 'probot';
import * as utils from './utils';
import {CIFlowBot} from '../src/ciflow-bot';

nock.disableNetConnect();
jest.setTimeout(60000); // 60 seconds

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
    const isValid = await ciflow.setContext();
    expect(isValid).toBe(true);
  });

  test('parseContext for pull_request.reopened', async () => {
    const event = require('./fixtures/pull_request.reopened.json');
    event.payload.pull_request.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;

    const ciflow = new CIFlowBot(new probot.Context(event, null, null));
    const isValid = await ciflow.setContext();
    expect(isValid).toBe(true);
  });

  describe('parseContext for issue_comment.created with valid or invalid comments', () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.user.login = event.payload.issue.user.login;

    const validComments = [
      `@${CIFlowBot.bot_assignee} ciflow rerun`,
      `Some other comments, \n@${CIFlowBot.bot_assignee} ciflow rerun\nNew comments\n`
    ];
    test.each(validComments)(
      `valid comment: %s`,
      async (validComment: string) => {
        event.payload.comment.body = validComment;
        const ciflow = new CIFlowBot(new probot.Context(event, null, null));
        const isValid = await ciflow.setContext();
        expect(isValid).toBe(true);
      }
    );

    const invalidComments = [
      `invalid`,
      `@${CIFlowBot.bot_assignee}`,          // without commands appended after the @assignee
      `@${CIFlowBot.bot_assignee} ciflow`,   // without subcommand rerun
    ];
    test.each(invalidComments)(
      'invalid comment: %s',
      async (invalidComment: string) => {
        event.payload.comment.body = invalidComment;
        const ciflow = new CIFlowBot(new probot.Context(event, null, null));
        const isValid = await ciflow.setContext();
        expect(isValid).toBe(false);
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
    const isValid = await ciflow.setContext();
    expect(isValid).toBe(true);
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
    const isValid = await ciflow.setContext();
    expect(isValid).toBe(false);
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

    jest.spyOn(CIFlowBot.prototype, 'rollout').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('pull_request.opened event: add_default_labels strategy happy path', async () => {
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
    jest.spyOn(CIFlowBot.prototype, 'rollout').mockReturnValue(false);

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

  describe('issue_comment.created event: add_default_labels strategy happy path', () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.user.login = 'non-exist-user';

    test.each([
      [
        `@${CIFlowBot.bot_assignee} ciflow rerun`,
        ['ciflow/default']
      ],
      [
        `@${CIFlowBot.bot_assignee} ciflow rerun -l`,
        ['ciflow/default']
      ],
      [
        `@${CIFlowBot.bot_assignee} ciflow rerun -l ciflow/scheduled`,
        ['ciflow/default', 'ciflow/scheduled']
      ],
      [
        `@${CIFlowBot.bot_assignee} ciflow rerun -l ciflow/scheduled -l ciflow/slow`,
        ['ciflow/default', 'ciflow/scheduled', 'ciflow/slow']
      ]
    ])(
      `valid comment: %s, expected labels: %j`,
      async (validComment: string, expectedLabels: string[]) => {
        event.payload.comment.body = validComment
        for (const permission of ['write', 'admin']) {
          const scope = nock('https://api.github.com')
            .get(
              `/repos/${owner}/${repo}/collaborators/${event.payload.comment.user.login}/permission`
            )
            .reply(200, {permission: `${permission}`})
            .post(`/repos/${owner}/${repo}/issues/${pr_number}/labels`, body => {
              expect(body).toMatchObject(expectedLabels);
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
  });

  describe('issue_comment.created event: add_default_labels strategy with invalid parseComments', () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.user.login = 'non-exist-user';

    test.each([
      `invalid`,
      `@${CIFlowBot.bot_assignee} invalid`,
      `@${CIFlowBot.bot_assignee} ciflow invalid`
    ])(
      `invalid comment: %s`,
      async (invalidComment: string) => {
        event.payload.comment.body = invalidComment

        // we shouldn't hit the github API, thus a catch-all scope and asserting no api calls
        const scope = nock('https://api.github.com')

        await p.receive(event);
        if (!scope.isDone()) {
          console.error('pending mocks: %j', scope.pendingMocks());
        }
        scope.done();
      });
  });

  test('issue_comment.created event: add_default_labels strategy not not enough permission', async () => {
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
