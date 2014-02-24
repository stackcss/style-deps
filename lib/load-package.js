//
// Loads the appropriate package.json file for
// a module.
//
// Packages are cached: there should only be one
// "canonical" object for each package file. As such,
// properties can be modified on that package and we
// can trust these changes will be available everywhere.
// It also saves on file system IO which can get pretty
// heavy with larger bundles.
//
// Configuration is also cached and local to
// each package.json file, and is applied here
// by replacing the values in the `sheetify.config`
// object.
//

var configure = require('./configure')
var fs        = require('graceful-fs')
var resolve   = require('resolve')
var findup    = require('findup')
var path      = require('path')

module.exports = loadPackage

function loadPackage(file, opts, done) {
  var directory = path.dirname(file)

  if (opts.packageCache[directory])
    return done(null
      , opts.packageCache[directory]
      , opts.packageIndex[directory]
    )

  findup(file, 'package.json', function(err, pkgLocation) {
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

      resolve(config, {
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

        var pkgParent = path.resolve(
            pkgLocation
          , '../..'
        )

        findup(pkgParent, 'package.json', function(err, pkgParent) {
          var parent = opts.packageCache[pkgParent] || {}
          var output = configure()

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
