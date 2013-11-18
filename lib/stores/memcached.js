var deap = require('deap'),
	async = require('async'),
	Memcached = require('memcached');

var Store = module.exports = function(config) {
	var self = this;
	this.type = 'memcached';

	//apply defaults
	config = deap(
		{
			locations: 'localhost:11211',
			options: { },
			log: empty,
			error: empty
		},
		config||{}
	);

	this.log = config.log;
	this.error = config.error;

	this.client = new Memcached(config.locations, config.options);


	this.client.on('failure', function(details) {
		self.error('Memcached cache server failure: ' + details.server);
	});

	this.client.on('remove', function(details) {
		self.error('Memcached cache server removed: ' + details.server);
	});
};

Store.prototype = {

	get: function(key, done) {
		var self = this;

		this.client.get(key, function(err, data) {
			if(err) return done(err);

			// cache miss
			if(data === false) {
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

		this.client.set(key, JSON.stringify(value), ttl^0, function(err) {
			if(err) return done(err, false);

			done(null, true);
		});

		return this;
	},

	mget: function(keys, done) {

		this.client.getMulti(keys, function(err, values) {
			if(err) return done(err);

			done(null, values && keys.map(function(key) {
				var value = values[key];

				// cache miss
				if(value === false || value === undefined) return undefined;

				// cache hit
				return JSON.parse(value);
			}));
		});

		return this;
	},

	mset: function(hash, tagMap, ttl, done) {
		var self = this;

		var handlers = Object.keys(hash).map(function(key) {
			return self.set.bind(self, key, hash[key], null, ttl);
		});

		async.parallel(handlers, function(err) {
			if(err) return done(err, false);

			done(null, true);
		});

		return this;
	},

	expire: function(key, ttl, done) {
		if(ttl === undefined) {
			this.client.del(key, function(err, deleted) {
				if(err) return done(err, false);

				return done(null, deleted);
			});
		}else {
			this.client.touch(key, ttl, function(err, touched) {
				if(err) return done(err, false);

				return done(null, touched);
			});
		}

		return this;
	}

};

function empty() {}
