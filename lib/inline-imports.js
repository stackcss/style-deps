//
// Recursively resolves imports, applies their modifiers
// and inlines them into the parent file.
//
// The end result is one single CSS AST which is
// stringified to produce the final bundle.
//

var resolve = require('style-resolve')
var map     = require('map-async')
var from    = require('new-from')
var flatten = require('flatten')
var path    = require('path')

var styleTransform = require('./style-transform')
var usedTransforms = require('./used-transforms')
var loadPackage    = require('./load-package')
var stripQuotes    = require('./strip-quotes')
var loadFile       = require('./load-file')

module.exports = inlineImports

function inlineImports(filename, opts, ast, done) {
  var output = opts.output

  filename = path.resolve(filename)
  output.emit('file', filename)

  loadPackage(filename, opts, function(err, pkg, pkgPath) {
    if (err) return done(err)

    var pkgDir = path.dirname(pkgPath)
    var transforms = usedTransforms(pkgPath
      , 'transforms'
      , pkg
      , opts
      , opts.transforms
    )

    // Applies transforms *after* parsing but *before* checking
    // for import statements
    transform(ast, transforms, function(err, rules) {
      if (err) return done(err)

      map(rules, function(rule, i, next) {
        rule.position.source = filename

        if (rule.type === 'import') return handleImport(rule, next)
        if (rule.type === 'rule') return next(null, rule)
        if (!rule.rules) return next(null, rule)

        // Will resolve recursively, i.e. checking nested @media
        // and @document statements etc.
        inlineImports(filename, opts, {
            stylesheet: { rules: rule.rules }
          , type: 'stylesheet'
        }, function(err, updated) {
          if (err) return next(err)
          rule.rules = updated || rule.rules
          next(null, rule)
        })
      }, function(err, rules) {
        if (err) return done(err)

        done(null, flatten(rules))
      })
    })
  })

  function transform(ast, transforms, done) {
    if (!transforms.length) {
      return done(null, ast.stylesheet.rules)
    }

    var transform = styleTransform(
        filename
      , transforms
    )

    from([ast], {
      objectMode: true
    }).pipe(transform)
      .once('error', done)
      .once('data', function(ast) {
        return done(null, ast.stylesheet.rules)
      })
  }

  function handleImport(rule, next) {
    rule['import'] = stripQuotes(rule['import'])

    resolve(rule['import'], {
      basedir: path.dirname(filename)
    }, function(err, resolved) {
      if (err) return next(err)
      if (opts.loaded[resolved]) return next(null, [])

      opts.loaded[resolved] = true

      loadFile(resolved, opts, function(err, nodes) {
        if (err) return next(err)

        inlineImports(resolved
          , opts
          , nodes
          , next
        )
      })
    })
  }
}
