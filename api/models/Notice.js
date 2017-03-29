/**
 * Notice.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var Base = require('./Base');

module.exports = {
	tableName: 'notice',
	attributes: {
		noticeid: {
			type: 'string',
			defaultsTo: Base.uuid(),
			primaryKey: true
		},
		transferRecord_id: {
			type: 'string',
			required: true
		},
		phone: {
			type: 'string'
		},
		message: {
			type: 'string'
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