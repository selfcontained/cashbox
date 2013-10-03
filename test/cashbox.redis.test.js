var assert = require('chai').assert,
	async = require('async'),
	Cache = require('../index'),
	Redis = require('../lib/stores/redis');

describe('Redis Cache', function() {

	var cache = new Cache({
			store: 'redis'
		}),
		value = 'adurp';

	it('should create a Redis store', function() {
		assert.isNotNull(cache.store);
		assert.equal(cache.store.type, 'redis');
	});

	it('should allow a store Constructor', function() {
		var cache = new Cache({
			store: Redis
		});

		assert.isNotNull(cache.store);
		assert.equal(cache.store.type, 'redis');
		assert.instanceOf(cache.store, Redis);
	});

	it('should allow a store Object', function() {
		var cache = new Cache({
			store: new Redis()
		});

		assert.isNotNull(cache.store);
		assert.equal(cache.store.type, 'redis');
		assert.instanceOf(cache.store, Redis);
	});

	describe('set() and get()', function() {

		it('should return undefined for misses', function(done) {
			var key = getKey();

			cache.get(key, function(err, v) {
				assert.isNull(err);
				assert.isUndefined(v);

				done();
			});
		});

		it('should set a null value', function(done) {
			var key = getKey();

			cache.set(key, null, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.get(key, function(err, v) {
					assert.isNull(err);
					assert.isNull(v);

					done();
				});
			});
		});

		it('should set a 0 value', function(done) {
			var key = getKey();

			cache.set(key, 0, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.get(key, function(err, v) {
					assert.isNull(err);
					assert.equal(v, 0);

					done();
				});
			});
		});

		it('should set a an empty string', function(done) {
			var key = getKey();

			cache.set(key, '', function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.get(key, function(err, v) {
					assert.isNull(err);
					assert.equal(v, '');

					done();
				});
			});
		});

		it('should accept an object', function(done) {
			var key = getKey();

			cache.get({
				key: key,
				ttl: 1,
				load: function(key, cb) {
					cb(null, value);
				},
				done: function(err, v) {
					assert.isNull(err);
					assert.equal(v, value);

					done();
				}
			});
		});

		it('should have tagging capabilities on the load object for get()', function(done) {
			var tag = getTag(),
				key = getKey();

			cache.get({
				key: key,
				ttl: 1,
				load: function(key, cb) {
					cb(null, value, tag);
				},
				done: function(err, v) {
					assert.isNull(err);
					assert.equal(v, value);

					cache.getKeys(tag, function(err, keys) {
						assert.equal(keys[0], key);
						done();
					});
				}
			});
		});

		describe('without a ttl', function() {

			it('should set a value and get that value', function(done) {
				var key = getKey();

				cache.set(key, value, function(err, set) {
					assert.isNull(err);
					assert.isTrue(set);

					cache.get(key, function(err, v) {
						assert.isNull(err);
						assert.equal(v, value);

						done();
					});
				});
			});
		});

		describe('with a ttl', function() {

			it('should set a value and get that value before expiration', function(done) {
				var key = getKey();

				cache.set(key, value, 5, function(err, set) {
					assert.isNull(err);
					assert.isTrue(set);

					cache.get(key, function(err, v) {
						assert.isNull(err);
						assert.equal(v, value);

						done();
					});
				});
			});

			it('should set a value and get a miss for that value after expiration', function(done) {
				var key = getKey();

				cache.set(key, value, 1, function(err, set) {
					assert.isNull(err);
					assert.isTrue(set);

					// check existence after ttl is up
					setTimeout(function() {
						cache.get(key, function(err, v) {
							assert.isNull(err);
							assert.isUndefined(v);

							done();
						});
					}, 1025);
				});
			});

		});

		describe('with a load function', function() {

			it('should call the load function if there is a miss', function(done) {
				var key = getKey(),
					called = false;

				function load(key, cb) {
					called = true;
					cb(null, value);
				}

				cache.get(key, load, function(err, v) {
					assert.isNull(err);
					assert.equal(v, value);
					assert.isTrue(called);

					// check existence after event loop is done
					setTimeout(function() {
						cache.get(key, function(err, v) {
							assert.isNull(err);
							assert.equal(v, value);

							done();
						});
					}, 0);

				});

			});

			it('should set the ttl with a load function', function(done) {
				var key = getKey(),
					called = false;

				function load(key, cb) {
					called = true;
					cb(null, value);
				}

				cache.get(key, load, 1, function(err, v) {
					assert.isNull(err);
					assert.equal(v, value);
					assert.isTrue(called);

					// check existence after ttl is up
					setTimeout(function() {
						cache.get(key, function(err, v) {
							assert.isNull(err);
							assert.isUndefined(v);

							done();
						});
					}, 1025);

				});
			});
		});

	});

	describe('mget()', function() {
		var value1 = 'bop',
			value2 = 'burp';

		it('should set 2 values, and return both in the same order', function(done) {
			var key1 = getKey(),
				key2 = getKey();

			cache.set(key1, value1, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.set(key2, value2, function(err, set) {
					assert.isNull(err);
					assert.isTrue(set);

					cache.mget([key2, key1], function(err, results) {
						assert.isNull(err);
						assert.lengthOf(results, 2);
						assert.equal(results[0], value2);
						assert.equal(results[1], value1);

						done();
					});
				});
			});
		});

		it('should accept an object', function(done) {
			var key1 = getKey(),
				key2 = getKey();

			cache.mget({
				keys: [key1, key2],
				ttl: 1,
				load: function(keys, cb) {
					cb(null, [value1, value2]);
				},
				done: function(err, results) {
					assert.isNull(err);
					assert.lengthOf(results, 2);
					assert.equal(results[0], value1);
					assert.equal(results[1], value2);

					done();
				}
			});
		});

		it('should accept an object with tagging capabilities (as an array)', function(done) {
			var tag1 = getTag(),
				tag2 = getTag(),
				key1 = getKey(),
				key2 = getKey();

			cache.mget({
				keys: [key1, key2],
				ttl: 1,
				load: function(keys, cb) {
					assert.deepEqual(keys, [key1, key2]);

					cb(
						null,
						[value1, value2],
						[tag1, [tag1, tag2]]
					);
				},
				done: function(err, results) {
					assert.isNull(err);
					assert.lengthOf(results, 2);
					assert.equal(results[0], value1);
					assert.equal(results[1], value2);

					cache.getKeys(tag2, function(err, keys) {
						assert.equal(keys[0], key2);
						assert.lengthOf(keys, 1);

						done();
					});
				}
			});
		});

		it('should accept an object with a string ttl', function(done) {
			var key1 = getKey(),
				key2 = getKey();

			cache.mget({
				keys: [key1, key2],
				ttl: '1 second',
				load: function(keys, cb) {
					cb(null, [value1, value2]);
				},
				done: function(err, results) {
					assert.isNull(err);
					assert.lengthOf(results, 2);
					assert.equal(results[0], value1);
					assert.equal(results[1], value2);

					done();
				}
			});
		});

		it('should handle a load function for missing values', function(done) {
			var key1 = getKey(),
				key2 = getKey(),
				called = false;

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache.mget([key2, key1], loadIt, function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				done();
			});

		});

		it('should handle a load function and a ttl for missing values', function(done) {
			var key1 = getKey(),
				key2 = getKey(),
				called = false;

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache.mget([key2, key1], loadIt, 1, function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				done();
			});

		});

		it('should handle a load function and a string ttl for missing values', function(done) {
			var key1 = getKey(),
				key2 = getKey(),
				called = false;

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache.mget([key2, key1], loadIt, '1s', function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				done();
			});

		});

		it('should handle a load function and a ttl for missing values and not return them after expiration', function(done) {
			var key1 = getKey(),
				key2 = getKey(),
				called = false;

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache.mget([key2, key1], loadIt, 1, function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				setTimeout(function() {
					cache.mget([key1, key2], function(err, results) {
						assert.isNull(err);
						assert.lengthOf(results, 2);
						assert.isUndefined(results[0]);
						assert.isUndefined(results[1]);

						done();
					});
				}, 1025);

			});

		});

		it('should handle a load function and a string ttl for missing values and not return them after expiration', function(done) {
			var key1 = getKey(),
				key2 = getKey(),
				called = false;

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache.mget([key2, key1], loadIt, '1 sec', function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				setTimeout(function() {
					cache.mget([key1, key2], function(err, results) {
						assert.isNull(err);
						assert.lengthOf(results, 2);
						assert.isUndefined(results[0]);
						assert.isUndefined(results[1]);

						done();
					});
				}, 1025);

			});

		});

	});

	describe('mset()', function() {
		var value1 = 'bop',
			value2 = 'burp';

		it('should set multiple values, and then allow them to be retreived', function(done) {
			var key1 = getKey(),
				key2 = getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			cache.mset(hash, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.mget([key1, key2], function(err, results) {
					assert.isNull(err);
					assert.lengthOf(results, 2);
					assert.equal(results[0], value1);
					assert.equal(results[1], value2);

					done();
				});

			});
		});

		it('should set multiple values with a ttl, and then allow them to be retreived', function(done) {
			var key1 = getKey(),
				key2 = getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			cache.mset(hash, 1, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.mget([key1, key2], function(err, results) {
					assert.isNull(err);
					assert.lengthOf(results, 2);
					assert.equal(results[0], value1);
					assert.equal(results[1], value2);

					done();
				});

			});
		});

		it('should set multiple values with a ttl, and then not allow them to be retreived after expiration', function(done) {
			var key1 = getKey(),
				key2 = getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			cache.mset(hash, 1, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				setTimeout(function() {
					cache.mget([key1, key2], function(err, results) {
						assert.isNull(err);
						assert.lengthOf(results, 2);
						assert.isUndefined(results[0]);
						assert.isUndefined(results[1]);

						done();
					});
				}, 1025);

			});
		});

		it('should set one tag for one key', function(done) {
			var hash = {},
				tags = {},
				key1 = getKey(),
				key2 = getKey(),
				tag = getTag();

			hash[key1] = value1;
			hash[key2] = value2;

			tags[key1] = [tag];

			cache.mset(hash, tags, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.getKeys(tag, function(err, keys) {
					assert.isNull(err);
					assert.include(keys, key1);

					done();
				});
			});
		});

		it('should set two tags for one key', function(done) {
			var hash = {},
				key1 = getKey(),
				key2 = getKey(),
				tags = {},
				tag1 = getTag(),
				tag2 = getTag();

			hash[key1] = value1;
			hash[key2] = value2;

			tags[key1] = [tag1, tag2];

			cache.mset(hash, tags, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.getKeys([tag1, tag2], function(err, keys) {
					assert.isNull(err);
					assert.include(keys, key1);

					done();
				});
			});
		});

		it('should set two tags for one key and one tag for another', function(done) {
			var hash = {},
				key1 = getKey(),
				key2 = getKey(),
				tags = {},
				tag1 = getTag(),
				tag2 = getTag();

			hash[key1] = value1;
			hash[key2] = value2;

			tags[key1] = [tag1, tag2];
			tags[key2] = [tag1];

			cache.mset(hash, tags, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.getKeys([tag1, tag2], function(err, keys) {
					assert.isNull(err);
					assert.include(keys, key1);
					assert.include(keys, key2);

					cache.getKeys([tag1], function(err, keys){
						assert.isNull(err);
						assert.include(keys, key1);
						assert.include(keys, key2);

						done();
					});
				});
			});
		});

	});

	describe('expire()', function() {

		it('should return false when trying to expire non-existent keys', function(done) {
			cache.expire('non-existent-key', function(err, expired) {
				assert.isNull(err);
				assert.isFalse(expired);

				done();
			});

		});

		it('should remove an existing key when no ttl is passed', function(done) {
			var key = getKey(),
				value = 'foobar';

			cache.set(key, value, 10, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.expire(key, function(err, expired) {
					assert.isNull(err);
					assert.isTrue(expired);

					cache.get(key, function(err, v) {
						assert.isNull(err);
						assert.isUndefined(v);

						done();
					});
				});
			});
		});

		it('should change an existing keys expiration', function(done) {
			var key = getKey(),
				value = 'foobar';

			cache.set(key, value, 10, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.expire(key, 1, function(err, expired) {
					assert.isNull(err);
					assert.isTrue(expired);

					setTimeout(function() {
						cache.get(key, function(err, v) {
							assert.isNull(err);
							assert.isUndefined(v);

							done();
						});
					}, 1025);
				});
			});
		});

	});

	describe('selecting a db', function() {

		it('should select the specified database', function(done) {
			var key = getKey(),
				cache = new Cache({
					store: 'redis',
					database: 1
				});

			async.waterfall(
				[
					// issuing a set immediately doesn't ensure database is set
					// this feels like a bug, but not sure how to deal with it atm
					// especially with less support for multi-db redis on the roadmap
					function(cb) {
						cache.store.client.on('ready', cb);
					},
					// set a value in the connected database
					function(cb) {
						cache.set(key, value, function(err, set) {
							assert.isNull(err);
							assert.isTrue(set);

							cb();
						});
					},
					// go back to default
					function(cb) {
						cache.store.client.select(0, function(err) {
							assert.isNull(err);

							cb();
						});
					},
					// ensure key isn't present
					function(cb) {
						cache.get(key, function(err, v) {
							assert.isNull(err);
							assert.isUndefined(v);

							cb();
						});
					},
					// now back to 1, look at me, I'm on a horse
					function(cb) {
						cache.store.client.select(1, function(err) {
							assert.isNull(err);

							cb();
						});
					},
					function(cb) {
						cache.get(key, function(err, v) {
							assert.isNull(err);
							assert.equal(v, value);

							cb();
						});
					}

				],
				done
			);
		});

	});

});

var idx = 0;
function getKey() {
	return ['testkey',++idx,Date.now()].join(':');
}

var tagIdx = 0;
function getTag() {
	return ['tagtag',++tagIdx,Date.now()].join(':');
}
