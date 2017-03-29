var crypto = require('crypto');

module.exports = {
	hmacSha256String: function(str) {
		var key = 'transbox'
		var hmac = crypto.createHmac('sha256', key);
		hmac.update(str);
		var d = hmac.digest('hex');
		console.log('pwd:' + d);
		return d;
	}
};