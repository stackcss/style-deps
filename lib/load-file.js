//
// Loads a CSS file from the file system.
//
// Also applies transforms for the file before
// it's parsed, (theoretically) allowing you
// to use custom CSS preprocessors such as
// SASS or Stylus or whatever else you can think
// of.
//

var fs             = require('graceful-fs')
var css            = require('css')
var bl             = require('bl')

module.exports = loadFile

function loadFile(name, opts, done) {
  var transforms = opts.transforms || []
  var output = bl(parseCSSBuffer)
  var input = typeof name === 'string'
    ? fs.createReadStream(name)
    : name

  input.pipe(output)

  function parseCSSBuffer(err, src) {
    if (err) return done(err)

    src = src.toString()

    var ast = css.parse(src, {
        position: true
      , filename: name
    })

    done(null, ast)
  }
}
