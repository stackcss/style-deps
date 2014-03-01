var inlineSourcemap = require('./lib/inline-sourcemap')
var inlineImports   = require('./lib/inline-imports')
var loadPackage     = require('./lib/load-package')
var loadFile        = require('./lib/load-file')

var duplexer = require('duplexer2')
var copy     = require('shallow-copy')
var through  = require('through2')
var path     = require('path')
var css      = require('css')
var noop     = (function(){})

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

  opts = copy(opts)
  opts.output = through()
  done = done || noop

  // Determine the root package: used to determine
  // if an imported file should use top-level transforms
  // and modifiers or not.
  loadPackage(root, opts, function(err, pkg, pathname) {
    if (err) return complete(err)

    opts.rootPkg    = pathname
    opts.rootPkgDir = path.dirname(pathname)

    // Load the root file and retrieve its CSS AST.
    // Use opts.pipe to pipe the contents instead
    // of using a file.
    loadFile(input || root, opts, loadedFile)

    function loadedFile(err, rules) {
      if (err) return complete(err)

      // Kick off the bundling process. Happens recursively,
      // and should return a single AST.
      inlineImports(root, opts, rules, function(err, rules) {
        if (err) return complete(err)

        var output = css.stringify({
            type: 'stylesheet'
          , stylesheet: { rules: rules }
        }, {
            sourcemap: opts.debug
          , compress:  opts.compress
        })

        if (!opts.debug)
          return complete(null, output)

        inlineSourcemap(root
          , output
          , complete
        )
      })
    }
  })

  function complete(err, output) {
    var out = opts.output

    if (err) {
      var listeners = out.listeners('error')
      if (listeners.length) {
        out.emit('error', err)
      }

      return done(err)
    } else {
      out.push(output)
      process.nextTick(function() {
        out.emit('end')
        done(null, output)
      })
    }
  }

  var bstream = opts.pipe
    ? duplexer(
        input = through()
      , opts.output
    ) : opts.output

  // bubble up the file event
  if (bstream !== opts.output) {
    opts.output.on('file', function(file) {
      bstream.emit('file', file)
    })
  }

  return bstream
}
