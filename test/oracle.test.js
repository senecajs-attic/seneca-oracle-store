/* Copyright (c) 2010-2014 Paolo Chiodi */
"use strict";


var seneca = require('seneca');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var shared = require('seneca-store-test');
var extra = require('./extra');

var Code = require('code');
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var si = seneca();

si.use(require('..'),{
  connectString: 'localhost/XE', // Oracle Connection String
  user: 'TEST',
  password: 'TEST'
})

si.__testcount = 0
var testcount = 0


describe('oracle', function(){
  it('basic', function(done){
    testcount++
    shared.basictest(si,done)
  })

  it('limits', function(done){
    testcount++
    extra.limitstest(si,done)
  })

  it('fields', function(done){
    testcount++
    extra.fieldstest(si,done)
  })

  it('sorting', function(done){
    testcount++
    extra.sorttest(si,done)
  })

  it('remove load', function(done){
    testcount++
    extra.removeloadtest(si,done)
  })

  it('conditions extra', function(done) {
    testcount++
    extra.conditionsextra(si,done)
  })

  it('update extra', function(done) {
    testcount++
    extra.updateextra(si,done)
  })

  it('remove extra', function(done) {
    testcount++
    extra.removeextra(si,done)
  })

  it('native', function(done) {
    testcount++
    extra.nativetest(si,done)
  })

  it('close', function(done){
    shared.closetest(si,testcount,done)
  })
})
