/**
 * Transfer.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'transfer',
	attributes: {
		transferid: {
			type: 'string',
			primaryKey: true
		},
		transferNumber: {
			type: 'string'
		},
		organ_id: {
			type: 'string',
			required: true,
			model: 'organ'
		},
		organCount: {
			type: 'integer'
		},
		box_id: {
			type: 'string',
			required: true,
			model: 'box'
		},
		opo_id: {
			type: 'string',
			required: true,
			model: 'opo'
		},
		boxPin: {
			type: 'string'
		},
		fromCity: {
			type: 'string'
		},
		to_hosp_id: {
			type: 'string',
			required: true,
			model: 'hospital'
		},
		toHospName: {
			type: 'string'
		},
		transferPerson_id: {
			type: 'string',
			required: true,
			model: 'transferPerson'
		},
		tracfficType: {
			type: 'string'
		},
		tracfficNumber: {
			type: 'string'
		},
		deviceType: {
			type: 'string'
		},
		getOrganAt: {
			type: 'string'
		},
		startAt: {
			type: 'datetime'
		},
		endAt: {
			type: 'datetime'
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
		},

		// referense table
		// organInfo: {
		// 	collection: 'organ',
		// 	via: 'organid'
		// },
		// boxInfo: {
		// 	collection: 'box',
		// 	via: 'box_id'
		// },
		// opoInfo: {
		// 	collection: 'opo',
		// 	via: 'opoid'
		// },
		// toHospitalInfo: {
		// 	collection: 'hospital',
		// 	via: 'hospitalid'
		// },
		records: {
			collection: 'transferrecord',
			via: 'transfer_id'
		},
	},
	beforeCreate: function(values, cb) {
		values.transferid = Base.uuid();
		values.transferNumber = Base.getTransferNumber();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(transfer) {
		var trans = Base.removeNull(transfer);
		delete trans['dbStatus'];

		return trans;
	},
	detailInfo: function(info) {
		var transInfo = Base.removeNull(info);
		delete transInfo['dbStatus'];
		transInfo.boxInfo = Box.info(transInfo.box_id);
		transInfo.organInfo = Organ.info(transInfo.organ_id);
		transInfo.toHospitalInfo = Hospital.info(transInfo.to_hosp_id);
		transInfo.transferPersonInfo = TransferPerson.info(transInfo.transferPerson_id);
		transInfo.opoInfo = Opo.info(transInfo.opo_id);

		delete transInfo['box_id'];
		delete transInfo['organ_id'];
		delete transInfo['to_hosp_id'];
		delete transInfo['transferPerson_id'];
		delete transInfo['opo_id'];
		delete transInfo['transactionId'];
		
		for (var i = 0; i < transInfo.records.length; i++) {
			transInfo.records[i] = TransferRecord.info(transInfo.records[i]);
		}
		
		return transInfo;
	},
	isCreateParamsOk: function(params) {
		if (!params || !params.baseInfo || !params.to || !params.person || !params.organ || !params.opo) {
			return false;
		}

		return true;
	}
};