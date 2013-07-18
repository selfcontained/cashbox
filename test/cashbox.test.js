var assert = require('chai').assert,
	Cache = require('../index'),
	Memory = require('../lib/stores/memory');

describe('Cache', function() {

	var key = 'burp',
		value = 'adurp';

	it('should default to a memory store', function() {
		var cache = new Cache();

		assert.isNotNull(cache.store);
		assert.equal(cache.store.type, 'memory');
	});

	it('should allow a store Constructor', function() {
		var cache = new Cache({
			store: Memory
		});

		assert.isNotNull(cache.store);
		assert.equal(cache.store.type, 'memory');
		assert.instanceOf(cache.store, Memory);
	});

	it('should allow a store Object', function() {
		var cache = new Cache({
			store: new Memory()
		});

		assert.isNotNull(cache.store);
		assert.equal(cache.store.type, 'memory');
		assert.instanceOf(cache.store, Memory);
	});

	describe('set() and get()', function() {

		it('should return undefined for misses', function(done) {
			var cache = new Cache();

			cache.get(key, function(err, v) {
				assert.isNull(err);
				assert.isUndefined(v);

				done();
			});
		});

		it('should set a null value', function(done) {
			var cache = new Cache();

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
			var cache = new Cache();

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
			var cache = new Cache();

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
			var cache = new Cache();

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
			var cache = new Cache();

			cache.get({
				key: key,
				ttl: 1,
				load: function(key, cb) {
					cb(null, value, 'test=1');
				},
				done: function(err, v) {
					assert.isNull(err);
					assert.equal(v, value);

					setTimeout(function() {
						cache.getKeys('test=1', function(err, keys) {
							assert.equal(keys[0], key);
							done();
						});
					}, 0);
				}
			});
		});

		describe('without a ttl', function() {

			it('should set a value and get that value', function(done) {
				var cache = new Cache();

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
				var cache = new Cache();

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
				var cache = new Cache();

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
				var called = false,
					cache = new Cache();

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
					cache = new Cache();

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
		var key1 = 'beep',
			key2 = 'boop',
			value1 = 'bop',
			value2 = 'burp';

		it('should set 2 values, and return both in the same order', function(done) {
			var cache = new Cache();

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
			var cache = new Cache();

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
			var cache = new Cache();

			cache.mget({
				keys: [key1, key2],
				ttl: 1,
				load: function(keys, cb) {
					cb(
						null,
						[value1, value2],
						['test=1', 'test=2']
					);
				},
				done: function(err, results) {
					assert.isNull(err);
					assert.lengthOf(results, 2);
					assert.equal(results[0], value1);
					assert.equal(results[1], value2);

					setTimeout(function() {
						cache.getKeys('test=2', function(err, keys) {
							assert.equal(keys[0], key2);
							done();
						});
					}, 0);
				}
			});
		});

		it('should accept an object with tagging capabilities (as an array)', function(done) {
			var cache = new Cache();

			cache.mget({
				keys: [key1, key2],
				ttl: 1,
				load: function(keys, cb) {
					cb(
						null,
						[value1, value2],
						['test_1', 'test_2']
					);
				},
				done: function(err, results) {
					assert.isNull(err);
					assert.lengthOf(results, 2);
					assert.equal(results[0], value1);
					assert.equal(results[1], value2);

					setTimeout(function() {
						cache.getKeys('test_2', function(err, keys) {
							assert.equal(keys[0], key2);
							done();
						});
					}, 0);
				}
			});
		});

		it('should accept an object with a string ttl', function(done) {
			var cache = new Cache();

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
			var called = false,
				cache = new Cache();

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
			var called = false,
				cache = new Cache();

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
			var called = false,
				cache = new Cache();

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
			var called = false,
				cache = new Cache();

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
			var called = false,
				cache = new Cache();

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
		var key1 = 'beep',
			key2 = 'boop',
			value1 = 'bop',
			value2 = 'burp';

		it('should set multiple values, and then allow them to be retreived', function(done) {
			var cache = new Cache(),
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
			var cache = new Cache(),
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
			var cache = new Cache(),
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

	});

	describe('expire()', function() {

		it('should return false when trying to expire non-existent keys', function(done) {
			var cache = new Cache();

			cache.expire('non-existent-key', function(err, expired) {
				assert.isNull(err);
				assert.isFalse(expired);

				done();
			});

		});

		it('should remove an existing key when no ttl is passed', function(done) {
			var cache = new Cache(),
				key = 'someKey',
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
			var cache = new Cache(),
				key = 'someKey',
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

});
