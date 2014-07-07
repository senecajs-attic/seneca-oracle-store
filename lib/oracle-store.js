/* Copyright (c) 2010-2014 Paolo Chiodi, MIT License */
"use strict";

var oracle = require('oracle')
var uuid = require('node-uuid')
var _ = require('underscore')


var name = "oracle-store"


var SENECA_TYPE_COLUMN = 'seneca'

var OBJECT_TYPE = 'o'
var ARRAY_TYPE  = 'a'
var DATE_TYPE   = 'd'
var BOOLEAN_TYPE   = 'b'


module.exports = function(opts) {
  var seneca = this
  var desc

  var dbinst

  function error(args,err,cb) {
    if( err ) {
      console.log("\n\nERR", err);
      seneca.log.error('entity',err,{store:name})
      return true;
    }
    else return false;
  }


  function configure(spec,cb) {

    var conf = spec

    conf.hostname = conf.hostname || conf.host || conf.server
    conf.username = conf.username || conf.user
    conf.password = conf.password || conf.pass

    oracle.connect(conf, function(err, connection) {
      if( err ) {
        seneca.log.error('init','db auth failed for '+conf.username)
        return cb(err);
      }

      dbinst = connection
      seneca.log.debug('init','db open and authed for '+conf.username)
      cb(null)
    })
  }

  var store = {
    name:name,


    close: function(args,cb) {
      dbinst.close()
      cb(null)
    },


    save: function(args,cb) {
      var ent = args.ent

      var update = !!ent.id;

      if (!ent.id) {
        if (ent.id$) {
          ent.id = ent.id$.toString();
        } else {
          ent.id = uuid();
        }
      }

      var fields = ent.fields$()
      var entp = makeentp(ent)

      var escapedFields, inputList, values, query

      if (update) {
        var i = 1
        var setargs = []
        var values = []

        for( var p in entp ) {
          if ( p != 'id' ) {
            setargs.push(p + "= :" + i)
            values.push(entp[p])
            i++
          }
        }

        query = 'UPDATE ' + tablename(ent) + ' SET ' + setargs.join(', ') + ' WHERE id=\'' + entp.id + '\'';

        dbinst.execute(query, values, function(err, result) {
          if (!error(args, err, cb)) {
            seneca.log(args.tag$,'save/update', result);
            cb(null, ent);
          }
        });
      }
      else {
        escapedFields = []
        inputList = []
        values = []
        i = 1

        for (var field in entp) {
          escapedFields.push(field)
          inputList.push(":" + i)
          values.push(entp[field])
          i++;
        }

        query = 'INSERT INTO ' + tablename(ent) + '(' + escapedFields.join(', ') + ') VALUES (' + inputList.join(', ') + ')';

        dbinst.execute( query, values, function( err, result ) {
          if (!error(args, err, cb)) {
            seneca.log(args.tag$, 'save/insert', result, query);
            cb(null, ent);
          }
        });
      }
    },


    load: function(args,cb) {
      var qent = args.qent
      var q    = args.q


      var mq = metaquery(qent,q)
      var qq = fixquery(qent,q)

      var query = "SELECT * FROM " + tablename(qent)

      var whereargs = []
      var values = []
      var i = 1

      for(var p in qq) {
        whereargs.push(p + " = :" + i)
        values.push(qq[p])
        i++
      }

      if ( whereargs.length ) {
        query = query + ' WHERE ' + whereargs.join(' AND ')
      }

      dbinst.execute(query, values, function(err, results) {
        if( !error(args,err,cb) ) {
          var fent = null;
          if( results.length ) {
            fent = makeent(qent, results[0])
          }

          seneca.log.debug('load',q,fent,desc)
          cb(null,fent);
        }
      })



    },


    list: function(args,cb) {
      var qent = args.qent
      var q    = args.q

      var mq = metaquery(qent,q)
      var qq = fixquery(qent,q)

      var query = "SELECT * FROM " + tablename(qent)

      var whereargs = []
      var values = []
      var i = 1

      for(var p in qq) {
        whereargs.push(p + " = :" + i)
        values.push(qq[p])
        i++
      }

      if ( whereargs.length ) {
        query = query + ' WHERE ' + whereargs.join(' AND ')
      }

      dbinst.execute(query, values, function(err, results) {
        if( !error(args,err,cb) ) {
          var list;

          list = results.map(function(result) {
            return makeent(qent, result)
          })

          seneca.log.debug('list',q,list.length,list,desc)
          cb(null,list);
        }
      })

    },


    remove: function(args,cb) {
      var qent = args.qent
      var q    = args.q

      var all  = q.all$ // default false
      var load  = _.isUndefined(q.load$) ? true : q.load$ // default true

      var qq = fixquery(qent,q)

      if ( all ) {

        var query = "DELETE FROM " + tablename(qent)

        var whereargs = []
        var values = []
        var i = 1

        for(var p in qq) {
          whereargs.push(p + " = :" + i)
          values.push(qq[p])
          i++
        }

        if ( whereargs.length ) {
          query = query + ' WHERE ' + whereargs.join(' AND ')
        }

        dbinst.execute(query, values, function(err, results) {
          seneca.log.debug('remove/all',q,desc)
          cb(err)
        })
      }
      else {
        var query = "SELECT rowid FROM " + tablename(qent)

        var whereargs = []
        var values = []
        var i = 1

        for(var p in qq) {
          whereargs.push(p + " = :" + i)
          values.push(qq[p])
          i++
        }

        if ( whereargs.length ) {
          query = query + ' WHERE ' + whereargs.join(' AND ') + ' AND ROWNUM = 1'
        }

        query = "DELETE FROM " + tablename(qent) + " WHERE rowid IN (" + query + ")";

        dbinst.execute(query, values, function(err, results) {
          seneca.log.debug('remove/one',q,results,desc)

          cb(err,null)
        })
      }

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



var makeentp = function(ent) {
  var entp   = {}
  var type   = {}
  var fields = ent.fields$()

  fields.forEach(function(field){
    var entField = field.toLowerCase();

    if( _.isDate( ent[field ]) ) {
      type[entField] = DATE_TYPE;
      entp[entField] = ent[field]
    }
    else if( _.isArray( ent[field] ) ) {
      type[entField] = ARRAY_TYPE;
      entp[entField] = JSON.stringify(ent[field])
    }
    else if( _.isObject( ent[field] ) ) {
      type[entField] = OBJECT_TYPE;
      entp[entField] = JSON.stringify(ent[field])
    }
    else if( _.isBoolean( ent[field] ) ) {
      type[entField] = BOOLEAN_TYPE;
      entp[entField] = ent[field] ? 'T' : 'F'
    }
    else {
      entp[entField] = ent[field]
    }
  })

  if ( !_.isEmpty(type) ){
    entp[SENECA_TYPE_COLUMN] = JSON.stringify(type)
  }

  return entp
}

var makeent = function(ent,row) {
  var entp       = {}
  var senecatype = {}
  var fields      = _.keys(row)

  if( !_.isUndefined(row[SENECA_TYPE_COLUMN.toUpperCase()]) && !_.isNull(row[SENECA_TYPE_COLUMN.toUpperCase()]) ){
    senecatype = JSON.parse( row[SENECA_TYPE_COLUMN.toUpperCase()] )
  }

  if( !_.isUndefined(ent) && !_.isUndefined(row) ) {
    fields.forEach(function(field){
      var entField = field.toLowerCase();

      if (SENECA_TYPE_COLUMN != entField){
        if( _.isUndefined( senecatype[entField]) ) {
          entp[entField] = row[field]
        }
        else if (senecatype[entField] == OBJECT_TYPE){
          entp[entField] = JSON.parse(row[field])
        }
        else if (senecatype[entField] == ARRAY_TYPE){
          entp[entField] = JSON.parse(row[field])
        }
        else if (senecatype[entField] == DATE_TYPE){
          entp[entField] = row[field]
        }
        else if (senecatype[entField] == BOOLEAN_TYPE){
          entp[entField] = ( row[field] == 'T' )
        }
      }
    })
  }

  return ent.make$(entp)
}


var tablename = function (entity) {
  var canon = entity.canon$({object:true})
  return (canon.base?canon.base+'_':'')+canon.name
}


function fixquery(qent,q) {
  var qq = {};

  if( !q.native$ ) {
    for( var qp in q ) {
      if( !qp.match(/\$$/) ) {
        qq[qp] = q[qp]
      }
    }
  }
  else {
    qq = _.isArray(q.native$) ? q.native$[0] : q.native$
  }

  return qq
}


function metaquery(qent,q) {
  var mq = {}

  if( !q.native$ ) {

    if( q.sort$ ) {
      for( var sf in q.sort$ ) break;
      var sd = q.sort$[sf] < 0 ? 'descending' : 'ascending'
      mq.sort = [[sf,sd]]
    }

    if( q.limit$ ) {
      mq.limit = q.limit$
    }

    if( q.skip$ ) {
      mq.skip = q.skip$
    }

    if( q.fields$ ) {
      mq.fields = q.fields$
    }
  }
  else {
    mq = _.isArray(q.native$) ? q.native$[1] : mq
  }

  return mq
}