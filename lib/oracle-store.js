/* Copyright (c) 2010-2014 Paolo Chiodi, MIT License */
'use strict';

var oracledb = require('oracledb');
var uuid = require('node-uuid');
var _ = require('underscore');

var async = require('async');
var concat = require('concat-stream');
var JSONStream = require('JSONStream');

var name = "oracle-store";


var SENECA_TYPE_COLUMN = 'seneca';

var OBJECT_TYPE = 'o';
var ARRAY_TYPE  = 'a';
var DATE_TYPE   = 'd';
var BOOLEAN_TYPE   = 'b';

var MIN_WAIT = 16;
var MAX_WAIT = 65336;

var SELECT_SIMPLE = 'SELECT {{fields}} FROM {{tablename}} {{conditions}} {{sorting}}';
var SELECT_LIMIT = 'SELECT {{fields}} FROM ( SELECT {{fields}} FROM {{tablename}} {{conditions}} {{sorting}}) WHERE ROWNUM <= {{limit}}';
var SELECT_OFFSET = 'SELECT {{fields}} FROM ( SELECT ROWNUM "rnum$", {{fields}} FROM {{tablename}} {{conditions}} {{sorting}}) WHERE "rnum$" > {{offset}}';
var SELECT_PAGINATION = 'SELECT {{fields}} FROM (SELECT /*+ FIRST_ROWS({{limit_value}}) */ ROWNUM "rnum$", {{tablename}}.* FROM (SELECT {{fields}} FROM {{tablename}} {{conditions}} {{sorting}}) {{tablename}} WHERE ROWNUM <= {{limit}} ) WHERE "rnum$" > {{offset}}';

var DELETE_SIMPLE = 'DELETE {{tablename}} {{conditions}}';
var DELETE_LIMIT = 'DELETE {{tablename}} WHERE ROWID IN (SELECT "rid" FROM ( SELECT ROWID "rid" FROM {{tablename}} {{conditions}} {{sorting}}) WHERE ROWNUM <= {{limit}})';
var DELETE_OFFSET = 'DELETE {{tablename}} WHERE ROWID IN (SELECT "rid" FROM ( SELECT ROWNUM "rnum$", ROWID "rid" FROM {{tablename}} {{conditions}} {{sorting}}) WHERE "rnum$" > {{offset}})';
var DELETE_PAGINATION = 'DELETE {{tablename}} WHERE ROWID IN (SELECT "rid" FROM (SELECT /*+ FIRST_ROWS({{limit_value}}) */ ROWNUM "rnum$", "rid" FROM (SELECT ROWID "rid" FROM {{tablename}} {{conditions}} {{sorting}}) {{tablename}} WHERE ROWNUM <= {{limit}} ) WHERE "rnum$" > {{offset}})';


module.exports = function(opts) {
  var seneca = this;
  var waitmillis = MIN_WAIT;
  var desc, specifications, dbinst;

  function error(args, err, cb) {
    if (err) {
      seneca.log.error(args.actid$,'error: '+err);
      seneca.fail({code:'entity/error',store:name},cb);

      if( 'ECONNREFUSED' === err.code || 'notConnected'===err.message || 'Connection already closed' === err.message || !dbinst.isConnected()) {
        if( MIN_WAIT === waitmillis ) {
          reconnect(args);
        }
      }

      return true;
    }

    return false;
  }


  function reconnect(args) {
    seneca.log.debug(args.actid$,'attempting db reconnect');

    configure(specifications, function(err, me){
      if (err) {
        seneca.log.error(args.actid$,'db reconnect (wait ' + waitmillis + 'ms) failed: ' + err.toString());
        waitmillis = Math.min(2*waitmillis,MAX_WAIT);
        setTimeout( function() {reconnect(args);}, waitmillis);
      } else {
        waitmillis = MIN_WAIT;
        seneca.log.debug(args.actid$, 'reconnect ok');
      }
    });
  }


  function configure(spec, cb) {
    var conf = specifications = spec;

    if (conf.username) {
      conf.user = conf.user || conf.username;
    }

    if (conf.pass) {
      conf.password = conf.password || conf.pass;
    }

    // For backward compatibility with previous store: if connectString is not defined,
    // uses hostname/database
    if (!conf.connectString) {
        conf.connectString = conf.hostname + '/' + conf.database;
    }

    oracledb.autoCommit = true;
    // Uncomment when supported. See: https://github.com/oracle/node-oracledb/issues/188
    // Reember to change the mapping (now CLOBS are Streams).
    // oracledb.fetchAsString = [oracledb.CLOB];

    oracledb.getConnection(conf, function(err, connection) {
      if (err) {
        seneca.log.error('init','db auth failed for ' + conf.username);
        return cb(err);
      }

      dbinst = connection;
      seneca.log.debug('init','db open and authed for ' + conf.username);
      cb(null);
    });
  }

  var store = {
    name:name,
    close: function(args, cb) {
      dbinst.release(function (err) {
          if (err) {
              return cb(err);
          }
          return cb(null);
      });
    },


    save: function(args,cb) {

      var ent, update, statement;
      ent = args.ent;
      update = !!ent.id;
      fixid(ent);

      if (update) {
        statement = updateStatement(ent);

        dbinst.execute(statement.query, statement.values, function( err, result ) {
          if ( !error(args, err, cb) ) {
            seneca.log.debug('save/update', ent, desc);
            cb(null, ent);
          }
      });
      }
      else {
        statement = insertStatement(ent);

        dbinst.execute(statement.query, statement.values, function( err, result ) {
          if ( !error(args, err, cb) ) {
            seneca.log.debug('save/insert', ent, desc);
            cb(null, ent);
          }
      });
      }
    },


    load: function(args, cb) {
      var qent, q, statement;
      qent = args.qent;
      q = args.q;
      q.limit$ = 1;

      statement = selectStatement(qent, q);

      dbinst.execute(statement.query, statement.values, function( err, results ) {
        if (!error(args, err, cb) ) {

           if (results.rows.length) {

            var rows = mapOracleResultToRow (results);

            makeent(qent, rows[0], function (err, fent) {
                if (err) {
                    return cb(err);
                }
                seneca.log.debug('load', q, fent, desc);
                return cb(null, fent);
            });
        } else {
          return cb(null, null);
        }
      }
    });
    },


    list: function(args,cb) {
      var qent, q, statement;

      qent = args.qent;
      q = args.q;

      statement = selectStatement(qent, q);

      dbinst.execute(statement.query, statement.values, function( err, results ) {
        if( !error(args, err, cb) ) {

          var rows = mapOracleResultToRow (results);
          /**
           * Map an array of rows to an arrays of entities, using makeent.
           */
          async.map(rows, function (row, cb) {
              makeent(qent, row, cb);
          }, function (err, list) { // When completed
              if (err) {
                  return cb(err);
              }
              seneca.log.debug('list',q,list.length,list[0],desc);
              cb(null,list);
          });

        }
    });
    },


    remove: function(args, cb) {
      var qent = args.qent;
      var q    = args.q;

      var all  = q.all$; // default false
      var load  = _.isUndefined(q.load$) ? true : q.load$; // default true

      var statement;

      if (all) {
        statement = deleteStatement(qent, q);

        dbinst.execute(statement.query, statement.values, function(err, results) {
          seneca.log.debug('remove/all',q,desc);
          cb(err);
        });
      }
      else {

        if ( load ) {
          q.limit$ = 1;
          statement = selectStatement(qent, q);

          dbinst.execute(statement.query, statement.values, function(err, results) {


            if( !error(args, err, cb) ) {
              if( results.rows.length ) {
                var rows = mapOracleResultToRow (results);
                makeent(qent, rows[0], function (err, fent) {
                    if (err) {
                        return cb(err);
                    }

                    statement = deleteStatement(qent, q);
                    dbinst.execute(statement.query, statement.values, function(err, results) {
                      seneca.log.debug('remove/one', q, null, desc);
                      cb(err,fent);
                    });
                });
              }

            }
            else {
              return cb(err, null);
            }
        });
        }
        else {
          statement = deleteStatement(qent, q);

          dbinst.execute(statement.query, statement.values, function(err, results) {
            seneca.log.debug('remove/one', q, null, desc);

            cb(err,null);
          });
        }
      }
    },

    native: function(args,done) {
      done(null, dbinst);
    }
  };

  var meta = seneca.store.init(seneca,opts,store);
  desc = meta.desc;


  seneca.add({init:store.name,tag:meta.tag},function(args,done){
    configure(opts,function(err){
      if( err ) {
          return seneca.die('store',err,{store:store.name,desc:desc});
      }
      return done();
    });
  });


  return {name:store.name,tag:meta.tag};
};

/**
 * Maps an OracleDB results to an array of rows (name: value);
 * The OracleDB result is in the form:
 * { rows: [ [ '41f47bfa-fcde-4c89-8a1b-7907e33469fb', 'v1', 'v1', null ] ],
 * resultSet: undefined,
 * outBinds: undefined,
 * rowsAffected: undefined,
 * metaData:
 *  [ { name: 'id' },
 *   { name: 'p1' },
 *   { name: 'p2' },
 *   { name: 'seneca' } ] }
 */
var mapOracleResultToRow = function (results) {

    // Map the metadata to a row (name=value).

    var columns = _.pluck(results.metaData, 'name');
    return _.map (results.rows, function (row) {
        return _.reduce(columns, function (prev, column, index) {
            prev[column] = row[index];
            return prev;
        }, {});
    });

};

var makeentp = function(ent) {
  var entp   = {};
  var type   = {};
  var fields = ent.fields$();

  fields.forEach(function(field) {
    if( _.isDate( ent[field ]) ) {
      type[field] = DATE_TYPE;
      entp[field] = ent[field];
    }
    else if( _.isArray( ent[field] ) ) {
      type[field] = ARRAY_TYPE;
      entp[field] = JSON.stringify(ent[field]);
    }
    else if( _.isObject( ent[field] ) ) {
      type[field] = OBJECT_TYPE;
      entp[field] = JSON.stringify(ent[field]);
    }
    else if( _.isBoolean( ent[field] ) ) {
      type[field] = BOOLEAN_TYPE;
      entp[field] = ent[field] ? 'T' : 'F';
    }
    else if( _.isUndefined( ent[field] ) ) {
      entp[field] = null;
    }
    else {
      entp[field] = ent[field];
    }
  });

  if ( !_.isEmpty(type) ){
    entp[SENECA_TYPE_COLUMN] = JSON.stringify(type);
  }

  return entp;
};

/**


/**
 * Map a row to the entity.
 * Assumes that the entity is in the (column: value, ...) form.
 */
var makeent = function(ent, row, cb) {

  var entp       = {};
  var senecatype = {};

  if( !_.isUndefined(row[SENECA_TYPE_COLUMN]) && !_.isNull(row[SENECA_TYPE_COLUMN]) ){
    senecatype = JSON.parse( row[SENECA_TYPE_COLUMN] );
  }
  async.forEachOf(row, function (value, key, callback) {
      if (SENECA_TYPE_COLUMN !== key){
        if( _.isUndefined( senecatype[key])) {
          entp[key] = value;
          callback();
        } else if (senecatype[key] === OBJECT_TYPE) {
            value.pipe(JSONStream.parse()).pipe(concat(function(data) {
                entp[key] = data[0];
                callback();
            }));
        } else if (senecatype[key] === ARRAY_TYPE) {
            value.pipe(JSONStream.parse()).pipe(concat(function(data) {
                entp[key] = data;
                callback();
            }));
        } else if (senecatype[key] === DATE_TYPE) {
          entp[key] = value;
           callback();

        } else if (senecatype[key] === BOOLEAN_TYPE) {
          entp[key] = ( value === 'T' );
           callback();
        }

      } else {
          callback();
      }
    }, function (err) {
        if (err) {
            return cb(err);
        }
        cb(null, ent.make$(entp));
    });
};


function escapename(name) {
  return '"' + name.replace('"', '') + '"';
}

var tablename = function (entity) {
  var canon = entity.canon$({object:true});
  return escapename((canon.base?canon.base+'_':'')+canon.name);
};


function fixquery(qent,q) {
  var qq = {};

  if( !q.native$ ) {
    for( var qp in q ) {
      if( !qp.match(/\$$/) ) {
        qq[qp] = q[qp];
      }
    }
  }
  else {
    qq = _.isArray(q.native$) ? q.native$[0] : q.native$;
  }

  return qq;
}


function metaquery(qent,q) {
  var mq = {};

  if( !q.native$ ) {

    if( q.sort$ ) {
      for( var sf in q.sort$ ) {
          break;
      }
      var sd = q.sort$[sf] < 0 ? 'DESC' : 'ASC';
      mq.sort = [[sf,sd]];
    }

    if( q.limit$ ) {
      mq.limit = q.limit$;
    }

    if( q.skip$ ) {
      mq.skip = q.skip$;
    }

    if( q.fields$ ) {
      mq.fields = q.fields$;
    }
  }
  else {
    mq = _.isArray(q.native$) ? q.native$[1] : mq;
  }

  return mq;
}


var fixid = function (ent) {
  if (!ent.id) {
    if (ent.id$) {
      ent.id = ent.id$.toString();
    } else {
      ent.id = uuid();
    }
  }
};


var updateStatement = function (ent) {
  var setargs = [];
  var values = [];
  var p, query, entp;

  entp = makeentp(ent);

  for( p in entp ) {
    if ( p !== 'id' ) {
      values.push(entp[p]);
      setargs.push(escapename(p) + "= :" + values.length);
    }
  }

  values.push(entp.id);

  query = 'UPDATE ' + tablename(ent) + ' SET ' + setargs.join(', ') + ' WHERE "id"=:' + values.length;

  return {
    query: query,
    values: values
};
};


function insertStatement(ent) {
  var columns = [];
  var inputs = [];
  var values = [];
  var p, query, entp;

  entp = makeentp(ent);

  for ( p in entp ) {
    columns.push(escapename(p));
    values.push(entp[p]);
    inputs.push(":" + values.length);
  }

  query = 'INSERT INTO ' + tablename(ent) + '(' + columns.join(', ') + ') VALUES (' + inputs.join(', ') + ')';

  return {
    query: query,
    values: values
  };
}

var createWhere = function (qq, startindex) {
  var whereargs = [];
  var values = [];
  var p;

  startindex = startindex || 1;
  for (p in qq) {
    if ( _.isNull(qq[p]) || _.isUndefined(qq[p]) ) {
      whereargs.push(escapename(p) + ' IS NULL');
    }
    else {
      whereargs.push(escapename(p) + " = :" + (values.length + startindex));
      values.push(qq[p]);
    }
  }

  return {
    args: whereargs,
    values: values
  };
};

var buildstm = function (template, tablename, qq, mq) {
  var values = [];
  var query;

  query = template.replace(/\{\{(.*?)\}\}/g, function (match, token) {
    var whereargs, fields;

    switch ( token ) {
      case 'conditions':
        whereargs = createWhere(qq, values.length + 1);
        if( whereargs.args.length ) {
          values = values.concat(whereargs.values);
          return "WHERE " + whereargs.args.join(' AND ');
        }
        else {
            return '';
        }
      case 'offset':
        values.push(mq.skip);
        return ':' + values.length;

      case 'limit':
        values.push((mq.skip || 0) + mq.limit);
        return ':' + values.length;

      case 'limit_value':
        return parseInt(mq.limit.toString(), 10).toString();

      case 'tablename':
        return tablename;

      case 'fields':
        if ( mq.fields ) {
          fields = mq.fields.map(function(f){return escapename(f);}).join(', ');

          if ( -1 === mq.fields.indexOf('id') ) {
            fields = escapename('id') + ', ' + fields;
          }

          return fields;
        }
        else {
            return '*';
        }

      case 'sorting':
        if ( mq.sort ) {
          return "ORDER BY " + mq.sort.map(function(sort){ return escapename(sort[0]) + ' ' + sort[1];}).join(', ');
        } else {
            return '';
        }

      default:
        return '';
    }
  });

  return {
    query: query,
    values: values
  };
};

var selectStatement = function (qent,q) {
  var mq = metaquery(qent,q);
  var qq = fixquery(qent,q);
  var template;

  if(mq.limit || mq.skip) {
    if (mq.limit && mq.skip) {
      template = SELECT_PAGINATION;
    }
    else {
      if (mq.limit) {
        template = SELECT_LIMIT;
      }

      if(mq.skip) {
        template = SELECT_OFFSET;
      }
    }
  }
  else {
    template = SELECT_SIMPLE;
  }

  return buildstm(template, tablename(qent), qq, mq);
};


var deleteStatement = function (qent,q) {
  var mq = metaquery(qent,q);
  var qq = fixquery(qent,q);
  var template;

  if(mq.limit || mq.skip) {
    if (mq.limit && mq.skip) {
      template = DELETE_PAGINATION;
    }
    else {
      if (mq.limit) {
        template = DELETE_LIMIT;
      }

      if(mq.skip) {
        template = DELETE_OFFSET;
      }
    }
  }
  else {
    template = DELETE_SIMPLE;
  }

  var stmt = buildstm(template, tablename(qent), qq, mq);
  return stmt;
};
