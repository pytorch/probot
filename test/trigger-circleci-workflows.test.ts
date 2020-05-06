import nock from 'nock';
import {Probot} from 'probot';

import * as utils from './utils';
import * as triggerCircleBot from '../src/trigger-circleci-workflows';

nock.disableNetConnect();

const EXAMPLE_CONFIG = `
labels_to_circle_params:
  ci/binaries: run_binaries_tests
  ci/bleh: run_bleh_tests
  ci/foo: run_foo_tests
`;

const EXAMPLE_REPO_KEY = 'seemethere/test-repo';

describe('trigger-circleci-workflows', () => {
  let probot: Probot;
  let payload: object;

  beforeEach(() => {
    probot = utils.testProbot();
    probot.load(triggerCircleBot.myBot);
    process.env.CIRCLE_TOKEN = 'dummy_token';
    utils.mockAccessToken();
    utils.mockConfig(
      triggerCircleBot.configName,
      EXAMPLE_CONFIG,
      EXAMPLE_REPO_KEY
    );
    payload = require('./fixtures/pull_request.labeled.json');
    payload['pull_request']['number'] = 1;
  });

  afterEach(() => {
    // Cleanup environment variables after the fact
    delete process.env.CIRCLE_TOKEN;
  });

  test('test with pull_request.labeled (specific labels)', async () => {
    const payload = require('./fixtures/pull_request.labeled.json');
    payload['pull_request']['number'] = 1;
    payload['pull_request']['head']['ref'] = 'test_branch';
    payload['pull_request']['labels'] = [
      {name: 'ci/binaries'},
      {name: 'ci/bleh'}
    ];
    const scope = nock(`${triggerCircleBot.circleAPIUrl}`)
      .post(
        triggerCircleBot.circlePipelineEndpoint(EXAMPLE_REPO_KEY),
        (body: any) => {
          expect(body).toStrictEqual({
            branch: 'test_branch',
            parameters: {
              run_binaries_tests: true,
              run_bleh_tests: true
            }
          });
          return true;
        }
      )
      .reply(201);

    await probot.receive({name: 'pull_request', payload, id: '2'});

    expect(scope.isDone()).toBe(true);
  });

  test('test with pull_request.labeled (ci/all)', async () => {
    const payload = require('./fixtures/pull_request.labeled.json');
    payload['pull_request']['number'] = 1;
    payload['pull_request']['head']['ref'] = 'test_branch';
    payload['pull_request']['labels'] = [{name: 'ci/all'}];
    const scope = nock(`${triggerCircleBot.circleAPIUrl}`)
      .post(
        triggerCircleBot.circlePipelineEndpoint(EXAMPLE_REPO_KEY),
        (body: any) => {
          expect(body).toStrictEqual({
            branch: 'test_branch',
            parameters: {
              run_binaries_tests: true,
              run_bleh_tests: true,
              run_foo_tests: true
            }
          });
          return true;
        }
      )
      .reply(201);

    await probot.receive({name: 'pull_request', payload, id: '2'});

    scope.done();
  });
});
