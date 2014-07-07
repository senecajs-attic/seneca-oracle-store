/* Copyright (c) 2010-2014 Paolo Chiodi */
"use strict";


var assert = require('assert')


var seneca = require('seneca')


var shared = require('seneca-store-test')



var si = seneca()
si.use(require('..'),{
  hostname: 'localhost',
  database: 'xe',
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

  it('close', function(done){
    shared.closetest(si,testcount,done)
  })
})