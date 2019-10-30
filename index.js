const autoCcBot = require('./auto-cc-bot.js')
const autoLabelBot = require('./auto-label-bot.js')

module.exports = app => {
  autoCcBot(app)
  autoLabelBot(app)
}
