var assert = require('chai').assert,
	helpers = require('./helpers'),
	Cache = require('../index'),
	Memory = require('../lib/stores/memory');

var TTL = 1,
	TTL_STRING = '1 sec',
	TIMEOUT = 1025;

describe('Memory Cache', function() {

	helpers.describeStore('memory', Memory);

	helpers.describeSetAndGet(function() { return new Cache(); }, TTL, TIMEOUT);

	helpers.describeMultiGet(
		function() { return new Cache(); },
		'mget()',
		'mget',
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeMultiGet(
		function() { return new Cache(); },
		'get() called with an array',
		'get',
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeMultiSet(
		function() { return new Cache(); },
		'mset()',
		'mset',
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeMultiSet(
		function() { return new Cache(); },
		'set() called with an array',
		'set',
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeExpire(
		function() { return new Cache(); },
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeTagging(function() {
		return new Cache();
	});

	describe('memory specific functionality', function() {

		it('should default to a memory store', function() {
			var cache = new Cache();

			assert.isNotNull(cache.store);
			assert.equal(cache.store.type, 'memory');
		});

		it('should set syncronously when using Memory store', function(done) {
			var cache = new Cache(),
				key = helpers.getKey(),
				value = 'foo';

			cache.set(key, value);
			cache.get(key, function(err, v) {
				assert.isNull(err);
				assert.equal(v, value);

				done();
			});
		});

		it('mset() should function syncronously when using Memory store', function(done) {
			var cache = new Cache(),
				value1 = 'foo',
				value2 = 'fiz',
				key1 = helpers.getKey(),
				key2 = helpers.getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			cache.mset(hash);
			cache.mget([key1, key2], function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value1);
				assert.equal(results[1], value2);

				done();
			});
		});

		it('set() should function syncronously when using Memory store', function(done) {
			var cache = new Cache(),
				value1 = 'foo',
				value2 = 'fiz',
				key1 = helpers.getKey(),
				key2 = helpers.getKey(),
				hash = {};

			hash[key1] = value1;
			hash[key2] = value2;

			cache.set(hash);
			cache.mget([key1, key2], function(err, results) {
				assert.isNull(err);
				assert.lengthOf(results, 2);
				assert.equal(results[0], value1);
				assert.equal(results[1], value2);

				done();
			});
		});

		it('should function syncronously when using the Memory store', function(done) {
			var cache = new Cache(),
				key = helpers.getKey(),
				value = 'foobar';

			cache.set(key, value, 10, function(err, set) {
				assert.isNull(err);
				assert.isTrue(set);

				cache.expire(key);
				cache.get(key, function(err, v) {
					assert.isNull(err);
					assert.isUndefined(v);

					done();
				});
			});
		});

		describe('serialization', function() {
			var object = {

				foo: 'baz',

				burp: 'adurp',

				toJSON: function() {
					return {
						foo: 'bar'
					};
				}
			};

			it('should serialize by default', function(done) {
				var cache = new Cache();

				cache.set('foo', object, function(err, set) {
					assert.isNull(err);
					assert.isTrue(set);

					cache.get('foo', function(err, v) {
						assert.isNull(err);

						assert.deepEqual(v, object.toJSON());
						assert.notDeepEqual(v, object);

						done();
					});

				});
			});

			it('should not serialize when disabled', function(done) {
				var cache = new Cache({
					serialize: false
				});

				cache.set('foo', object, function(err, set) {
					assert.isNull(err);
					assert.isTrue(set);

					cache.get('foo', function(err, v) {
						assert.isNull(err);

						assert.deepEqual(v, object);
						assert.notDeepEqual(v, object.toJSON());

						done();
					});

				});
			});

		});

	});

});
