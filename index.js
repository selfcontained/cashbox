
module.exports = require('./lib/cashbox')({
	'memory': require('./lib/stores/memory'),
	'redis': require('./lib/stores/redis')
});
