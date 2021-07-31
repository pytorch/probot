import nock from 'nock';
import * as probot from 'probot';
import * as utils from './utils';
import {CIFlowBot} from '../src/ciflow-bot';
import runCIFlowBot from '../src/ciflow-bot';

nock.disableNetConnect();

describe('CIFlowBot Unit Tests', () => {
  let ciflow;
  const pr_number = 5
  const owner = 'ezyang';
  const repo = 'testing-ideal-computing-machine';

  beforeEach(() => {
    const p = utils.testProbot();
    const app = p.load(runCIFlowBot);
    ciflow = new CIFlowBot(app);
  })


  test('parseContext for pull_request.opened', () => {
    const event = require('./fixtures/pull_request.opened.json');
    event.payload.pull_request.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;

    const ctx = new probot.Context(event, null, null);
    ciflow.parseContext(ctx)
    expect(ciflow.valid()).toBe(true);
  })

  test('parseContext for pull_request.reopened', () => {
    const event = require('./fixtures/pull_request.reopened.json');
    event.payload.pull_request.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;

    const ctx = new probot.Context(event, null, null);
    ciflow.parseContext(ctx)
    expect(ciflow.valid()).toBe(true);
  })

  test('parseContext for issue_comment.created with comment author as the pr author', () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.body = `@${ciflow.bot_app_name} ciflow rerun`;
    event.payload.comment.user.login = event.payload.issue.user.login;

    const ctx = new probot.Context(event, null, null);
    ciflow.parseContext(ctx)
    expect(ciflow.valid()).toBe(true);
  })

  test('parseContext for issue_comment.created with invalid comment', () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.body = `invalid comment body`;

    const ctx = new probot.Context(event, null, null);
    ciflow.parseContext(ctx)
    expect(ciflow.valid()).toBe(false);
  })

  test('parseContext for issue_comment.created with unknown comment author', () => {
    const event = require('./fixtures/issue_comment.json');
    event.payload.issue.number = pr_number;
    event.payload.repository.owner.login = owner;
    event.payload.repository.name = repo;
    event.payload.comment.body = `@${ciflow.bot_app_name} ciflow rerun`;
    event.payload.comment.user.login = 'non-exist-user'

    const ctx = new probot.Context(event, null, null);
    ciflow.parseContext(ctx)
    expect(ciflow.valid()).toBe(false);
  })
})

describe('CIFlowBot Integration Tests', () => {
  let p: probot.Probot;
  let app;
  const pr_number = 5
  const owner = 'ezyang';
  const repo = 'testing-ideal-computing-machine';

  beforeEach(() => {
    p = utils.testProbot();
    app = p.load(runCIFlowBot);
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, {token: 'test'});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('add_default_labels strategy happy path', async () => {
    const ciflow = new CIFlowBot(app);
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
        expect(body).toMatchObject({assignees: [ciflow.bot_assignee]});
        return true;
      })
      .reply(200)
      .delete(`/repos/${owner}/${repo}/issues/${pr_number}/assignees`, body => {
        expect(body).toMatchObject({assignees: [ciflow.bot_assignee]});
        return true;
      })
      .reply(200);

    await p.receive(event);
    if (!scope.isDone()) {
      console.error('pending mocks: %j', scope.pendingMocks());
    }
    scope.done();
  });

  test('add_default_labels strategy not rolled out', async () => {
    const ciflow = new CIFlowBot(app);
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
});
