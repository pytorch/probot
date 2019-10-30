const nock = require('nock')
const myProbotApp = require('..')
const { Probot } = require('probot')
const { nockTracker } = require('./common.js')

nock.disableNetConnect()

describe('index (integration test for all actions)', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    const app = probot.load(myProbotApp)
    app.app = () => 'test'
  })

  test('when issue is labeled', async () => {
    nock('https://api.github.com')
      .post('/app/installations/1492531/access_tokens')
      .reply(200, { token: 'test' })

    nockTracker(`
Some header text

* testlabel @ezyang
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
})
