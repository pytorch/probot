const autoCcBot = require('./auto-cc-bot.js')

module.exports = app => {
  autoCcBot(app)
}
