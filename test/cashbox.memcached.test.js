var assert = require('chai').assert,
	async = require('async'),
	helpers = require('./helpers'),
	Cache = require('../index'),
	Memcached = require('../lib/stores/memcached');

var TTL = 1,
	TTL_STRING = '1 sec',
	TIMEOUT = 1250;

describe('Memcached Cache', function() {

	var cache = new Cache({
		store: 'memcached'
	});

	helpers.describeStore('memcached', Memcached);

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

});
