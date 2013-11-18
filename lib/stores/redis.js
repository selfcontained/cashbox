var extend = require('deap/shallow'),
	async = require('async'),
	redis = require('redis');

var Store = module.exports = function(config) {
	var self = this;
	this.type = 'redis';

	//apply defaults
	config = extend(
		{
			host: 'localhost',
			port: 6379,
			options: {},
			log: empty,
			error: empty
		},
		config||{}
	);

	this.log = config.log;
	this.error = config.error;

	this.client = redis.createClient(
		config.port,
		config.host,
		config.options
	);

	if(config.database !== undefined) {
		this.client.on('ready', function() {
			self.client.select(config.database, function(err) {
				if(err) self.error('Error selecting db: ' + err.toString);
			});
		});
	}

	this.client.on('error', function(err) {
		self.error('Redis cache error: ' + err.toString());
	});
};

Store.prototype = {

	get: function(key, done) {
		var self = this;

		this.client.get(key, function(err, data) {
			if(err) return done(err);

			// cache miss
			if(data === null) {
				self.log('cache miss: ' + key);
				return done(null, undefined);
			}

			// cache hit
			self.log('cache hit: ' + key);
			done(null, JSON.parse(data));
		});
		return this;
	},

	set: function(key, value, tags, ttl, done) {
		this.log('cache set: ' +key);
		var client = this.client,
			self = this;

		var multi = client.multi()
			.set(key, JSON.stringify(value));

		if(ttl !== undefined) multi.expire(key, ttl);

		if(tags) {
			tags.forEach(function(tag) {
				multi.sadd(tag, key);
			});
		}

		multi.exec(function(err, replies) {
			done(err, replies[0] === 'OK');
		});

		return this;
	},

	mget: function(keys, done) {

		this.client.mget(keys, function(err, values) {
			if(err) return done(err);

			done(null, values && values.map(function(value) {
				// cache miss
				if(value === null) return undefined;

				// cache hit
				return JSON.parse(value);
			}));
		});
		return this;
	},

	mset: function(hash, tagMap, ttl, done) {
		var self = this,
			setValues = [];

		if(hash === undefined) return done(null);

		// convert key/value hash into key,value,key2,value2... array that redis expects
		Object.keys(hash).forEach(function(key) {
			setValues.push(key, JSON.stringify(hash[key]));
		});

		var multi = this.client.multi()
			.mset(setValues);

		// add expire commands for each key
		if(ttl !== undefined) {
			Object.keys(hash).forEach(function(key) {
				multi.expire(key, ttl);
			});
		}

		if(tagMap) {
			Object.keys(tagMap).forEach(function(key) {
				tagMap[key].forEach(function(tag) {
					multi.sadd(tag, key);
				});
			});
		}

		multi.exec(function(err, replies) {
			done(err, replies[0] === 'OK');
		});

		return this;
	},

	expire: function(key, ttl, done) {

		function handleResponse(err, result) {
			done(err, !err && result ===1);
		}

		var result = (ttl === undefined)
			? this.client.del(key, handleResponse)
			: this.client.expire(key, ttl, handleResponse);

		return this;
	},

	getKeys: function(tags, done) {
		this.client.sunion(tags, done);
	}

};

function setTags(key, tags, done) {

	var self = this;
	async.parallel(
		tags.map(function(tag) {
			return function(cb) {self.client.sadd(tag, key, cb); };
		}),
		done
	);
}

function empty() {}
