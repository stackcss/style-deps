var test = require('tape')
var fs = require('fs')
var deps = require('../')

test('imported styles are concatenated in-place', function(t) {
  deps(__dirname + '/fixtures/import/style.css', function(err, css) {
    t.ifError(err)
    var expected = fs.readFileSync(
      __dirname + '/fixtures/import/expected.css',
      'utf8'
    )
    t.equal(expected.trim(), css.trim())
    t.end()
  })
})

test('styles are imported while streaming too', function(t) {
  var file   = __dirname + '/fixtures/import/style.css'
  var stream = deps(file, {
    pipe: true
  }, function(err, css) {
    t.ifError(err)
    var expected = fs.readFileSync(
      __dirname + '/fixtures/import/expected.css',
      'utf8'
    )
    t.equal(expected.trim(), css.trim())
    t.end()
  })

  fs.createReadStream(file)
    .pipe(stream)
})
