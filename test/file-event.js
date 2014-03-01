var test = require('tape')
var path = require('path')
var fs = require('fs')
var deps = require('../')

test('emits a file event for each file', function(t) {
  var root   = __dirname + '/fixtures/import/style.css'
  var top    = path.resolve(path.dirname(root), 'node_modules/top/style.css')
  var bottom = path.resolve(path.dirname(root), 'node_modules/bottom/style.css')
  var files  = []

  deps(root, function(err, css) {
    t.ifError(err)

    t.equal(files.length, 3, '3 files emitted in total')
    t.equal(files[0], root, 'root file is emitted first')
    t.notEqual(files.indexOf(top), -1, '"top" module was emitted')
    t.notEqual(files.indexOf(bottom), -1, '"bottom" module was emitted')

    t.end()
  }).on('file', function(file) {
    files.push(file)
  })
})

test('works when being piped too', function(t) {
  var root   = __dirname + '/fixtures/import/style.css'
  var top    = path.resolve(path.dirname(root), 'node_modules/top/style.css')
  var bottom = path.resolve(path.dirname(root), 'node_modules/bottom/style.css')
  var files  = []

  var stream = deps(root, {
    pipe: true
  }, function(err, css) {
    t.ifError(err)

    t.equal(files.length, 3, '3 files emitted in total')
    t.equal(files[0], root, 'root file is emitted first')
    t.notEqual(files.indexOf(top), -1, '"top" module was emitted')
    t.notEqual(files.indexOf(bottom), -1, '"bottom" module was emitted')

    t.end()
  }).on('file', function(file) {
    files.push(file)
  })

  fs.createReadStream(root)
    .pipe(stream)
})
