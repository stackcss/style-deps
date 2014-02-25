var astPipeline = require('ast-pipeline')
var once = require('once')
var css = require('css')

module.exports = styleTransform

function styleTransform(filename, transforms, opts) {
  opts = opts || {}

  transforms = transforms.map(function(tr) {
    return tr(filename)
  }).map(function(tr) {
    if (typeof tr !== 'function') return tr

    // wrap AST transforms up to operate on
    // the stylesheet property, like rework
    // does itself.
    return function(ast, done) {
      tr(ast.stylesheet, function(err, stylesheet) {
        if (err) return done(err)
        if (stylesheet) ast.stylesheet = stylesheet
        return done(null, ast)
      })
    }
  })

  return astPipeline().decode(function(str, done) {
    var parsed = css.parse(str, {
        position: true
      , filename: filename
    })

    done(null, parsed)
  }).encode(function(ast, done) {
    var deparsed = css.stringify(ast, {
        sourcemap: opts.debug
      , compress: opts.compress
    })

    done(null, opts.debug
      ? deparsed.code
      : deparsed
    )
  })(transforms)
}
