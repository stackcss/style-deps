var convert   = require('convert-source-map')
var series    = require('async-series')
var fs        = require('graceful-fs')
var map       = require('map-async')
var multipipe = require('multipipe')
var nodeResolve = require('resolve')
var resolve   = require('./resolve')
var flatten   = require('flatten')
var findup    = require('findup')
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
  opts.packageIndex = opts.packageIndex || {}
  opts.packageCache = opts.packageCache || {}

  opts.debug = opts.debug || false
  opts.compress = opts.compress || false

  opts.modifiers = opts.modifiers || []
  opts.transforms = opts.transforms || []

  opts.keys = opts.keys || {}
  opts.keys.pkg = opts.keys.pkg || 'sheetify'

  ;['config'
  , 'modifiers'
  , 'transforms'
  ].forEach(function(key) {
    opts.keys[key] = opts.keys[key] || key
  })

  loadPackage(root, opts, function(err, pkg, pathname) {
    if (err) return done(err)

    opts.rootPkg    = pathname
    opts.rootPkgDir = path.dirname(pathname)

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
  var modifiers  = opts.modifiers
  var stylesheet = {
      type: 'stylesheet'
    , rules: rules
  }

  loadPackage(filename, opts, function(err, pkg, pathname) {
    if (err) return done(err)
    var dirname = path.dirname(pathname)

    modifiers = determineUsedTransforms(pathname
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

function loadFile(name, opts, done) {
  var transforms = opts.transforms || []
  var input = fs.createReadStream(name)
  var output = bl(parseCSSBuffer)

  loadPackage(name, opts, function(err, pkg, pathname) {
    if (err) return done(err)

    var transforms = determineUsedTransforms(pathname
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

function loadPackage(name, opts, done) {
  var directory = path.dirname(name)

  if (opts.packageCache[directory])
    return done(null
      , opts.packageCache[directory]
      , opts.packageIndex[directory]
    )

  findup(name, 'package.json', function(err, pkgLocation) {
    if (err) return done(err)

    pkgLocation = path.resolve(pkgLocation, 'package.json')

    fs.readFile(pkgLocation, 'utf8', function(err, pkg) {
      if (err) return done(err)

      try {
        pkg = JSON.parse(pkg)
      } catch(e) {
        return done(e)
      }

      opts.packageIndex[directory] = pkgLocation
      opts.packageCache[directory] = pkg

      var skey = opts.keys.pkg
      var ckey = opts.keys.config
      var config = pkg[skey]
                && pkg[skey][ckey]

      if (!config) return done(null, pkg, pkgLocation)

      nodeResolve(config, {
        basedir: path.dirname(pkgLocation)
      }, function(err, configFile) {
        if (err) return done(err)

        var config = require(configFile)

        if (typeof config !== 'function') {
          return done(new Error(
              'style-deps config at "'
            + configFile
            + '" must export a function'
          ))
        }

        var pkgParent = path.resolve(pkgLocation, '../..')
        findup(pkgParent, 'package.json', function(err, pkgParent) {
          var parent = opts.packageCache[pkgParent] || {}
          var output = new Configure

          config.call(output
            ,  parent
            && parent[skey]
            && parent[skey][ckey]
            || {}
          )

          pkg[skey][ckey] = output

          return done(null, pkg, pkgLocation)
        })
      })
    })
  })
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

function resolveTransform(tr, dir) {
  return typeof tr !== 'string'
    ? tr
    : require(nodeResolve.sync(tr, {
      basedir: typeof dir !== 'string'
        ? process.cwd()
        : dir
    }))
}

function determineUsedTransforms(pathname, key, pkg, opts, extra) {
  var dirname = path.dirname(pathname)
  var pkey = opts.keys.pkg
  var tkey = opts.keys[key]

  // Read the required files from
  // the closest package.json file
  var transforms = pkg
    && pkg[pkey]
    && pkg[pkey][tkey]
    || []

  // Include programatically specified transforms
  // if in the root project directory
  if (pathname === opts.rootPkg && extra) {
    transforms = transforms.concat(extra)
  }

  return transforms.map(function(tr) {
    return {
        make: resolveTransform(tr, dirname)
      , name: tr
    }
  })
}

function Configure(config) {
  this.config = config || {}
}

Configure.prototype.configure = function(name, update) {
  var config = this.config[name] = this.config[name] || {}

  Object.keys(update).forEach(function(key) {
    config[key] = update[key]
  })

  return this
}
