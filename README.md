[![browser support](https://ci.testling.com/selfcontained/cashbox.png)](http://ci.testling.com/selfcontained/cashbox)

[![Build Status](https://secure.travis-ci.org/selfcontained/cashbox.png?branch=master)](http://travis-ci.org/selfcontained/cashbox)


cashbox
=======

javascript cache library with configurable storage

---

```bash
npm install cashbox
```

Cashbox provides a common caching api on top of pluggable backend stores.  **memory** and **redis** are currently the two supported stores, with **memory** being the default.  `Cashbox` fully supports custom stores as long as they implement the correct api (see [the memory store](https://github.com/selfcontained/cashbox/blob/master/lib/stores/memory.js) for an example of what to implement).

Using cashbox is pretty simple:

```javascript
var Cashbox = require('cashbox');

// creates an in-memory cache by defaut
var cache = new Cashbox();

cache.set('myKey', 'myValue', function(err, wasSet) {

  cache.get('myKey', function(err, value) {
    console.log(value); //myValue
  });
  
});

// you can also set a ttl in seconds or a time string
cache.set('myKey', 'myValue', 10, function(err, wasSet) {

});

cache.set('myKey', 'myValue', '1 hour', function(err, wasSet) {

});
```

## Cashbox API

---

### .get(key, load, ttl, callback)

+ **key** is a string value used as the cache key
+ **load** - Optionally pass a `load` function that will be called upon a cache miss.

```javascript
// provide a function to load a missing value
function load(key, cb) {
  //load value from db or w/e
  doSomethingAsync(key, function(err, value) {
    if(err) return cb(err);
    
    // cb() expects error first, then value.  Optionally an array of tags can be passed in third 
    cb(null, value);
  });
}

cache.get(key, load, function(err, v) {
	// load() will have been called upon a cache miss
	console.log(v); // value returned from load()
});
```

+ **ttl** is also optional, and may be specified w/ or w/o a load function.  Supported formats for ttl are either a value in seconds, or a time string parseable by [timestr](https://github.com/nbroslawsky/timestr).
+ **callback** is called upon completion of fetching the value from the cache store.  It is passed an error first, and the value.  `undefined` is returned on cache misses

