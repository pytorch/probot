/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  let subscriptions

  app.on('issues.labeled', async context => {
    if (!subscriptions) {
      const subsPayload = await context.github.issues.get({
        owner: 'ezyang',
        repo: 'testing-ideal-computing-machine',
        number: 6
      })
      const subsText = subsPayload.data['body'].replace('\r', '')
      context.log({ subsText })
      const subsRows = subsText.match(/^\*.+/gm)
      context.log.debug({ subsRows })
      subscriptions = {}
      subsRows.forEach(row => {
        const label = row.match(/^\* +([^-]+)-/)[1].trim()
        const users = row.match(/@[a-zA-Z0-9-]+/g)
        subscriptions[label] = users.map((u) => u.substring(1))
      })
      context.log({ subscriptions })
    }

    const labels = context.payload['issue']['labels'].map(e => e['name'])
    context.log({ labels })
    const cc = new Set()
    labels.forEach(l => {
      if (l in subscriptions) {
        subscriptions[l].forEach(u => cc.add(u))
      }
    })
    if (cc.size) {
      const body = context.payload['issue']['body']
      const reCC = /cc( +@[a-zA-Z0-9-]+)+/
      const oldCCMatch = body.match(reCC)
      if (oldCCMatch) {
        const oldCCString = oldCCMatch[0]
        let m
        const reUsername = /@([a-zA-Z0-9-]+)/g
        while ((m = reUsername.exec(oldCCString)) !== null) {
          cc.add(m[1])
        }
      }
      context.log({ cc })
      let newCCString = 'cc'
      cc.forEach(u => {
        newCCString += ' @' + u
      })
      const newBody = oldCCMatch ? body.replace(reCC, newCCString) : body + '\n\n' + newCCString
      context.log({ newBody })
      await context.github.issues.update(context.issue({ body: newBody }))
    }
  })
}
