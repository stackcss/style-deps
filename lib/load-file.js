//
// Loads a CSS file from the file system.
//
// Also applies transforms for the file before
// it's parsed, (theoretically) allowing you
// to use custom CSS preprocessors such as
// SASS or Stylus or whatever else you can think
// of.
//

var usedTransforms = require('./used-transforms')
var loadPackage    = require('./load-package')
var fs             = require('graceful-fs')
var multipipe      = require('multipipe')
var css            = require('css')
var bl             = require('bl')

module.exports = loadFile

function loadFile(name, opts, done) {
  var transforms = opts.transforms || []
  var input = fs.createReadStream(name)
  var output = bl(parseCSSBuffer)

  loadPackage(name, opts, function(err, pkg, pathname) {
    if (err) return done(err)

    var transforms = usedTransforms(pathname
      , 'transforms'
      , pkg
      , opts
      , transforms
    ) || []

    transforms = transforms.map(function(tr) {
      return tr.make
    })

    if (transforms.length) return input
      .pipe(transforms.length > 1
        ? multipipe.apply(null, transforms)
        : transforms[0])
      .pipe(output)

    input.pipe(output)
  })

  function parseCSSBuffer(err, src) {
    if (err) return done(err)

    src = src.toString()

    var ast = css.parse(src, {
        position: true
      , filename: name
    })

    done(null, ast.stylesheet.rules)
  }
}
