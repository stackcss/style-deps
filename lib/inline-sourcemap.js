//
// Appends a CSS source map to a stringified
// style bundle. This is specified inline,
// but could easily be extracted using a tool
// like [exorcist](http://npmjs.org/package/exorcist)
//

var convert = require('convert-source-map')
var fs      = require('graceful-fs')
var map     = require('map-async')

module.exports = inlineSourcemap

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
