/**
 * Organ.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var Base = require('./Base');

module.exports = {
	tableName: 'organ',
	attributes: {
		organid: {
			type: 'string',
			primaryKey: true
		},
		segNumber: {
			type: 'string',
			required: true
		},
		type: {
			type: 'string',
			required: true
		},
		bloodType: {
			type: 'string'
		},
		bloodSampleCount: {
			type: 'integer'
		},
		organizationSampleType: {
			type: 'string'
		},
		organizationSampleCount: {
			type: 'integer'
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
		values.organid = Base.uuid();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(organ) {
		var organInfo = Base.removeNull(organ);
		delete organInfo['dbStatus'];

		return organInfo;
	},
	getUpdateParams: function(params) {
		var updateParams = {};

		if (!Base.isEmptyString(params.type)) {
			updateParams.type = params.type;
		}

		if (!Base.isEmptyString(params.bloodSampleCount)) {
			updateParams.bloodSampleCount = params.bloodSampleCount;
		}

		if (!Base.isEmptyString(params.organizationSampleCount)) {
			updateParams.organizationSampleCount = params.organizationSampleCount;
		}

		if (!Base.isEmptyString(params.organizationSampleType)) {
			updateParams.organizationSampleType = params.organizationSampleType;
		}

		return updateParams;
	}
};