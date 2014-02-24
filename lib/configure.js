module.exports = Configure

function Configure(config) {
  if (!(this instanceof Configure)) return new Configure(config)

  this.config = config || {}
}

Configure.prototype.configure = function(name, update) {
  var config = this.config[name] = this.config[name] || {}

  Object.keys(update).forEach(function(key) {
    config[key] = update[key]
  })

  return this
}
