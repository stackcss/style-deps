module.exports = function(file, style, next) {
  this.configure('sheetify-variables', {
      'first-variable': 'is-replaced-here'
    , 'second-variable': 'also-changed'
  })
}
