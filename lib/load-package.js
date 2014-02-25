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

      return done(null, pkg, pkgLocation)
    })
  })
}
