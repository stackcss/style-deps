var styledeps = require('../')
var parse = require('css').parse
var test = require('tape')
var path = require('path')
var fs = require('fs')

var testdirs = {
    base: __dirname + '/fixtures/base-project'
  , conf: {
      base: __dirname + '/fixtures/config-base'
    , nest: __dirname + '/fixtures/config-nested'
  }
}

test('single file, no additions', function(t) {
  t.plan(1)

  var root = path.join(testdirs.base, 'index.css')

  styledeps(root, {
    debug: true
  }, function(err, src) {
    t.ifError(err, 'no error in bundling')
  })
})

test('simple config', function(t) {
  t.plan(5)

  var root = path.join(testdirs.conf.base, 'index.css')

  styledeps(root, {
    debug: true
  }, function(err, src) {
    t.ifError(err, 'no error in bundling')

    var ast = parse(src).stylesheet

    t.ok(ast.rules.length >= 1, 'should have at least one rule')
    t.equal(ast.rules[0].declarations.length, 2, 'first rule should have 2 declarations')
    t.equal(ast.rules[0].declarations[0].value, 'a', 'replaced a variable based on config')
    t.equal(ast.rules[0].declarations[1].value, 'b', 'replaced a variable based on config')
  })
})
