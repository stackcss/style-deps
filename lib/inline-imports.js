//
// Recursively resolves imports, applies their modifiers
// and inlines them into the parent file.
//
// The end result is one single CSS AST which is
// stringified to produce the final bundle.
//

var flatten = require('flatten')
var map     = require('map-async')
var path    = require('path')

var applyModifiers = require('./apply-modifiers')
var resolveStyle   = require('./resolve-style')
var stripQuotes    = require('./strip-quotes')
var loadFile       = require('./load-file')

module.exports = inlineImports

function inlineImports(filename, opts, rules, done) {
  filename = path.resolve(filename)

  // Applies modifiers *after* parsing but before checking
  // for import statements
  applyModifiers(filename, opts, rules, function(err, rules) {
    if (err) return done(err)

    map(rules, function(rule, i, next) {
      rule.position.source = filename

      if (rule.type === 'import') return handleImport(rule, next)
      if (rule.type === 'rule') return next(null, rule)
      if (!rule.rules) return next(null, rule)

      // Will resolve recursively, i.e. checking nested @media
      // and @document statements etc.
      inlineImports(filename, opts, rule.rules, function(err, updated) {
        if (err) return next(err)
        rule.rules = updated
        next(null, rule)
      })
    }, function(err, rules) {
      if (err) return done(err)

      done(null, flatten(rules))
    })
  })

  function handleImport(rule, next) {
    rule['import'] = stripQuotes(rule['import'])

    resolveStyle(rule['import'], {
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
