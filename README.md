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

Current Version: 0.0.1

Tested on: Node 0.10.29, Seneca 0.5.17


### Quick example

```JavaScript
var seneca = require('seneca')()
seneca.use('oracle-store',{
  hostname: "localhost",
  port: 1521,
  database: "xe", // System ID (SID)
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



## Unsupported features

At the moment there is no support for:
  * connection pool
  * native driver
  * sort$, limit$, skip$ in remove and save methods


## Test

See the [test README](https://github.com/paolochiodi/seneca-oracle-store/blob/master/test/README.md)


## TODO

* add support for sort$, limit$, skip$ in remove and save methods
* add support for native driver
* add connection pool