/**
 * TransferRecord.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var Base = require('./Base');

module.exports = {
	tableName: 'transferRecord',
	attributes: {
		transferRecordid: {
			type: 'string',
			primaryKey: true
		},
		transfer_id: {
			type: 'string',
			required: true,
			model: 'transfer'
		},
		type: {
			type: 'integer'
		},
		currentCity: {
			type: 'string'
		},
		distance: {
			type: 'string'
		},
		duration: {
			type: 'string'
		},
		remark: {
			type: 'string'
		},
		longitude: {
			type: 'string'
		},
		latitude: {
			type: 'string'
		},
		temperature: {
			type: 'string'
		},
		avgTemperature: {
			type: 'string'
		},
		power: {
			type: 'string'
		},
		expendPower: {
			type: 'string'
		},
		humidity: {
			type: 'string'
		},
		collisionInfo: {
			type: 'json'
		},
		recordAt: {
			type: 'datetime'
		},
		dbStatus: {
			type: 'string'
		},
		createAt: {
			type: 'datetime'
		},
		modifyAt: {
			type: 'datetime'
		}
	},
	beforeCreate: function(values, cb){
		// values.transferRecordid = Base.uuid();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(record) {
		var r = Base.removeNull(record);
		delete r['dbStatus'];

		return r;
	}
};
