var betamax = require('betamax')
var styledeps = require('./')
var tape = require('tape')
var path = require('path')
var fs = require('fs')

var test = {
    base:         betamax(__dirname + '/fixtures/base-project', tape)
  , configBase:   betamax(__dirname + '/fixtures/config-base', tape)
  , configNested: betamax(__dirname + '/fixtures/config-nested', tape)
}

test.base('single file, no additions', function(t) {
  t.plan(1)

  var root = path.join(t.directory, 'index.css')

  styledeps(root, function(err, src) {
    t.ifError(err)
  })
})

test.configBase('simple config', function(t) {
  t.plan(1)

  var root = path.join(t.directory, 'index.css')

  styledeps(root, function(err, src) {
    t.ifError(err)
    console.log(src)
  })
})
