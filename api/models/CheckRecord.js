/**
 * CheckRecord.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var Base = require('./Base');

module.exports = {
	tableName: 'checkRecord',
	attributes: {
		checkRecordid: {
			type: 'string',
			primaryKey: true
		},
		phone: {
			type: 'string'
		},
		transfer_id: {
			type: 'string',
			required: true
		},
		createAt: {
			type: 'datetime'
		},
		modifyAt: {
			type: 'datetime'
		}
	},
	beforeCreate: function(values, cb) {
		values.checkRecordid = Base.uuid();
		cb();
	}
};