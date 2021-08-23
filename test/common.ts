import nock from 'nock';

export function nockTracker(contents: string, gha_path: string = "ezyang/testing-ideal-computing-machine"): void {
  // Setup mock for the "tracking issue" which specifies where
  // CC bot can get labels
  const configPayload = require('./fixtures/config.json');
  configPayload['content'] = Buffer.from(
    `
tracking_issue: 6
`
  ).toString('base64');
  nock('https://api.github.com')
    .get(
      '/repos/' + gha_path + '/contents/.github/pytorch-probot.yml'
    )
    .reply(200, configPayload);

  const payload = require('./fixtures/issue.json');
  payload['body'] = contents;
  nock('https://api.github.com')
    .get('/repos/' + gha_path + '/issues/6')
    .reply(200, payload);
}
