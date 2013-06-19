var extend = require('deap/shallow'),
	timestr = require('timestr'),
	slice = Array.prototype.slice,
	noop = function() {};

module.exports = function(stores) {
	//TODO: add prefix for cache keys
	var DEFAULTS = {
		store: 'memory'
	};

	function parseTTL(value) {
		if(typeof value != 'string') return value;
		return timestr(value).toSeconds();
	}

	function Cache(config) {
		config = extend({}, DEFAULTS, config||{});

		if(typeof config.store == 'string') {
			if(!stores[config.store]) throw new Error('No cache store defined for: ' + config.store);

			this.store = new (stores[config.store])(config);
		}else if(typeof config.store == 'function') {
			this.store = new config.store(config);
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

				load(key, function(err, loadedValue, tags) {
					if(err) return done(err);

					done(null, loadedValue);
					self.set(key, loadedValue, tags, ttl, noop);
				});
			});

			return this;
		},

		set: function(/* key, value, tags, ttl, done */) {

			var args = slice.call(arguments),
				done = args.pop(),
				key = args.shift(),
				value = args.shift(),
				tags, ttl;

			if(args.length == 2) {
				tags = args.shift();
				ttl = args.shift();
			} else if(args.length == 1) {
				tags = args.shift();
				if(typeof tags != 'object') {
					ttl = tags;
					tags = undefined;
				}
			}


			this.store.set(key, value, convertTags(tags), parseTTL(ttl), done);

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

				loadMissingKeys(keys, values, load, function(err, allthethings, loaded, tagMap) {
					if(err) return done(err);

					done(null, allthethings);
					self.mset(loaded, tagMap, ttl, noop);
				});
			});

			return this;
		},

		mset: function(/* keysValues, tags, ttl, done */) {
			var args = slice.call(arguments),
				done = args.pop(),
				keysValues = args.shift(),
				tags, ttl;

			if(args.length == 2) {
				tags = args.shift();
				ttl = args.shift();
			} else if(args.length == 1) {
				tags = args.shift();
				if(typeof tags != 'object') {
					ttl = tags;
					tags = undefined;
				}
			}

			this.store.mset(
				keysValues,
				tags && Object.keys(tags).reduce(function(map, key) {
					map[key] = convertTags(tags[key]);
					return map;
				}, {}),
				parseTTL(ttl),
				done
			);

			return this;
		},

		expire: function(key, ttl, done) {
			if(typeof ttl == 'function') {
				done = ttl;
				ttl = undefined;
			}

			this.store.expire(key, parseTTL(ttl), done);

			return this;
		},

		getKeys: function(tags, done) {

			if(!this.store.getKeys) throw new Error('Cache store does not support tagging');
			this.store.getKeys(convertTags(tags), done);
			return this;
		}

	};

	function convertTags(tags) {
		if(!tags) return undefined;
		if(tags instanceof Array) return tags;
		if(typeof tags == 'string') return [tags];

		var rTags = [];
		for(var key in tags) {
			rTags.push([key, tags[key]].join(':'));
		}


		return Array.prototype.concat.apply(
			[],
			Object.keys(tags).map(function(name) {
				var values = (tags[name] instanceof Array) ? tags[name] : [tags[name]];
				return values.map(function(value) {
					return [name, value].join(':');
				});
			})
		);
	}

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
		load(missingKeys, function(err, values, tags) {

			if(!err && !(values instanceof Array)) err = new Error('Invalid values passed into load function: "values" must be an array');
			if(err) return done(err);

			var loaded = {},
				tagMap = {};

			(values||[]).forEach(function(value, idx) {
				loaded[missingKeys[idx]] = value;
				if(tags) tagMap[missingKeys[idx]] = tags[idx];
			});
			extend(results, loaded);

			done(
				null,
				keys.map(function(key) {
					return results[key];
				}),
				loaded,
				tagMap
			);
		});
	}

	return Cache;

};
