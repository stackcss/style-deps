var resolver = require('resolve')
var xtend    = require('xtend')

// Nothing in core for the time being
var core = {}

module.exports      = resolve
module.exports.sync = resolveSync

function resolve(target, opts, next) {
  return resolver(target
    , sheetifyOpts(opts || {})
    , next
  )
}

function resolveSync(target, opts) {
  return resolver.sync(target
    , sheetifyOpts(opts || {})
  )
}

function sheetifyOpts(opts) {
  return xtend(opts, {
      modules: core
    , extensions: ['.css']
    , packageFilter: packageFilter
  })
}

function packageFilter(pkg, root) {
  pkg.main = pkg.style
    ? pkg.style
    : 'index.css'

  return pkg
}
