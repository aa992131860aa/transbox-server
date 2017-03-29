/**
 * Hospital.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'hospital',
	attributes: {
		hospitalid: {
			type: 'string',
			primaryKey: true
			// model: 'box'
		},
		account_id: {
			type: 'string',
			required: true,
			model: 'account'
		},
		name: {
			type: 'string',
			required: true,
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
			type: 'string',
			defaultsTo: ''
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
		status: {
			type: 'string'
		},
		boxModels: {
			type: 'json',
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

		//reference tables
		boxes: {
			collection: 'box',
			via: 'hosp_id'
		},
		fittings: {
			collection: 'fitting',
			via: 'hosp_id'
		},
		transferPersons: {
			collection: 'transferPerson',
			via: 'hosp_id'
		},
		transfers: {
			collection: 'transfer',
			via: 'to_hosp_id'
		}

	},
	beforeCreate: function(values, cb) {
		values.hospitalid = Base.uuid();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		values.boxModels = JSON.stringify(values.boxModels);
		cb();
	},
	info: function(hospital) {
		var hosp = Base.removeNull(hospital);
		delete hosp['dbStatus'];
		delete hosp['transactionId'];
		return hosp;
	},
	detailInfo: function(info) {
		var hosp = Base.removeNull(info);

		hosp.accountInfo = Account.info(hosp.account_id);
		delete hosp['account_id'];
		delete hosp['dbStatus'];
		
		return hosp;
	},
	getUpdateParams: function(params) {
		var updateParams = {};

		if (params.name && params.name.length > 0) {
			updateParams.name = params.name;
		}

		if (params.district && params.district.length > 0) {
			updateParams.district = params.district;
		}

		if (params.address && params.address.length > 0) {
			updateParams.address = params.address;
		}

		if (params.grade && params.grade.length > 0) {
			updateParams.grade = params.grade;
		}

		if (params.contactPerson && params.contactPerson.length > 0) {
			updateParams.contactPerson = params.contactPerson;
		}

		if (params.contactPhone && params.contactPhone.length > 0) {
			updateParams.contactPhone = params.contactPhone;
		}

		if (params.remark && params.remark.length > 0) {
			updateParams.remark = params.remark;
		}

		return updateParams;
	}

};