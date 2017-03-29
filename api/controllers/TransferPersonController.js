/**
 * TransferPersonController
 *
 * @description :: Server-side logic for managing Transferpeople
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');

module.exports = {
	create: function(req, res) {
		var hospitalid = req.body.hosp_id;
		var findHospParams = {
			hospitalid: hospitalid,
			dbStatus: 'N'
		}

		Hospital.findOne(findHospParams).exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				TransferPerson.create(req.body).exec(function(err, record) {
					if (err) {
						BaseController.sendDbError(err, res);
						return;
					}

					if (record) {
						var findParams = {
							transferPersonid: record.transferPersonid,
							dbStatus: 'N'
						}

						TransferPerson.findOne(findParams).populate('hosp_id').exec(function(err, record) {
							if (err) {
								BaseController.sendDbError(err, res);
								return;
							}

							if (record) {
								record.hospital = Hospital.info(record.hosp_id);
								var person = TransferPerson.info(record);
								BaseController.sendOk('新建转运人成功', person, res);

							} else {
								BaseController.sendDbError('数据库未找到新建的数据', res);
							}
						});

					} else {
						BaseController.sendDbError('数据库未找到新建的数据', res);
					}
				});

			} else {
				BaseController.sendNotFound('未找到所选择的医院，可能已经被删除', res);
			}
		});
	},
	getTransferPersons: function(req, res) {
		var findParams = {
			dbStatus: 'N'
		}

		if (req.query.hospitalid) {
			findParams.hosp_id = req.query.hospitalid;
		}

		if (req.query.organType) {
			findParams.organType = req.query.organType;
		}

		TransferPerson.find(findParams).populate('hosp_id').exec(function(err, records){
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			var persons = [];
			for (var i = 0; i < records.length; i++) {
				var record = records[i];
				record.hospital = Hospital.info(record.hosp_id);
				var person = TransferPerson.info(record);
				persons.push(person);
			}

			BaseController.sendOk('获取转运人成功', persons, res);
		});
	}
};