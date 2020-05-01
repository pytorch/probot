// @format
import nock from 'nock';
import {Probot} from 'probot';

export function testProbot(): Probot {
  return new Probot({
    id: 1,
    cert: 'test',
    githubToken: 'test'
  });
}

export function mockConfig(
  fileName: string,
  content: string,
  repoKey: string
): void {
  const configPayload = require('./fixtures/config.json');
  configPayload['content'] = Buffer.from(content).toString('base64');
  configPayload['name'] = fileName;
  configPayload['path'] = `.github/${fileName}`;
  nock('https://api.github.com')
    .get(`/repos/${repoKey}/contents/.github/${fileName}`)
    .reply(200, configPayload);
}

export function mockAccessToken(): void {
  nock('https://api.github.com')
    .post('/app/installations/2/access_tokens')
    .reply(200, {token: 'test'});
}
