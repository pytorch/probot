const nock = require('nock')

module.exports = {

  // Setup mock for the "tracking issue" which specifies where
  // CC bot can get labels
  nockTracker: (contents) => {
    const configPayload = require('./fixtures/config.json')
    configPayload['content'] = Buffer.from(`
tracking_issue: 6
`).toString('base64')
    nock('https://api.github.com')
      .get('/repos/ezyang/testing-ideal-computing-machine/contents/.github/pytorch-probot.yml')
      .reply(200, configPayload)

    const payload = require('./fixtures/issue.json')
    payload['body'] = contents
    nock('https://api.github.com')
      .get('/repos/ezyang/testing-ideal-computing-machine/issues/6')
      .reply(200, payload)
  }
}
