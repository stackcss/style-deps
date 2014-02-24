//
// Applies the appropriate modifiers to an array
// of CSS rules.
//
// Modifiers are sourced from the file's closest
// package.json file, exactly as CSS transforms are
// resolved.
//
// Configuration is also sourced from the nearest
// package.json and passed on to the modifiers when
// they're being applied too – because configuration
// is always determined locally, it's straightforward
// to define custom behavior (e.g. variable fonts in
// a module) without interfering with content higher
// or lower in the dependency tree.
//

var usedTransforms = require('./used-transforms')
var loadPackage    = require('./load-package')
var series         = require('async-series')
var path           = require('path')

module.exports = applyModifiers

function applyModifiers(filename, opts, rules, done) {
  var modifiers  = opts.modifiers
  var stylesheet = {
      type: 'stylesheet'
    , rules: rules
  }

  loadPackage(filename, opts, function(err, pkg, pathname) {
    if (err) return done(err)
    var dirname = path.dirname(pathname)

    modifiers = usedTransforms(pathname
      , 'modifiers'
      , pkg
      , opts
      , modifiers
    )

    var skey = opts.keys.pkg
    var ckey = opts.keys.config

    series(modifiers.map(function(mr) {
      return function(next) {
        stylesheet.config = pkg
          && pkg[skey]
          && pkg[skey][ckey]
          && pkg[skey][ckey].config
          && pkg[skey][ckey].config[mr.name]
          || {}

        mr.make(filename, stylesheet, function(err, updated) {
          if (err) return next(err)
          if (updated) stylesheet = updated
          return next()
        })
      }
    }), function(err) {
      return done(err, stylesheet.rules)
    })
  })
}
