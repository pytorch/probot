import {promises as fs} from 'fs';
import nock from 'nock';
import * as utils from './utils';
import {futureLabel, myBot as myProbotApp} from '../src/custom-ci-info-bot';

nock.disableNetConnect();

async function fixture(): Promise<any> {
  const payload = JSON.parse(
    await fs.readFile('test/fixtures/pull_request.labeled.json', 'utf8')
  );
  payload.action = 'edited';
  const label = payload.pull_request.labels[2];
  label.name = futureLabel;
  label.url = label.url.replace(/ci\/bleh/g, futureLabel);
  return payload;
}

describe('custom-ci-info-bot', () => {
  let probot;

  beforeEach(() => {
    probot = utils.testProbot();
    probot.load(myProbotApp);
    utils.mockAccessToken();
  });

  test('replace body when pull request is edited', async () => {
    const payload = await fixture();
    const scope = nock('https://api.github.com')
      .patch('/repos/seemethere/test-repo/pulls/20', (body: any) => {
        expect(body).toMatchObject({
          body: expect.stringContaining('<details>')
        });
        return true;
      })
      .reply(200);
    await probot.receive({name: 'pull_request', payload, id: '2'});
    scope.done();
  });
});
