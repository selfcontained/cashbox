var assert = require('chai').assert,
	Cache = require('../index'),
	async = require('async');

describe('Cache', function() {

	var key = 'burp',
		value = 'adurp';

	var keyValues = {
		'burp1' : 'adurp1',
		'burp2' : 'adurp2',
		'burp3' : 'adurp3',
		'burp4' : 'adurp4'
	};

	it('should tag 4 cache keys the same way', function(done) {
		var cache = new Cache();

		var tags = ['tag-A', 'tag-B', 'tag-C'];

		async.parallel(
			Object.keys(keyValues).map(function(key) {
				return function(cb) {
					cache.set(key, keyValues[key], tags, function(err, set) {
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
								assert.sameMembers(keys, Object.keys(keyValues));
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
		var cache = new Cache();

		var tags = {
			'burp1' : ['tag-A', 'tag-B', 'tag-C'],
			'burp2' : ['tag-B', 'tag-C', 'tag-D'],
			'burp3' : ['tag-C', 'tag-D', 'tag-E'],
			'burp4' : ['tag-D', 'tag-E', 'tag-F']
		};

		async.parallel(
			Object.keys(keyValues).map(function(key) {
				return function(cb) {
					cache.set(key, keyValues[key], tags[key], function(err, set) {
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
});
