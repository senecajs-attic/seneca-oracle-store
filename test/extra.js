/* Copyright (c) 2010-2014 Paolo Chiodi */
"use strict";

var assert = require('assert')
var async = require('async')

var scratch = {}

module.exports.limitstest = function(si,done) {
  console.log('LIMITS')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert3rd: function (cb) {
        console.log('insert3rd')

        var cl = si.make$('lmt')
        cl.p1 = 'v3'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      listall: function (cb) {
        console.log('listall')

        var cl = si.make({name$: 'lmt'})
        cl.list$({}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(3, lst.length)
          cb()
        })
      },

      listlimit1skip1: function (cb) {
        console.log('listlimit1skip1')

        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 1, skip$: 1}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          cb()
        })
      },

      listlimit2skip3: function (cb) {
        console.log('listlimit2skip3')

        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 2, skip$: 3}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(0, lst.length)
          cb()
        })
      },

      listlimit5skip2: function (cb) {
        console.log('listlimit5skip2')

        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 5, skip$: 2}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          assert.ok(null == lst[0].rnum$)
          cb()
        })
      },

      insertUpdate: function (cb) {
        console.log('insertUpdate')

        var cl = si.make$('lmt')
        cl.p1 = 'value1'
        cl.p2 = 2
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          assert.ok(foo.id)
          assert.equal(foo.p1, 'value1')
          assert.equal(foo.p2, 2)

          delete foo.p1
          foo.p2 = 2.2

          foo.save$(function (err, foo) {
            assert.ok(null == err)

            foo.load$({id: foo.id}, function(err, foo) {
              assert.ok(foo.id)
              assert.equal(foo.p1, 'value1')
              assert.equal(foo.p2, 2.2)
            })
            cb()
          })
        })
      }
    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

module.exports.fieldstest = function(si, done) {
  console.log('FIELDS')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.p2 = 'v1'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.p2 = 'v2'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert3rd: function (cb) {
        console.log('insert3rd')

        var cl = si.make$('lmt')
        cl.p1 = 'v3'
        cl.p2 = 'v3'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      listallfields: function (cb) {
        console.log('listall')

        var cl = si.make({name$: 'lmt'})
        cl.list$({p1: 'v1'}, function (err, lst) {
          assert.ok(null == err)
          assert.ok(null != lst[0].id)
          assert.equal(lst[0].p1, 'v1')
          assert.equal(lst[0].p2, 'v1')
          cb()
        })
      },

      list1field: function (cb) {
        console.log('list1field')

        var cl = si.make({name$: 'lmt'})
        cl.list$({p1: 'v1', fields$: ['p1']}, function (err, lst) {
          assert.ok(null == err)
          assert.ok(null != lst[0].id)
          assert.ok(null == lst[0].p2)
          assert.equal(lst[0].p1, 'v1')
          cb()
        })
      },

      listotherfield: function (cb) {
        console.log('listotherfield')

        var cl = si.make({name$: 'lmt'})
        cl.list$({p1: 'v1', fields$: ['p2']}, function (err, lst) {
          assert.ok(null == err)
          assert.ok(null != lst[0].id)
          assert.ok(null == lst[0].p1)
          assert.equal(lst[0].p2, 'v1')
          cb()
        })
      }
    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

module.exports.sorttest = function(si, done) {
  console.log('SORT')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.p2 = 'v1'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.p2 = 'v2'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert3rd: function (cb) {
        console.log('insert3rd')

        var cl = si.make$('lmt')
        cl.p1 = 'v3'
        cl.p2 = 'v3'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      listasc: function (cb) {
        console.log('listasc')

        var cl = si.make({name$: 'lmt'})
        cl.list$({sort$: { p1: 1 }}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(lst[0].p1, 'v1')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v3')
          cb()
        })
      },

      listdesc: function (cb) {
        console.log('listdesc')

        var cl = si.make({name$: 'lmt'})
        cl.list$({sort$: { p1: -1 }}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(lst[0].p1, 'v3')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v1')
          cb()
        })
      }
    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

module.exports.removeloadtest = function(si, done) {
  console.log('REMOVE LOAD')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.p2 = 'v1'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.p2 = 'v2'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      removeload: function (cb) {
        console.log('removeload')

        var cl = si.make({name$: 'lmt'})
        cl.remove$({p1: 'v1', load$: true}, function (err, foo) {
          assert.ok(null == err)
          assert.equal('v1', foo.p1)
          cb()
        })
      },

      removenoload: function (cb) {
        console.log('removenoload')

        var cl = si.make({name$: 'lmt'})
        cl.remove$({p1: 'v1', load$: false}, function (err, foo) {
          assert.ok(null == err)
          assert.ok(null == foo)
          cb()
        })
      }
    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

module.exports.conditionsextra = function(si, done) {
  console.log('CONDITIONS EXTRA')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.p2 = 'v1'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('lmt')
        cl.p1 = 'v2'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      listvalue: function (cb) {
        console.log('listvalue')

        var cl = si.make({name$: 'lmt'})
        cl.list$({p2: 'v1'}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          assert.equal('v1', lst[0].p1)
          cb()
        })
      },

      listnull: function (cb) {
        console.log('listnull')

        var cl = si.make({name$: 'lmt'})
        cl.list$({p2: null}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          assert.equal('v2', lst[0].p1)
          cb()
        })
      },

      listundefined: function (cb) {
        console.log('listundefined')

        var cl = si.make({name$: 'lmt'})
        cl.list$({p2: undefined}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          assert.equal('v2', lst[0].p1)
          cb()
        })
      }

    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

module.exports.updateextra = function(si, done) {
  console.log('UPDATE EXTRA')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.p2 = 'v1'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          scratch.lmt1 = foo
          cb()
        })
      },

      insertnull: function (cb) {
        console.log('insertnull')

        var cl = si.make$('lmt')
        cl.p1 = undefined
        cl.p2 = null

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      updatenull: function (cb) {
        console.log('updatenull')

        var cl = scratch.lmt1
        cl.p1 = undefined
        cl.p2 = null

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      }

    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

module.exports.removeextra = function(si, done) {
  console.log('REMOVE EXTRA')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.p2 = 'v1'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },


      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.p2 = 'v2'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert3nd: function (cb) {
        console.log('insert3nd')

        var cl = si.make$('lmt')
        cl.p1 = 'v3'
        cl.p2 = 'v3'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert4rd: function (cb) {
        console.log('insert3rd')

        var cl = si.make$('lmt')
        cl.p1 = 'v4'
        cl.p2 = 'v4'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      metaquery: function (cb) {
        console.log('metaquery')

        var cl = si.make$('lmt')
        cl.remove$({all$: true, limit$:1, skip$:1, sort$: { p1: 1}}, function (err, foo) {
          assert.ok(null == err)

          cl.list$({sort$: {p1: 1}}, function(err, lst) {
            assert.ok(null == err)
            assert.equal(3, lst.length)
            assert.equal('v1', lst[0].p1)
            assert.equal('v3', lst[1].p1)
            assert.equal('v4', lst[2].p1)
            cb()
          })
        })
      },

      limit: function (cb) {
        console.log('limit')

        var cl = si.make$('lmt')
        cl.remove$({all$: true, limit$:1, sort$: {p1: 1}}, function (err, foo) {
          assert.ok(null == err)

          cl.list$({sort$: {p1: 1}}, function(err, lst) {
            assert.ok(null == err)
            assert.equal(2, lst.length)
            assert.equal('v3', lst[0].p1)
            assert.equal('v4', lst[1].p1)
            cb()
          })
        })
      },

      skip: function (cb) {
        console.log('skip')

        var cl = si.make$('lmt')
        cl.remove$({all$: true, skip$:1, sort$: { p1: 1}}, function (err, foo) {
          assert.ok(null == err)

          cl.list$({sort$: {p1: 1}}, function(err, lst) {
            assert.ok(null == err)
            assert.equal(1, lst.length)
            assert.equal('v3', lst[0].p1)
            cb()
          })
        })
      }

    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}


module.exports.nativetest = function(si, done) {
  console.log('NATIVE')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.native$(function (err, connection) {
          assert.ok(null == err)
          connection.execute('DELETE FROM "lmt"', [], function(err, res) {
            assert.ok(null == err)
            cb()
          })
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('lmt')
        cl.native$(function (err, connection) {
          connection.execute('INSERT INTO "lmt" ("p1","p2") VALUES (:1,:2)', ['v1', 'v1'], function(err,res) {
            assert.ok(null == err)
            cb()
          })
        })
      },

      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('lmt')
        cl.native$(function (err, connection) {
          connection.execute('INSERT INTO "lmt" ("p1","p2") VALUES (:1,:2)', ['v2', 'v2'], function(err,res) {
            assert.ok(null == err)
            cb()
          })
        })
      },

      listvalue: function (cb) {
        console.log('listvalue')

        var cl = si.make({name$: 'lmt'})
        cl.native$(function (err, connection) {
          connection.execute('SELECT * FROM "lmt"', [], function(err, res) {
            assert.ok(null == err)
            assert.equal(2, res.rows.length)
            cb()
          })
        })
      }

    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}
