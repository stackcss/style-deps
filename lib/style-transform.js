var pipeline = require('ast-pipeline')
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
      if (Buffer.isBuffer(ast)) throw new Error(
        'Unexpected buffer instance.'
      )

      if (Array.isArray(ast)) {
        throw new Error(
          'Looks as if you\'ve passed an array on from ' +
          'your transform. You should wrap it up in a ' +
          'stylesheet object, e.g. { stylesheet: { rules: [rules] } }'
        )
      }

      if (!ast.stylesheet) {
        throw new Error(
          'CSS AST of "' + filename +
          '" appears to be missing a `stylesheet` property'
        )
      }

      tr(ast.stylesheet, function(err, stylesheet) {
        if (err) return done(err)
        if (stylesheet) ast.stylesheet = stylesheet
        return done(null, ast)
      })
    }
  })

  return pipeline({
    preferAST: true
  }).decode(function(str, done) {
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
