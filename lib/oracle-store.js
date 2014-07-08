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

var MIN_WAIT = 16
var MAX_WAIT = 65336

var SELECT_SIMPLE = 'SELECT {{fields}} FROM {{tablename}} {{conditions}} {{sorting}}'
var SELECT_LIMIT = 'SELECT {{fields}} FROM ( SELECT {{fields}} FROM {{tablename}} {{conditions}} {{sorting}}) WHERE ROWNUM <= {{limit}}'
var SELECT_OFFSET = 'SELECT {{fields}} FROM ( SELECT ROWNUM "rnum", {{fields}} FROM {{tablename}} {{conditions}} {{sorting}}) WHERE "rnum" > {{offset}}'
var SELECT_PAGINATION = 'SELECT {{fields}} FROM (SELECT /*+ FIRST_ROWS({{limit_value}}) */ ROWNUM "rnum", {{tablename}}.* FROM (SELECT {{fields}} FROM {{tablename}} {{conditions}} {{sorting}}) {{tablename}} WHERE ROWNUM <= {{limit}} ) WHERE "rnum" > {{offset}}'

module.exports = function(opts) {
  var seneca = this
  var waitmillis = MIN_WAIT
  var desc, specifications

  var dbinst

  function error(args,err,cb) {
    if( err ) {
      seneca.log.error(args.actid$,'error: '+err)
      seneca.fail({code:'entity/error',store:name},cb)

      if( 'ECONNREFUSED'==err.code || 'notConnected'==err.message || 'Connection already closed' == err.message || !dbinst.isConnected()) {
        if( MIN_WAIT == waitmillis ) {
          reconnect(args)
        }
      }

      return true
    }

    return false
  }


  function reconnect(args) {
    seneca.log.debug(args.actid$,'attempting db reconnect')

    configure(specifications, function(err,me){
      if( err ) {
        seneca.log.error(args.actid$,'db reconnect (wait '+waitmillis+'ms) failed: '+err.toString())
        waitmillis = Math.min(2*waitmillis,MAX_WAIT)
        setTimeout( function(){reconnect(args)}, waitmillis )
      }
      else {
        waitmillis = MIN_WAIT
        seneca.log.debug(args.actid$,'reconnect ok')
      }
    })
  }


  function configure(spec,cb) {

    var conf = specifications = spec

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
      dbinst.close(cb)
    },


    save: function(args,cb) {
      var ent, update, statement

      ent = args.ent

      update = !!ent.id

      fixid(ent);


      if (update) {
        statement = updateStatement(ent)

        dbinst.execute(statement.query, statement.values, function( err, result ) {
          if ( !error(args, err, cb) ) {
            seneca.log.debug('save/update',ent,desc)
            cb(null, ent);
          }
        })
      }
      else {
        statement = insertStatement(ent)

        dbinst.execute(statement.query, statement.values, function( err, result ) {
          if ( !error(args, err, cb) ) {
            seneca.log.debug('save/insert',ent,desc)
            cb(null, ent);
          }
        })
      }
    },


    load: function(args,cb) {
      var qent, q, statement

      qent = args.qent
      q = args.q

      statement = selectStatement(qent, q)

      dbinst.execute(statement.query, statement.values, function( err, results ) {
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
      var qent, q, statement

      qent = args.qent
      q = args.q

      statement = selectStatement(qent, q)

      dbinst.execute(statement.query, statement.values, function( err, results ) {
        if( !error(args,err,cb) ) {
          var list;

          list = results.map(function(result) {
            return makeent(qent, result)
          })

          seneca.log.debug('list',q,list.length,list[0],desc)
          cb(null,list);
        }
      })
    },


    remove: function(args,cb) {
      var qent = args.qent
      var q    = args.q

      var all  = q.all$ // default false
      var load  = _.isUndefined(q.load$) ? true : q.load$ // default true

      var statement;

      if ( all ) {
        statement = deleteAllStatement(qent, q)

        dbinst.execute(statement.query, statement.values, function(err, results) {
          seneca.log.debug('remove/all',q,desc)
          cb(err)
        })
      }
      else {
        statement = deleteStatement(qent, q)

        dbinst.execute(statement.query, statement.values, function(err, results) {
          seneca.log.debug('remove/one',q,null,desc)

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
    if( _.isDate( ent[field ]) ) {
      type[field] = DATE_TYPE;
      entp[field] = ent[field]
    }
    else if( _.isArray( ent[field] ) ) {
      type[field] = ARRAY_TYPE;
      entp[field] = JSON.stringify(ent[field])
    }
    else if( _.isObject( ent[field] ) ) {
      type[field] = OBJECT_TYPE;
      entp[field] = JSON.stringify(ent[field])
    }
    else if( _.isBoolean( ent[field] ) ) {
      type[field] = BOOLEAN_TYPE;
      entp[field] = ent[field] ? 'T' : 'F'
    }
    else {
      entp[field] = ent[field]
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

  if( !_.isUndefined(row[SENECA_TYPE_COLUMN]) && !_.isNull(row[SENECA_TYPE_COLUMN]) ){
    senecatype = JSON.parse( row[SENECA_TYPE_COLUMN] )
  }

  if( !_.isUndefined(ent) && !_.isUndefined(row) ) {
    fields.forEach(function(field){
      if (SENECA_TYPE_COLUMN != field){
        if( _.isUndefined( senecatype[field]) ) {
          entp[field] = row[field]
        }
        else if (senecatype[field] == OBJECT_TYPE){
          entp[field] = JSON.parse(row[field])
        }
        else if (senecatype[field] == ARRAY_TYPE){
          entp[field] = JSON.parse(row[field])
        }
        else if (senecatype[field] == DATE_TYPE){
          entp[field] = row[field]
        }
        else if (senecatype[field] == BOOLEAN_TYPE){
          entp[field] = ( row[field] == 'T' )
        }
      }
    })
  }

  return ent.make$(entp)
}


function escapename(name) {
  return '"' + name.replace('"', '') + '"'
}

var tablename = function (entity) {
  var canon = entity.canon$({object:true})
  return escapename((canon.base?canon.base+'_':'')+canon.name)
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


function fixid(ent) {
  if (!ent.id) {
    if (ent.id$) {
      ent.id = ent.id$.toString();
    } else {
      ent.id = uuid();
    }
  }
}


function updateStatement(ent) {
  var setargs = []
  var values = []
  var p, query, entp

  entp = makeentp(ent)

  for( p in entp ) {
    if ( p != 'id' ) {
      values.push(entp[p])
      setargs.push(escapename(p) + "= :" + values.length)
    }
  }

  values.push(entp.id)

  query = 'UPDATE ' + tablename(ent) + ' SET ' + setargs.join(', ') + ' WHERE "id"=:' + values.length;

  return {
    query: query,
    values: values
  }
}


function insertStatement(ent) {
  var columns = []
  var inputs = []
  var values = []
  var p, query, entp

  entp = makeentp(ent)

  for ( p in entp ) {
    columns.push(escapename(p))
    values.push(entp[p])
    inputs.push(":" + values.length)
  }

  query = 'INSERT INTO ' + tablename(ent) + '(' + columns.join(', ') + ') VALUES (' + inputs.join(', ') + ')'

  return {
    query: query,
    values: values
  }
}

function buildstm(template, tablename, qq, mq) {
  var values = []
  var query

  query = template.replace(/\{\{(.*?)\}\}/g, function (match, token) {
    var whereargs

    switch ( token ) {
      case 'conditions':
        whereargs = createWhere(qq, values.length + 1)
        if( whereargs.args.length ) {
          values = values.concat(whereargs.values)
          return "WHERE " + whereargs.args.join(' AND ');
        }
        else return ''

      case 'offset':
        values.push(mq.skip)
        return ':' + values.length

      case 'limit':
        values.push((mq.skip || 0) + mq.limit)
        return ':' + values.length

      case 'limit_value':
        return parseInt(mq.limit.toString(), 10).toString()

      case 'tablename':
        return tablename

      case 'fields':
        return '*'

      default:
        return ''
    }
  })

  return {
    query: query,
    values: values
  }
}

function selectStatement(qent,q) {
  var mq = metaquery(qent,q)
  var qq = fixquery(qent,q)
  var template

  if(mq.limit || mq.skip) {
    if (mq.limit && mq.skip) {
      template = SELECT_PAGINATION
    }
    else {
      if (mq.limit) {
        template = SELECT_LIMIT
      }

      if(mq.skip) {
        template = SELECT_OFFSET
      }
    }
  }
  else {
    template = SELECT_SIMPLE
  }

  return buildstm(template, tablename(qent), qq, mq)
}

function deleteAllStatement(qent,q) {
  var qq, mq

  mq = metaquery(qent,q)
  qq = fixquery(qent,q)

  return buildstm('DELETE FROM {{tablename}} {{conditions}}', tablename(qent), qq, mq)
}


function deleteStatement(qent,q) {
  var qq, mq, query, where

  mq = metaquery(qent,q)
  qq = fixquery(qent,q)
  where = createWhere(qq)
  query = "SELECT rowid FROM " + tablename(qent)

  if ( where.args.length ) {
    query += ' WHERE ' + where.args.join(' AND ') + ' AND ROWNUM = 1'
  }

  query = "DELETE FROM " + tablename(qent) + " WHERE rowid IN (" + query + ")";

  return {
    query: query,
    values: where.values
  }
}

function createWhere(qq, startindex) {
  var whereargs = []
  var values = []
  var p

  startindex = startindex || 1
  for(var p in qq) {
    whereargs.push(escapename(p) + " = :" + (values.length + startindex))
    values.push(qq[p])
  }

  return {
    args: whereargs,
    values: values
  }
}