var variables = require('rework-variables')

module.exports = function(file, style, next) {
  next(null, variables(style.config)(style))
}
