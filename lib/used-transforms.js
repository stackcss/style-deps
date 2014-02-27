//
// Determines which transforms to use for a given file,
// based on a parsed package.json and a key to check.
//

var path = require('path')

var resolveTransform = require('./resolve-transform')

module.exports = usedTransforms

function usedTransforms(pathname, key, pkg, opts, extra) {
  var dirname = path.dirname(pathname)
  var pkey = opts.keys.pkg
  var tkey = opts.keys[key]

  // Read the required files from
  // the closest package.json file
  var transforms = (pkg
    && pkg[pkey]
    && pkg[pkey][tkey]
  ) || []

  // Include programatically specified transforms
  // if in the root project directory
  if (pathname === opts.rootPkg && extra) {
    transforms = transforms.concat(extra)
  }

  return transforms.map(function(tr) {
    return resolveTransform(tr, dirname)
  })
}
