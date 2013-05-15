var extend = require('deap/shallow'),
	slice = Array.prototype.slice;

module.exports = function(stores) {

	//TODO: Add a key prefix config option
	function Cache(config) {
		config = extend({ store: 'memory' }, config||{});

		if(typeof config.store == 'string') {
			if(!stores[config.store]) throw new Error('No cache store defined for: ' + config.store);

			this.store = new (stores[config.store])(config);
		}else if(typeof config.store == 'object') {
			this.store = config.store;
		}

		if(!this.store) throw new Error('No store defined for cache');
	}
	Cache.prototype = {

		get: function(/* key, load, ttl, done */) {
			var self = this,
				params = arguments.length == 1,
				args = params ? arguments[0] : slice.call(arguments),

				// First arg is always `key`
				key = params ? args.key : args.shift(),

				// Last arg is always `done`
				done = params ? args.done : args.pop(),

				// Load and ttl are optional
				load = params ? args.load : args.shift(),
				ttl = params ? args.ttl : args.shift();

			if(typeof key !== 'string') throw new Error('Invalid arguments for cache.get: "key" must be a string');
			if(typeof done !== 'function') throw new Error('Invalid arguments for cache.get: "done" must be a function');
			if(load && typeof load !== 'function') throw new Error('Invalid arguments for cache.get: "load" must be a function');

			this.store.get(key, function(err, value) {
				if(err) return done(err);

				if(!load || value !== undefined) return done(null, value);

				load(key, function(err, loadedValue) {
					if(err) return done(err);

					done(null, loadedValue);
					self.set(key, loadedValue, ttl);
				});
			});

			return this;
		},

		set: function(key, value, ttl, done) {
			if(typeof ttl == 'function') {
				done = ttl;
				ttl = undefined;
			}

			this.store.set(key, value, ttl, done);

			return this;
		},

		mget: function(/* keys, load, ttl, done */) {
			var self = this,
				params = arguments.length == 1,
				args = params ? arguments[0] : slice.call(arguments),

				// First arg is always `keys`
				keys = params ? args.keys : args.shift(),

				// Last arg is always `done`
				done = params ? args.done : args.pop(),

				// Load and ttl are optional
				load = params ? args.load : args.shift(),
				ttl = params ? args.ttl : args.shift();

			if(!(keys instanceof Array)) throw new Error('Invalid arguments for cache.mget: "keys" must be an array');
			if(typeof done !== 'function') throw new Error('Invalid arguments for cache.mget: "done" must be a function');
			if(load && typeof load !== 'function') throw new Error('Invalid arguments for cache.mget: "load" must be a function');

			this.store.mget(keys, function(err, values) {
				if(err) return done(err);

				loadMissingKeys(keys, values, load, function(err, allthethings, loaded) {
					if(err) return done(err);

					done(null, allthethings);

					self.mset(loaded, ttl);
				});
			});

			return this;
		},

		mset: function(keysValues, ttl, done) {
			if(typeof ttl == 'function') {
				done = ttl;
				ttl = undefined;
			}

			this.store.mset(keysValues, ttl, done);

			return this;
		},

		expire: function(key, ttl, done) {
			if(typeof ttl == 'function') {
				done = ttl;
				ttl = undefined;
			}

			this.store.expire(key, ttl, done);

			return this;
		}

	};

	function loadMissingKeys(keys, values, load, done) {
		var results = {},
			missingKeys = [];

		values.forEach(function(value, idx) {
			var key = keys[idx];

			if(value === undefined) return missingKeys.push(key);

			results[key] = value;
		});

		if(!load || missingKeys.length === 0) return done(null, values);

		// call the load() callback provided to load missing keys
		load(missingKeys, function(err, values) {
			if(!err && !(values instanceof Array)) err = new Error('Invalid values passed into load function: "values" must be an array');
			if(err) return done(err);

			var loaded = {};

			(values||[]).forEach(function(value, idx) {
				loaded[missingKeys[idx]] = value;
			});
			extend(results, loaded);

			done(
				null,
				keys.map(function(key) {
					return results[key];
				}),
				loaded
			);
		});
	}

	return Cache;

};
