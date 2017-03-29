/**
 * Opo.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'opo',
	attributes: {
		opoid: {
			type: 'string',
			primaryKey: true
		},
		name: {
			type: 'string',
			defaultsTo: ''
		},
		district: {
			type: 'string',
			defaultsTo: ''
		},
		address: {
			type: 'string',
			defaultsTo: ''
		},
		grade: {
			type: 'string'
		},
		contactPerson: {
			type: 'string',
			defaultsTo: ''
		},
		contactPhone: {
			type: 'string',
			defaultsTo: ''
		},
		remark: {
			type: 'string',
			defaultsTo: ''
		},
		dbStatus: {
			type: 'string'
		},
		createAt: {
			type: 'datetime'
		},
		modifyAt:{
			type: 'datetime'
		}
	},
	beforeCreate: function(values, cb) {
		values.opoid = Base.uuid();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(opo) {
		var o = Base.removeNull(opo);
		delete o['dbStatus'];

		return o;
	},
	getUpdateParams: function(params) {
		var updateParams = {};

		if (!Base.isEmptyString(params.name)) {
			updateParams.name = params.name;
		}

		if (!Base.isEmptyString(params.district)) {
			updateParams.district = params.district;
		}

		if (!Base.isEmptyString(params.address)) {
			updateParams.address = params.address;
		}

		if (!Base.isEmptyString(params.contactPerson)) {
			updateParams.contactPerson = params.contactPerson;
		}

		if (!Base.isEmptyString(params.contactPhone)) {
			updateParams.contactPhone = params.contactPhone;
		}

		if (!Base.isEmptyString(params.remark)) {
			updateParams.remark = params.remark;
		}

		return updateParams;
	}
};