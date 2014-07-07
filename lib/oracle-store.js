/* Copyright (c) 2010-2014 Richard Rodger, MIT License */
"use strict";

var name = "oracle-store"

module.exports = function(opts) {
  var seneca = this
  var desc

  function configure(spec,cb) {
    cb()
  }

  var store = {
    name:name,

    close: function(args,cb) {
      throw "Not Implemented"
    },


    save: function(args,cb) {
      throw "Not Implemented"
    },


    load: function(args,cb) {
      throw "Not Implemented"
    },


    list: function(args,cb) {
      throw "Not Implemented"
    },


    remove: function(args,cb) {
      throw "Not Implemented"
    },

    native: function(args,done) {
      throw "Not Implemented"
    }
  }


  var meta = seneca.store.init(seneca,opts,store)
  desc = meta.desc


  seneca.add({init:store.name,tag:meta.tag},function(args,done){
    configure(opts,function(err){
      if( err ) return seneca.die('store',err,{store:store.name,desc:desc});
      return done();
    })
  })


  return {name:store.name,tag:meta.tag}
}












