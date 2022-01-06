import nock from 'nock';
import {nockTracker} from './common';
import myProbotApp from '../src/';
import {Probot} from 'probot';
import * as utils from './utils';

nock.disableNetConnect();

describe('index (integration test for all actions)', () => {
  let probot: Probot;

  beforeEach(() => {
    probot = utils.testProbot();
    probot.load(myProbotApp);
  });

  test('when issue is labeled', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, {token: 'test'});

    nockTracker(`
Some header text

* high priority @ezyang
`);

    const payload = require('./fixtures/issues.labeled');
    payload['label'] = {name: 'high priority'};
    payload['issue']['labels'] = [{name: 'high priority'}];
    payload['issue']['body'] = 'Arf arf';

    const scope = nock('https://api.github.com')
      .patch('/repos/ezyang/testing-ideal-computing-machine/issues/5', body => {
        expect(body).toMatchObject({
          body: 'Arf arf\n\ncc @ezyang'
        });
        return true;
      })
      .reply(200)
      .post(
        '/repos/ezyang/testing-ideal-computing-machine/issues/5/labels',
        body => {
          expect(body).toMatchObject({labels: ['triage review']});
          return true;
        }
      )
      .reply(200);

    await probot.receive({name: 'issues', payload, id: '2'});

    scope.done();
  });
});
