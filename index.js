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
      let body = 'cc'
      cc.forEach(u => {
        body += ' @' + u
      })
      await context.github.issues.createComment(context.issue({ body }))
    }
  })
}
