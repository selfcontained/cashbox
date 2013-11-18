
module.exports = require('./lib/cashbox')({
	'memcached': require('./lib/stores/memcached'),
	'memory': require('./lib/stores/memory'),
	'redis': require('./lib/stores/redis')
});
