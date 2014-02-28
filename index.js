var inlineSourcemap = require('./lib/inline-sourcemap')
var inlineImports   = require('./lib/inline-imports')
var loadPackage     = require('./lib/load-package')
var loadFile        = require('./lib/load-file')

var through = require('through2')
var path    = require('path')
var css     = require('css')

module.exports = styleDeps

function styleDeps(root, opts, done) {
  var input = null

  if (typeof opts === 'function') {
    done = opts
    opts = {}
  }

  opts = opts || {}
  opts.loaded = {}
  opts.packageIndex = opts.packageIndex || {}
  opts.packageCache = opts.packageCache || {}

  opts.debug = opts.debug || false
  opts.compress = opts.compress || false

  opts.transforms = opts.transforms || []

  opts.keys = opts.keys || {}
  opts.keys.pkg = opts.keys.pkg || 'sheetify'
  opts.keys.transforms = opts.keys.transforms || 'transform'

  // Determine the root package: used to determine
  // if an imported file should use top-level transforms
  // and modifiers or not.
  loadPackage(root, opts, function(err, pkg, pathname) {
    if (err) return done(err)

    opts.rootPkg    = pathname
    opts.rootPkgDir = path.dirname(pathname)

    // Load the root file and retrieve its CSS AST.
    // Use opts.pipe to pipe the contents instead
    // of using a file.
    loadFile(input || root, opts, loadedFile)

    function loadedFile(err, rules) {
      if (err) return done(err)

      // Kick off the bundling process. Happens recursively,
      // and should return a single AST.
      inlineImports(root, opts, rules, function(err, rules) {
        if (err) return done(err)

        var output = css.stringify({
            type: 'stylesheet'
          , stylesheet: { rules: rules }
        }, {
            sourcemap: opts.debug
          , compress:  opts.compress
        })

        if (!opts.debug)
          return done(null, output)

        inlineSourcemap(root
          , output
          , done
        )
      })
    }
  })

  if (opts.pipe)
    return input = through()
}
