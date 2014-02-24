module.exports = function(config, next) {
  this.configure('./modifier.js', {
      first: 'a'
    , second: 'b'
  })

  next()
}
