# Project Status :

This plugin is not being supported by the Seneca organisation, and is no longer proven to work with the latest version of Seneca.
If you are interested in maintaining this project, please contact us via the issue queue.

# seneca-oracle-store

### Seneca node.js data-storage plugin for Oracle.

This module is a plugin for the Seneca framework. It provides a
storage engine that uses Oracle to persist data. This module is for production use.

The Seneca framework provides an
[ActiveRecord-style data storage API](http://senecajs.org/data-entities.html).
Each supported database has a plugin, such as this one, that
provides the underlying Seneca plugin actions required for data
persistence.


### Support

If you're using this module, feel free to contact me on twitter if you
have any questions! :) [@paolochiodi](http://twitter.com/paolochiodi)

Current Version: 0.1.2

Tested on: Node 0.10.29, Seneca 0.5.19


### Quick example

```JavaScript
var seneca = require('seneca')()
seneca.use('oracle-store',{
  connectString: "localhost/XE" // Oracle Connection String
  user: "oracle",
  password: "oracle"
})

seneca.ready(function(){
  var apple = seneca.make$('fruit')
  apple.name  = 'Pink Lady'
  apple.price = 0.99
  apple.save$(function(err,apple){
    console.log( "apple.id = "+apple.id  )
  })
})
```

*Note:* this module support connecting to oracle databases with tns strings. For more information, checkout the [oracle module](https://github.com/joeferner/node-oracle)


## Install

```sh
npm install seneca
npm install seneca-oracle-store
```

*Note:* `seneca-oracle-store` depends on module `oracle` to connect to oracle databases. In order to compile and install the `oracle` module you should have installed oracle instanst client and its sdk. Fore more information see the [oracle module docs on installation](https://github.com/joeferner/node-oracle/blob/master/INSTALL.md)


## Usage

You don't use this module directly. It provides an underlying data storage engine for the Seneca entity API:

```JavaScript
var entity = seneca.make$('typename')
entity.someproperty = "something"
entity.anotherproperty = 100

entity.save$( function(err,entity){ ... } )
entity.load$( {id: ...}, function(err,entity){ ... } )
entity.list$( {property: ...}, function(err,entity){ ... } )
entity.remove$( {id: ...}, function(err,entity){ ... } )
```


### Queries

The standard Seneca query format is supported:

   * `entity.list$({field1:value1, field2:value2, ...})` implies pseudo-query `field1==value1 AND field2==value2, ...`
   * you can only do AND queries. That's all folks. Ya'll can go home now. The Fat Lady has sung.
   * `entity.list$({f1:v1,...,sort$:{field1:1}})` means sort by field1, ascending
   * `entity.list$({f1:v1,...,sort$:{field1:-1}})` means sort by field1, descending
   * `entity.list$({f1:v1,...,limit$:10})` means only return 10 results
   * `entity.list$({f1:v1,...,skip$:5})` means skip the first 5
   * `entity.list$({f1:v1,...,fields$:['field1','field2']})` means only return the listed fields (avoids pulling lots of data out of the database)
   * you can use sort$, limit$, skip$ and fields$ together

### Native Driver

As with all seneca stores, you can access the native driver, in this case,
the `node-oracle` `connection` object using `entity.native$(function(err,connectio){...})`.

How to write a SQL query using node-oracle driver:

```JavaScript
var query = 'SELECT * FROM "orders WHERE "cust_id"=:1 AND "total" > :2';

orders_ent.native$(function(err, connection){
  connection.execute(query, ['customer', 1000], function(err, list) {
    if(err) return done(err);
    console.log("Found records:", list);
  });
}); // end native$
```

### Note on table and column names

With Oracle, unquoted table and column names are case insensitive and treated as upper case.
In order to consistently retrieve entity property names from database oracle-store quotes all names, meaning that you should quote names when creating tables and columns and use name whose case match exactly the entity property names.


## Unsupported features

At the moment there is no support for:
  * connection pool


## Test

See the [test README](https://github.com/paolochiodi/seneca-oracle-store/blob/master/test/README.md)


## TODO

* add connection pool
