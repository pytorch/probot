const nock = require('nock')
const myProbotApp = require('../auto-label-bot.js')
const { Probot } = require('probot')

nock.disableNetConnect()

describe('auto-label-bot', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    const app = probot.load(myProbotApp)
    app.app = () => 'test'
  })

  test('add triage review when issue is labeled high priority', async () => {
    nock('https://api.github.com')
      .post('/app/installations/1492531/access_tokens')
      .reply(200, { token: 'test' })

    const payload = require('./fixtures/issues.labeled')
    payload['label'] = { name: 'high priority' }
    payload['issue']['labels'] = [ { name: 'high priority' } ]

    const scope = nock('https://api.github.com')
      .post('/repos/ezyang/testing-ideal-computing-machine/issues/5/labels', (body) => {
        expect(body).toMatchObject(['triage review'])
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issues', payload })

    scope.done()
  })

})
