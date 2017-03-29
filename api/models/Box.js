/**
 * Box.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var Base = require('./Base');

module.exports = {
	tableName: 'box',
	attributes: {
		boxid: {
			type: 'string',
			primaryKey: true
		},
		boxNumber: {
			type: 'string'
		},
		deviceId: {
			type: 'string',
			required: true
		},
		qrcode: {
			type: 'string'
		},
		model: {
			type: 'string'
		},
		transferStatus: {
			type: 'string'
		},
		buyFrom: {
			type: 'string'
		},
		buyAt: {
			type: 'string'
		},
		remark: {
			type: 'string'
		},
		status: {
			type: 'string'
		},
		// Add a reference to Hospital
		hosp_id: {
			type: 'string',
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
		},
	},
	beforeCreate: function(values, cb) {
		values.boxid = Base.uuid();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(box) {
		var b = Base.removeNull(box);
		delete b['dbStatus'];
		delete b['hosp_id'];

		return b;
	},
	getUpdateParams: function(params) {
		var updateParams = {};

		if (!Base.isEmptyString(params.model)) {
			updateParams.model = params.model;
		}

		if (!Base.isEmptyString(params.buyFrom)) {
			updateParams.buyFrom = params.buyFrom;
		}

		if (!Base.isEmptyString(params.buyAt)) {
			updateParams.buyAt = params.buyAt;
		}

		if (!Base.isEmptyString(params.remark)) {
			updateParams.remark = params.remark;
		}

		if (!Base.isEmptyString(params.transferStatus)) {
			updateParams.transferStatus = params.transferStatus;
		}

		return updateParams;
	}
};