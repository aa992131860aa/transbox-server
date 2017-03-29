/**
 * TransferPerson.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

// var Base = require('./Base');

module.exports = {
	tableName: 'transferPerson',
	attributes: {
		transferPersonid: {
			type: 'string',
			primaryKey: true
		},
		name: {
			type: 'string'
		},
		phone: {
			type: 'string'
		},
		organType: {
			type: 'string'
		},
		hosp_id: {
			type: 'string',
			required: true,
			model: 'hospital'
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
	beforeCreate: function(values, cb) {
		values.transferPersonid = Base.uuid();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(person) {
		var p = Base.removeNull(person);
		delete p['hosp_id'];
		delete p['dbStatus'];

		return p;
	}
};