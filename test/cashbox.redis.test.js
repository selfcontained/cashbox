var assert = require('chai').assert,
	async = require('async'),
	helpers = require('./helpers'),
	Cache = require('../index'),
	Redis = require('../lib/stores/redis');

var TTL = 1,
	TTL_STRING = '1 sec',
	TIMEOUT = 2000;

describe('Redis Cache', function() {
	this.timeout(2250);

	var cache = new Cache({
		store: 'redis'
	});

	helpers.describeStore('redis', Redis);

	helpers.describeSetAndGet(function() { return cache; }, TTL, TIMEOUT);

	helpers.describeMultiGet(
		function() { return cache; },
		'mget()',
		'mget',
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeMultiGet(
		function() { return cache; },
		'get() called with an array',
		'get',
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeMultiSet(
		function() { return cache; },
		'mset()',
		'mset',
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeMultiSet(
		function() { return cache; },
		'set() called with an array',
		'set',
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeExpire(
		function() { return cache; },
		TTL,
		TTL_STRING,
		TIMEOUT
	);

	helpers.describeTagging(function() {
		return cache;
	});

	describe('selecting a db', function() {

		it('should select the specified database', function(done) {
			var key = helpers.getKey(),
				value = 'foo',
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
