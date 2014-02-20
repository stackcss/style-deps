var convert   = require('convert-source-map')
var series    = require('async-series')
var fs        = require('graceful-fs')
var map       = require('map-async')
var multipipe = require('multipipe')
var nodeResolve = require('resolve')
var resolve   = require('./resolve')
var flatten   = require('flatten')
var path      = require('path')
var css       = require('css')
var bl        = require('bl')

module.exports = styleDeps

function styleDeps(root, opts, done) {
  if (typeof opts === 'function') {
    done = opts
    opts = {}
  }

  opts = opts || {}
  opts.loaded = {}

  opts.debug = opts.debug || false
  opts.compress = opts.compress || false
  opts.modifiers = opts.modifiers || []
  opts.transforms = opts.transforms || []

  opts.transforms = opts.transforms.map(resolveTransform)
  opts.modifiers  = opts.modifiers.map(resolveTransform)

  loadFile(root, opts, function(err, rules) {
    if (err) return done(err)

    resolveImports(root, opts, rules, function(err, rules) {
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
  })
}

function resolveImports(filename, opts, rules, done) {
  filename = path.resolve(filename)

  // Applies modifiers *after* parsing but before checking
  // for import statements
  applyModifiers(filename, opts, rules, function(err, rules) {
    if (err) return done(err)

    map(rules, function(rule, i, next) {
      rule.position.source = filename

      if (rule.type === 'import') return handleImport(rule, next)
      if (rule.type === 'rule' || !rule.rules) return next(null, rule)

      // Will resolve recursively, i.e. checking nested @media
      // and @document statements etc.
      resolveImports(filename, opts, rule.rules, function(err, updated) {
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

    resolve(rule['import'], {
      basedir: path.dirname(filename)
    }, function(err, resolved) {
      if (err) return next(err)
      if (opts.loaded[resolved]) return next(null, [])

      opts.loaded[resolved] = true

      loadFile(resolved, opts, function(err, nodes) {
        if (err) return next(err)

        resolveImports(resolved
          , opts
          , nodes
          , next
        )
      })
    })
  }
}

function applyModifiers(filename, opts, rules, done) {
  var modifiers = opts.modifiers
  if (!modifiers) return done(null, rules)

  var stylesheet = {
      type: 'stylesheet'
    , rules: rules
  }

  series(modifiers.map(function(mr) {
    return function(next) {
      mr(filename, stylesheet, function(err, updated) {
        if (err) return next(err)
        if (updated) stylesheet = updated
        return next()
      })
    }
  }), function(err) {
    return done(err, stylesheet.rules)
  })
}

function loadFile(name, opts, done) {
  var output = bl(function(err, src) {
    if (err) return done(err)

    src = src.toString()

    var ast = css.parse(src, {
        position: true
      , filename: name
    })

    done(null, ast.stylesheet.rules)
  })

  var transforms = opts.transforms || []
  var input = fs.createReadStream(name)

  transforms = transforms.map(function(tr) {
    return tr(name, opts)
  })

  if (transforms.length) return input
    .pipe(transforms.length > 1
      ? multipipe.apply(null, transforms)
      : transforms[0])
    .pipe(output)

  return input.pipe(output)
}

function stripQuotes(string) {
  var tail = string.charAt(string.length - 1)
  var head = string.charAt(0)

  if (
    tail === '"' ||
    tail === "'" ||
    head === '"' ||
    head === "'"
  ) string = string.replace(/^['"]|["']$/g, '')

  return string
}

function inlineSourcemap(root, output, done) {
  output.map.sources = output.map.sources.map(function(name) {
    return name === 'source.css'
      ? root
      : name
  })

  map(output.map.sources, function(name, i, next) {
    fs.readFile(name, 'utf8', next)
  }, function(err, sourcesContent) {
    if (err) return done(err)

    output.map.sourcesContent = sourcesContent

    var code = output.code

    code += '\n'
    code += '/*# sourceMappingURL=data:application/json;base64,'
    code += convert.fromObject(output.map).toBase64()
    code += '*/'

    done(null, code)
  })
}

function resolveTransform(tr) {
  return typeof tr !== 'string'
    ? tr
    : nodeResolve.sync(tr, {
      basedir: process.cwd()
    })
}
