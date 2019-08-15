module.exports = {
  parseSubscriptions: (rawSubsText, logger = null) => {
    const subsText = rawSubsText.replace('\r', '')
    const subsRows = subsText.match(/^\*.+/gm)
    const subscriptions = {}
    subsRows.forEach(row => {
      const labelMatch = row.match(/^\* +([^@]+)/)
      if (labelMatch) {
        const label = labelMatch[1].trim()
        const users = row.match(/@[a-zA-Z0-9-]+/g)
        subscriptions[label] = users.map((u) => u.substring(1))
      } else {
        if (logger) {
          logger.info({ row }, 'failed to parse subscription')
        }
      }
    })
    return subscriptions
  }
}
