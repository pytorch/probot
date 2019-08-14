const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')

nock.disableNetConnect()

describe('My Probot app', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    // Load our app into probot
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = () => 'test'
  })

  test('creates a comment when an issue is labeled', async () => {
    nock('https://api.github.com')
      .post('/app/installations/1492531/access_tokens')
      .reply(200, { token: 'test' })

    const scope = nock('https://api.github.com')
      .post('/repos/ezyang/testing-ideal-computing-machine/issues/5/comments', (body) => {
        expect(body).toMatchObject({
          body: 'cc @ezyang'
        })
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'issues', payload: require('./fixtures/issues.labeled') })

    scope.done()
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock
