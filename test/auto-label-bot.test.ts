import nock from 'nock';
import {Probot} from 'probot';
import * as utils from './utils';
import myProbotApp from '../src/auto-label-bot';

nock.disableNetConnect();

describe('auto-label-bot', () => {
  let probot: Probot;

  beforeEach(() => {
    probot = utils.testProbot();
    probot.load(myProbotApp);
  });

  test('add triage review when issue is labeled high priority', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, {token: 'test'});

    const payload = require('./fixtures/issues.labeled');
    payload['label'] = {name: 'high priority'};
    payload['issue']['labels'] = [{name: 'high priority'}];

    const scope = nock('https://api.github.com')
      .post(
        '/repos/ezyang/testing-ideal-computing-machine/issues/5/labels',
        body => {
          expect(body).toMatchObject(['triage review']);
          return true;
        }
      )
      .reply(200);

    await probot.receive({name: 'issues', payload, id: '2'});

    scope.done();
  });

  test('add rocm label when issue title contains ROCm', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, {token: 'test'});

    const payload = require('./fixtures/issues.opened');
    payload['title'] = 'Issue regarding ROCm';
    payload['issue']['labels'] = [];

    const scope = nock('https://api.github.com')
      .post(
        '/repos/ezyang/testing-ideal-computing-machine/issues/5/labels',
        body => {
          expect(body).toMatchObject(['module: rocm']);
          return true;
        }
      )
      .reply(200);

    await probot.receive({name: 'issues', payload: payload, id: '2'});

    scope.done();
  });
});
