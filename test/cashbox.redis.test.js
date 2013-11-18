var assert = require('chai').assert,
	async = require('async'),
	helpers = require('./helpers'),
	Cache = require('../index'),
	Redis = require('../lib/stores/redis');

var DEFAULT_TTL = 1,
	DEFAULT_TTL_STRING = '1 sec',
	DEFAULT_TIMEOUT = 2000;



describe('Redis Cache', function() {
	this.timeout(2250);

	var cache = new Cache({
			store: 'redis'
		}),
		value = 'adurp';

	helpers.describeStore('redis', Redis);

	helpers.describeSetAndGet(function() { return cache; }, 1, 2000);

	helpers.describeMultiGet(
		function() { return cache; },
		'mget()',
		'mget',
		DEFAULT_TTL,
		DEFAULT_TTL_STRING,
		DEFAULT_TIMEOUT
	);

	helpers.describeMultiGet(
		function() { return cache; },
		'get() called with an array',
		'get',
		DEFAULT_TTL,
		DEFAULT_TTL_STRING,
		DEFAULT_TIMEOUT
	);

	helpers.describeMultiSet(
		function() { return cache; },
		'mset()',
		'mset',
		DEFAULT_TTL,
		DEFAULT_TTL_STRING,
		DEFAULT_TIMEOUT
	);

	helpers.describeMultiSet(
		function() { return cache; },
		'set() called with an array',
		'set',
		DEFAULT_TTL,
		DEFAULT_TTL_STRING,
		DEFAULT_TIMEOUT
	);

	helpers.describeExpire(
		function() { return new Cache(); },
		DEFAULT_TTL,
		DEFAULT_TTL_STRING,
		DEFAULT_TIMEOUT
	);

	describe('selecting a db', function() {

		it('should select the specified database', function(done) {
			var key = helpers.getKey(),
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
