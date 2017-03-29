/**
 * Fitting.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'fitting',
	attributes: {
		fittingid: {
			type: 'string',
			primaryKey: true
		},
		fittingNumber: {
			type: 'string'
		},
		model: {
			type: 'string'
		},
		quantity: {
			type: 'integer'
		},
		buyFrom: {
			type: 'string'
		},
		buyAt: {
			type: 'datetime'
		},
		remark: {
			type: 'string'
		},
		hosp_id: {
			type: 'string',
			model: 'hospital'
		},
		status: {
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
		}
	},
	beforeCreate: function(values, cb) {
		values.fittingid = Base.uuid();
		values.fittingNumber = Base.getBoxNumber();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(fitting) {
		var f = Base.removeNull(fitting);
		delete f['hosp_id'];
		delete f['dbStatus'];

		return f;
	},
	getUpdateParams: function(params) {
		var updateParams = {};

		if (!Base.isEmptyString(params.model)) {
			updateParams.model = params.model;
		}

		if (!Base.isEmptyString(params.quantity)) {
			updateParams.quantity = params.quantity;
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

		return updateParams;
	}
};