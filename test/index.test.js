const nock = require('nock')
const myProbotApp = require('..')
const { Probot } = require('probot')

nock.disableNetConnect()

describe('My Probot app', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    const app = probot.load(myProbotApp)
    app.app = () => 'test'
  })

  function nockTracker (contents) {
    const config_payload = require('./fixtures/config.json')
    config_payload['content'] = new Buffer(`
tracker:
  owner: ezyang
  repo: testing-ideal-computing-machine
  number: 6
`).toString('base64')
    nock('https://api.github.com')
      .get('/repos/ezyang/testing-ideal-computing-machine/contents/.github/pytorch-probot.yml')
      .reply(200, config_payload)

    const payload = require('./fixtures/issue.json')
    payload['body'] = contents
    nock('https://api.github.com')
      .get('/repos/ezyang/testing-ideal-computing-machine/issues/6')
      .reply(200, payload)
  }

  test('add a cc when issue is labeled', async () => {
    nock('https://api.github.com')
      .post('/app/installations/1492531/access_tokens')
      .reply(200, { token: 'test' })

    nockTracker(`
Some header text

* testlabel - @ezyang
`)

    const payload = require('./fixtures/issues.labeled') // testlabel
    payload['issue']['body'] = 'Arf arf'

    const scope = nock('https://api.github.com')
      .patch('/repos/ezyang/testing-ideal-computing-machine/issues/5', (body) => {
        expect(body).toMatchObject({
          body: 'Arf arf\n\ncc @ezyang'
        })
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issues', payload })

    scope.done()
  })

  test('update an existing cc when issue is labeled', async () => {
    nock('https://api.github.com')
      .post('/app/installations/1492531/access_tokens')
      .reply(200, { token: 'test' })

    nockTracker(`
Some header text

* testlabel - @ezyang
`)

    const payload = require('./fixtures/issues.labeled')
    payload['issue']['body'] = 'Arf arf\n\ncc @moo @mar\nxxxx'

    const scope = nock('https://api.github.com')
      .patch('/repos/ezyang/testing-ideal-computing-machine/issues/5', (body) => {
        expect(body).toMatchObject({
          body: 'Arf arf\n\ncc @ezyang @moo @mar\nxxxx'
        })
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issues', payload })

    scope.done()
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock
