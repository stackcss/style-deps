var styleTransform = require('../lib/style-transform')
var target = __dirname + '/fixtures/import/style.css'

var variables = require('rework-variables')
var through = require('through')
var test = require('tape')
var css = require('css')
var fs = require('fs')
var bl = require('bl')

test('style-transform', function(t) {
  fs.createReadStream(target)
    .pipe(styleTransform(target, [
      function(file) {
        return function(style, next) {
          next(null, variables({
            margin: '20px'
          })(style))
        }
      }
    ]))
    .pipe(bl(function(err, data) {
      t.ifError(err)
      var ast = css.parse(data.toString())
      var dec = ast.stylesheet.rules[1].declarations[1]
      t.equal(dec.value, '20px') // transformed successfully
    }))
})
