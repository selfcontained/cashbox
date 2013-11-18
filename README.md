[![browser support](https://ci.testling.com/selfcontained/cashbox.png)](http://ci.testling.com/selfcontained/cashbox)

[![Build Status](https://secure.travis-ci.org/selfcontained/cashbox.png?branch=master)](http://travis-ci.org/selfcontained/cashbox)


cashbox
=======

javascript cache library with configurable storage

---

```bash
npm install cashbox
```

Cashbox provides a common caching api on top of pluggable backend stores.  **memory**, **redis** and **memcached** are the currently supported stores, with **memory** being the default.  `Cashbox` fully supports custom stores as long as they implement the correct api (see [the memory store](https://github.com/selfcontained/cashbox/blob/master/lib/stores/memory.js) for an example of what to implement).  Implementing tagging is optional (see [the memcached store](https://github.com/selfcontained/cashbox/blob/master/lib/stores/memcached.js) for an example of a store that doesn't support tags)

Using cashbox is as follows:

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

+ [constructor](https://github.com/selfcontained/cashbox#cashboxconfig-constructor)
+ [.get(key, [load], [ttl], callback)](https://github.com/selfcontained/cashbox#getkey-load-ttl-callback)
+ [.set(key, value, [tags], [ttl], [callback])](https://github.com/selfcontained/cashbox#setkey-value-tags-ttl-callback)
+ [.mget(keys, [load], [ttl], callback)](https://github.com/selfcontained/cashbox#mgetkeys-load-ttl-callback)
+ [.mset(keysValuesMap, [tags], [ttl], [callback])](https://github.com/selfcontained/cashbox#msetkeysvaluesmap-tags-ttl-callback)
+ [.expire(key, [ttl], [callback])](https://github.com/selfcontained/cashbox#expirekey-ttl-callback)
+ [.getKeys(tags, callback)](https://github.com/selfcontained/cashbox#getkeystags-callback)

### Cashbox(config) constructor

The `Cashbox` constructor accepts an optional config object

+ **type** can be set to specify cache store type. `memory` is the default, `redis` and `memcached` are also supported
+ **store** can be set to either an instance, or a constructor for a backend cache store.  The constructor will be passed the config object should it need any special configuration.

```javascript
// a custom store instance, should implement the same api as the memory/redis/memcached store
var myCustomStore = new MyCustomStore();

// you can pass in the instance
var cache = new Cashbox({ store: myCustomStore });

// or the constructor - it will receive this same config object when instantiated
cache = new Cashbox({ store: MyCustomStore, foo: 'bar' });

```

+ **serialize** can be set for `memory` store.  Defaults to `true`
+ **locations** can be set for `memcached` store.  Defaults to `localhost:11211`.  [More options explained on the memcached module's page](https://github.com/3rd-Eden/node-memcached#server-locations).
+ **host** can be set for `redis` store.  Defaults to `localhost`
+ **port** can be set for `redis` store.  Defaults to `6379`
+ **database** can be set for `redis` store.  Defaults is not set, which uses 0.
+ **options** can be set for `redis` or `memcached` stores.  These are connection options passed into the [`redis.createClient(host, port, options)`](https://github.com/mranney/node_redis#rediscreateclientport-host-options) call, or the [`new Memcached(locations, options)`](https://github.com/3rd-Eden/node-memcached#setting-up-the-client) constructor.

### .get(key, [load], [ttl], callback)

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

+ **ttl** is also optional, and may be specified w/ a load function.  Supported formats for ttl are either a value in seconds, or a time string parseable by [timestr](https://github.com/nbroslawsky/timestr) (i.e. *"1 hour"*).  Omitting ttl will cause value to be cached indefinitely.
+ **callback** is called upon completion of fetching the value from the cache store.  It is passed an error first, and the value.  `undefined` is returned on cache misses

`.get()` can also be called by passing in an object with `key`, `load`, `ttl`, and `done` (callback) properties.

### .set(key, value, [tags], [ttl], [callback])

+ **key** is a string value used as the cache key
+ **value** is what you want to store in the cache
+ **tags** is an optional array of string *tags* that can be used as a means of retreiving keys.
+ **ttl** is an optional time-to-live.  Supported formats for ttl are either a value in seconds, or a time string parseable by [timestr](https://github.com/nbroslawsky/timestr) (i.e. *"1 hour"*).  Omitting ttl will cause value to be cached indefinitely.
+ **callback** is a function called upon completion of `set()` method.  It's passed an error first, and a boolean value indicating if the value was set successfully.

```javascript
// set "myValue" in cache w/ the key of "myKey", tagged with "awesome", expires after 1 hour
cache.set('myKey', 'myValue', ['awesome'], '1 hour', function(err, wasSet) {

   console.log('myKey was cached');
});

```

### .mget(keys, [load], [ttl], callback)

+ **keys** is an array of keys you want to fetch values for
+ **load** is an optional function called on cache misses that is passed an array of missing keys, and a callback function you should call after loading the keys.  The callback function should be called with an error (or null if no error) first, array of values (ordered the same as the keys array), and an optional array of tags, each entry corresponding to the entry of the same index in the values array.

```javascript
// in it's simplest form
// assuming the following is cached { one: '1', two: '2' }
cache.mget(['one', 'two'], function(err, values) {
  console.log(values); // [1, 2]
});

// assuming the following is cached { one: '1' }
cache.mget(['one, two'], loadEm, 60, function(err, values) {
  console.log(values); // [1, 2]

  // 'one' and 'two' are cached for 60 seconds, and 'two' is tagged with 'awesome'
});
// loadEm is called once, with an array of all missing keys
function loadEm(missingKeys, done) {
  console.log(missingKeys); // ['two']

  // load missing keys and pass values along to callback
  done(null, [2], ['awesome']);
}
```

### .mset(keysValuesMap, [tags], [ttl], [callback])

+ **keysValuesMap** is an object of keys => values to cache
+ **tags** is an optional object map of keys => tags
+ **ttl** is an optional time-to-live.  Supported formats for ttl are either a value in seconds, or a time string parseable by [timestr](https://github.com/nbroslawsky/timestr) (i.e. *"1 hour"*).  Omitting ttl will cause value to be cached indefinitely.
+ **callback** is a function called once the values have been set.  It's passed an error first, and a boolean indicating if the set operation was successful.

```javascript
// mset with a 60 second ttl
cache.mset({ 'one':1, 'two':2 }, 60, function(err, wasSet) {
  console.log('my values are cached for 60 seconds');
});

// set tags for one key and a ttl for both
cache.mset({ 'one':1, 'two':2 }, { one: ['awesome', 'pawesome'] }), 60, function(err, wasSet) {
  console.log('values set, "one" tagged with awesome and pawesome');
});
```

### .expire(key, [ttl], [callback])

Used to set ttl on a key, or expire it right away

+ **key** to expire / set ttl on
+ **ttl** optional ttl value to set for key.  If omitted then key will be expired right away
+ **callback** function is called after expiration with an error first, then a boolean indicating if key was expired

```javascript
cache.set('myKey', 'myValue', function(err, wasSet) {

  // myKey was set w/o a ttl, let's add one
  cache.expire('myKey', 60, function(err, expired) {
    console.log(expired); //true
    console.log('myKey now has a 60second ttl set');
  });

  // we could also just expire it right away
  cache.expire('myKey', function(err, expired) {
    console.log(expired); //true
    console.log('myKey is no longer cached');
  });
});
```

### .getKeys(tags, callback)

+ **tags** array of string tags, or single tag string
+ **callback** function is called with an error first, and an array of keys that match the given tags.  This keys returned are *all* keys that have *any* of the given tags.

```javascript
cache.set('myKey', 'myValue', ['awesome'], function(err) {

  cache.getKeys('awesome', function(err, keys) {
    console.log(keys); // ['myKey']
  });

});
```
