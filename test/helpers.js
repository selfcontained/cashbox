var f = require('util').format,
	async = require('async'),
	assert = require('chai').assert,
	Cache = require('../index.js');

var helpers = module.exports = {};

helpers.describeStore = function(storeName, Store) {

	describe(f('%s store', storeName), function() {
		it('should allow a store Constructor', function() {
			var cache = new Cache({
				store: Store
			});

			assert.isNotNull(cache.store);
			assert.equal(cache.store.type, storeName);
			assert.instanceOf(cache.store, Store);
		});

		it('should allow a store Object', function() {
			var cache = new Cache({
				store: new Store()
			});

			assert.isNotNull(cache.store);
			assert.equal(cache.store.type, storeName);
			assert.instanceOf(cache.store, Store);
		});

	});
};


helpers.describeSetAndGet = function(getCache, TTL, TIMEOUT) {
	var value = 'burpadurp';

	describe(f('set() and get() for %s', getCache().store.type), function() {

		it('should return undefined for misses', function(done) {
			var cache = getCache();

			cache.get(getKey(), function(err, v) {
				assert.isNull(err);
				assert.isUndefined(v);

				done();
			});
		});

		it('should set without a callback', function(done) {
			var cache = getCache();

			assert.doesNotThrow(function() {
				cache.set(getKey(), value);

				done();
			});
		});

		it('should set a null value', function(done) {
			var cache = getCache(),
				key = getKey();

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
			var cache = getCache(),
				key = getKey();

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
			var cache = getCache(),
				key = getKey();

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

		describe('without a ttl', function() {

			it('should set a value and get that value', function(done) {
				var cache = getCache(),
					key = getKey();

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
				var cache = getCache(),
					key = getKey();

				cache.set(key, value, TTL, function(err, set) {
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
				var cache = getCache(),
					key = getKey();

				cache.set(key, value, TTL, function(err, set) {
					assert.isNull(err);
					assert.isTrue(set);

					// check existence after ttl is up
					setTimeout(function() {
						cache.get(key, function(err, v) {
							assert.isNull(err);
							assert.isUndefined(v);

							done();
						});
					}, TIMEOUT);
				});
			});

		});

		describe('with a load function', function() {

			it('should call the load function if there is a miss', function(done) {
				var called = false,
					cache = getCache(),
					key = getKey();

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
				var called = false,
					cache = getCache(),
					key = getKey();

				function load(key, cb) {
					called = true;
					cb(null, value);
				}

				cache.get(key, load, TTL, function(err, v) {
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
					}, TIMEOUT);

				});
			});
		});

	});

};

helpers.describeMultiGet = function(getCache, description, method, TTL, TTL_STRING, TIMEOUT) {
	var value = 'burpadurp';

	describe(description, function() {
		var value1 = 'bop',
			value2 = 'burp';

		it('should set 2 values, and return both in the same order', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey();

			cache.set(key1, value1, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.set(key2, value2, function(err, set) {
					assert.isNull(err);
					assert.isTrue(set);

					cache[method]([key2, key1], function(err, results) {
						assert.isNull(err);
						assert.lengthOf(results, 2);
						assert.equal(results[0], value2);
						assert.equal(results[1], value1);

						done();
					});
				});
			});
		});

		it('should handle a load function for missing values', function(done) {
			var called = false,
				cache = getCache(),
				key1 = getKey(),
				key2 = getKey();

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache[method]([key2, key1], loadIt, function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				done();
			});

		});

		it('should handle a load function and a ttl for missing values', function(done) {
			var called = false,
				cache = getCache(),
				key1 = getKey(),
				key2 = getKey();

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache[method]([key2, key1], loadIt, 1, function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				done();
			});

		});

		it('should handle a load function and a string ttl for missing values', function(done) {
			var called = false,
				cache = getCache(),
				key1 = getKey(),
				key2 = getKey();

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache[method]([key2, key1], loadIt, '1s', function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				done();
			});

		});

		it('should handle a load function and a ttl for missing values and not return them after expiration', function(done) {
			var called = false,
				cache = getCache(),
				key1 = getKey(),
				key2 = getKey();

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache[method]([key2, key1], loadIt, TTL, function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				setTimeout(function() {
					cache[method]([key1, key2], function(err, results) {
						assert.isNull(err);
						assert.lengthOf(results, 2);
						assert.isUndefined(results[0]);
						assert.isUndefined(results[1]);

						done();
					});
				}, TIMEOUT);

			});

		});

		it('should handle a load function and a string ttl for missing values and not return them after expiration', function(done) {
			var called = false,
				cache = getCache(),
				key1 = getKey(),
				key2 = getKey();

			function loadIt(keys, cb) {
				called = true;
				cb(null, [value2, value1]);
			}

			cache[method]([key2, key1], loadIt, TTL_STRING, function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value2);
				assert.equal(results[1], value1);
				assert.isTrue(called);

				setTimeout(function() {
					cache[method]([key1, key2], function(err, results) {
						assert.isNull(err);
						assert.lengthOf(results, 2);
						assert.isUndefined(results[0]);
						assert.isUndefined(results[1]);

						done();
					});
				}, TIMEOUT);

			});

		});

	});
};

helpers.describeMultiSet = function(getCache, description, method, TTL, TTL_STRING, TIMEOUT) {

	describe(description, function() {
		var value1 = 'bop',
			value2 = 'burp';

		it('should set multiple values, and then allow them to be retreived', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			cache[method](hash, function(err, set) {
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
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			cache[method](hash, TTL, function(err, set) {
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
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			cache[method](hash, TTL, function(err, set) {
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
				}, TIMEOUT);

			});
		});

		it('should function without a callback', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			assert.doesNotThrow(function() {
				cache[method](hash);

				done();
			});
		});

	});
};

helpers.describeExpire = function(getCache, TTL, TTL_STRING, TIMEOUT) {
	var value = 'foobar';

	describe('expire()', function() {

		it('should return false when trying to expire non-existent keys', function(done) {
			var cache = getCache();

			cache.expire('non-existent-key', function(err, expired) {
				assert.isNull(err);
				assert.isFalse(expired);

				done();
			});

		});

		it('should remove an existing key when no ttl is passed', function(done) {
			var cache = getCache(),
				key = getKey();

			cache.set(key, value, TTL, function(err, set) {
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
			var cache = getCache(),
				key = getKey();

			cache.set(key, value, 10, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.expire(key, TTL, function(err, expired) {
					assert.isNull(err);
					assert.isTrue(expired);

					setTimeout(function() {
						cache.get(key, function(err, v) {
							assert.isNull(err);
							assert.isUndefined(v);

							done();
						});
					}, TIMEOUT);
				});
			});
		});

		it('should function without a callback', function(done) {
			var cache = getCache();

			assert.doesNotThrow(function() {
				cache.expire('non-existent-key');

				done();
			});
		});

	});

};

helpers.describeTagging = function(getCache) {

	describe('tagging', function() {
		var value = 'burpadurp',
			value1 = 'foo',
			value2 = 'biz';

		it('should allow getKeys() wit a single tag', function(done) {
			var cache = getCache(),
				key = getKey(),
				tag = getTag();

			cache.set(key, value, [tag], function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.getKeys(tag, function(err, keys) {
					assert.isNull(err);

					assert.deepEqual(keys, [key]);

					done();
				});
			});
		});

		it('should tag 4 cache keys the same way', function(done) {
			var cache = getCache(),
				tags = [ getTag(), getTag(), getTag() ],
				key1 = getKey(),
				key2 = getKey(),
				key3 = getKey(),
				key4 = getKey(),
				hash = {};

			hash[key1] = 'value1';
			hash[key2] = 'value2';
			hash[key3] = 'value3';
			hash[key4] = 'value4';

			async.parallel(
				Object.keys(hash).map(function(key) {
					return function(cb) {
						cache.set(key, hash[key], tags, function(err, set) {
							assert.isNull(err);
							assert.isTrue(set);
							cb();
						});
					};
				}),
				function(err, results) {

					async.parallel(
						tags.map(function(tag) {
							return function(cb) {
								cache.getKeys(tag, function(err, keys) {
									assert.sameMembers(keys, Object.keys(hash));
									cb();
								});
							};
						}),
						function(err) {
							assert.isNull(err);
							done();
						}
					);
				}
			);
		});

		it('should tag 4 cache keys differently', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				key3 = getKey(),
				key4 = getKey(),
				tags = {},
				hash = {};

			hash[key1] = 'value1';
			hash[key2] = 'value2';
			hash[key3] = 'value3';
			hash[key4] = 'value4';

			tags[key1] = [ getTag(), getTag(), getTag() ];
			tags[key2] = [ getTag(), getTag(), getTag() ];
			tags[key3] = [ getTag(), getTag(), getTag() ];
			tags[key4] = [ getTag(), getTag(), getTag() ];

			async.parallel(
				Object.keys(hash).map(function(key) {
					return function(cb) {
						cache.set(key, hash[key], tags[key], function(err, set) {
							assert.isNull(err);
							assert.isTrue(set);
							cb();
						});
					};
				}),
				function(err, results) {

					var tagList = {};
					Object.keys(tags).forEach(function(key) {
						tags[key].forEach(function(tag) {
							if(!tagList[tag]) tagList[tag] = [];
							tagList[tag].push(key);
						});
					});

					async.parallel(
						Object.keys(tagList).reduce(function(map, tag) {
							map[tag] = function(cb) {
								cache.getKeys(tag, function(err, keys) {
									assert.sameMembers(keys, tagList[tag]);
									cb(err, keys);
								});
							};

							return map;
						}, {}),
						function(err, results) {
							assert.isNull(err);
							done();
						}
					);
				}
			);
		});

		it('should set one tag for one key via mset()', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {},
				tags = {},
				tag = getTag();

			hash[key1] = value1;
			hash[key2] = value2;

			tags[key1] = [tag];

			cache.mset(hash, tags, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.getKeys(tag, function(err, keys) {
					assert.isNull(err);
					assert.deepEqual(keys, [key1]);

					done();
				});
			});
		});

		it('should set one tag for one key via set()', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {},
				tags = {},
				tag = getTag();

			hash[key1] = value1;
			hash[key2] = value2;

			tags[key1] = [tag];

			cache.set(hash, tags, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.getKeys(tag, function(err, keys) {
					assert.isNull(err);
					assert.deepEqual(keys, [key1]);

					done();
				});
			});
		});

		it('should set two tags for one key via mset()', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {},
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
					assert.deepEqual(keys, [key1]);

					done();
				});
			});
		});

		it('should set two tags for one key via set()', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {},
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
					assert.deepEqual(keys, [key1]);

					done();
				});
			});
		});

		it('should set two tags for one key and one tag for another via mset()', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {},
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
					assert.lengthOf(keys, 2);

					cache.getKeys([tag1], function(err, keys){
						assert.isNull(err);
						assert.include(keys, key1);
						assert.include(keys, key2);
						assert.lengthOf(keys, 2);

						done();
					});
				});
			});
		});

		it('should set two tags for one key and one tag for another via set()', function(done) {
			var cache = getCache(),
				key1 = getKey(),
				key2 = getKey(),
				hash = {},
				tags = {},
				tag1 = getTag(),
				tag2 = getTag();

			hash[key1] = value1;
			hash[key2] = value2;

			tags[key1] = [tag1, tag2];
			tags[key2] = [tag1];

			cache.set(hash, tags, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.getKeys([tag1, tag2], function(err, keys) {
					assert.isNull(err);
					assert.include(keys, key1);
					assert.include(keys, key2);
					assert.lengthOf(keys, 2);

					cache.getKeys([tag1], function(err, keys){
						assert.isNull(err);
						assert.include(keys, key1);
						assert.include(keys, key2);
						assert.lengthOf(keys, 2);

						done();
					});
				});
			});
		});

	});

};

var idx = 0;
var getKey = helpers.getKey = function() {
	return ['testkey',++idx,Date.now()].join(':');
};

var tagIdx = 0;
var getTag = helpers.getTag = function() {
	return ['tagtag',++tagIdx,Date.now()].join(':');
};
