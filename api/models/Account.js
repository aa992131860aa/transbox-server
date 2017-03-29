/**
 * Account.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var crypto = require('crypto');

module.exports = {
	tableName: 'account',
	attributes: {
		accountid: {
			type: 'string',
			primaryKey: true
		},
		username: {
			type: 'string',
			required: true
		},
		pwd: {
			type: 'string',
			// required: true
		},
		type: {
			type: 'string'
		},
		nickname: {
			type: 'string'
		},
		dbStatus: {
			type: 'string'
		},
		createAt: {
			type: 'datetime'
		},
		modifyAt: {
			type: 'datetime'
		},

		//reference models
		hospitals: {
			collection: 'hospital',
			via: 'account_id'
		}
	},
	beforeCreate: function(values, cb) {
		values.accountid = Base.uuid();
		values.pwd = SecurityService.hmacSha256String('123456');
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(account) {
		var a = Base.removeNull(account);
		delete a['dbStatus'];
		delete a['pwd'];
		if (a.type === 'hospital' && a.hospitals.length) {
			a.hospitalInfo = Hospital.info(a.hospitals[0]);
			delete a['hospitals']; //fix
		}

		return a;
	}
};