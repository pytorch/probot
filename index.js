const subscriptions = {
  'module: binaries': ['ezyang']
}

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on('issues.labeled', async context => {
    const labels = context.payload['issue']['labels'].map(e => e['name'])
    const cc = new Set()
    labels.forEach(l => {
      if (l in subscriptions) {
        subscriptions[l].forEach(u => cc.add(u))
      }
    })
    if (cc.size) {
      const body = context.payload['issue']['body']
      const reCC = /cc( +@[a-zA-Z0-9-]+)+/
      const oldCCString = body.match(reCC)[0]
      if (oldCCString) {
        console.log(oldCCString)
        let m
        const reUsername = /@([a-zA-Z0-9-]+)/g
        while ((m = reUsername.exec(oldCCString)) !== null) {
          cc.add(m[1])
        }
      }
      console.log(cc)
      let newCCString = 'cc'
      cc.forEach(u => {
        newCCString += ' @' + u
      })
      const newBody = body.replace(reCC, newCCString)
      await context.github.issues.update(context.issue({ body: newBody }))
    }
  })
}
