import nock from 'nock';
import {Probot} from 'probot';

import * as utils from './utils';
import * as triggerCircleBot from '../src/trigger-circleci-workflows';

nock.disableNetConnect();

const EXAMPLE_CONFIG = `
labels_to_circle_params:
  ci/binaries:
    parameter: run_binaries_tests
    default_true_on:
      branches:
        - nightly
        - ci-all/.*
      tags:
        - v[0-9]+(\.[0-9]+)*-rc[0-9]+
  ci/bleh:
    parameter: run_bleh_tests
  ci/foo:
    parameter: run_foo_tests
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

  test('test with push (refs/heads/nightly)', async () => {
    const payload = require('./fixtures/push.json');
    payload['ref'] = 'refs/heads/nightly';
    const scope = nock(`${triggerCircleBot.circleAPIUrl}`)
      .post(
        triggerCircleBot.circlePipelineEndpoint(EXAMPLE_REPO_KEY),
        (body: any) => {
          expect(body).toStrictEqual({
            branch: 'nightly',
            parameters: {
              run_binaries_tests: true
            }
          });
          return true;
        }
      )
      .reply(201);

    await probot.receive({name: 'push', payload, id: '2'});

    scope.done();
  });

  test('test with push (refs/heads/ci-all/bleh)', async () => {
    const payload = require('./fixtures/push.json');
    payload['ref'] = 'refs/heads/ci-all/bleh';
    const scope = nock(`${triggerCircleBot.circleAPIUrl}`)
      .post(
        triggerCircleBot.circlePipelineEndpoint(EXAMPLE_REPO_KEY),
        (body: any) => {
          expect(body).toStrictEqual({
            branch: 'ci-all/bleh',
            parameters: {
              run_binaries_tests: true
            }
          });
          return true;
        }
      )
      .reply(201);

    await probot.receive({name: 'push', payload, id: '2'});

    scope.done();
  });

  test('test with push (/refs/tags/v1.5.0-rc1)', async () => {
    const payload = require('./fixtures/push.json');
    payload['ref'] = 'refs/tags/v1.5.0-rc1';
    const scope = nock(`${triggerCircleBot.circleAPIUrl}`)
      .post(
        triggerCircleBot.circlePipelineEndpoint(EXAMPLE_REPO_KEY),
        (body: any) => {
          expect(body).toStrictEqual({
            tag: 'v1.5.0-rc1',
            parameters: {
              run_binaries_tests: true
            }
          });
          return true;
        }
      )
      .reply(201);

    await probot.receive({name: 'push', payload, id: '2'});

    scope.done();
  });
});
