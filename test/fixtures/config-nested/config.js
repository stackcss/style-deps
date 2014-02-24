module.exports = function(config, next) {
  this.configure('sheetify-variables', {
      'first-variable': 'is-replaced-here'
    , 'second-variable': 'also-changed'
  })

  next()
}
