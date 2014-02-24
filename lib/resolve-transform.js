var resolve = require('resolve')

module.exports = resolveTransform

function resolveTransform(tr, dir) {
  return typeof tr !== 'string'
    ? tr
    : require(resolve.sync(tr, {
      basedir: typeof dir !== 'string'
        ? process.cwd()
        : dir
    }))
}
