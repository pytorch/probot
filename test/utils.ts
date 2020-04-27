// @format
import {Probot} from 'probot';

export function testProbot(): Probot {
  return new Probot({
    id: 1,
    cert: 'test',
    githubToken: 'test'
  });
}
