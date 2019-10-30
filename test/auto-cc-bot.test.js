const nock = require('nock')
const myProbotApp = require('../auto-cc-bot.js')
const { Probot } = require('probot')
const { nockTracker } = require('./common.js')

nock.disableNetConnect()

describe('auto-cc-bot', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    const app = probot.load(myProbotApp)
    app.app = () => 'test'
  })

  test('add a cc when issue is labeled', async () => {
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

  test('update an existing cc when issue is labeled', async () => {
    nock('https://api.github.com')
      .post('/app/installations/1492531/access_tokens')
      .reply(200, { token: 'test' })

    nockTracker(`
Some header text

* testlabel @ezyang
`)

    const payload = require('./fixtures/issues.labeled')
    payload['issue']['body'] = 'Arf arf\n\ncc @moo @foo/bar @mar\nxxxx'

    const scope = nock('https://api.github.com')
      .patch('/repos/ezyang/testing-ideal-computing-machine/issues/5', (body) => {
        expect(body).toMatchObject({
          body: 'Arf arf\n\ncc @ezyang @moo @foo/bar @mar\nxxxx'
        })
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issues', payload })

    scope.done()
  })

  test('mkldnn update bug', async () => {
    nock('https://api.github.com')
      .post('/app/installations/1492531/access_tokens')
      .reply(200, { token: 'test' })

    nockTracker(`* module: mkldnn @gujinghui @PenghuiCheng @XiaobingSuper @ezyang`)

    const payload = require('./fixtures/issues.labeled')
    payload['issue']['body'] = `its from master branch, seems related with mklml. any idea?

cc @ezyang`
    payload['issue']['labels'] = [
      { name: 'module: mkldnn' }
    ]

    const scope = nock('https://api.github.com')
      .patch('/repos/ezyang/testing-ideal-computing-machine/issues/5', (body) => {
        expect(body).toMatchObject({
          body: `its from master branch, seems related with mklml. any idea?

cc @gujinghui @PenghuiCheng @XiaobingSuper @ezyang`
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
