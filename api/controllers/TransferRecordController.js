/**
 * TransferRecordController
 *
 * @description :: Server-side logic for managing Transferrecords
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');
var Promise = require('bluebird');

module.exports = {
	create: function(req, res) {
		if (!req.body.records || req.body.records.length === 0) {
			BaseController.sendBadParams(res);
			return;
		}
        
		var successIds = [];
		async.mapSeries(req.body.records, function(oneRecord, callback) {
			var findParams = {
				transferRecordid: oneRecord.transferRecordid,
				dbStatus: 'N'
			}
			TransferRecord.findOrCreate(findParams, oneRecord).exec(function(err, createdOrFoundRecords) {
				if (err) {
                    console.log(err);
					BaseController.sendOk('写入记录终止', successIds, res);
					return;
				}
                
				if (!createdOrFoundRecords) {
					BaseController.sendOk('写入记录终止', successIds, res);
					return;
				}

				var record = {};
				if (createdOrFoundRecords.length > 0) {
					record = createdOrFoundRecords[0];

				} else {
					record = createdOrFoundRecords;
				}

				if (parseInt(record.type) | 3) {
					//send msg to
					var findParams = {
						transferid: record.transfer_id,
						dbStatus: 'N'
					}
					var transferRecord_id = record.transferRecordid;
					Transfer.findOne(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').exec(function(err, record) {
						if (err) {
							return;
						}

						if (!record) {
							return;
						}

						var transferInfo = Transfer.detailInfo(record);
						//send msg
						var params = {
							transferNumber: transferInfo.transferNumber,
							segNumber: transferInfo.organInfo.segNumber,
							url: Base.config.host + '/transbox/transportHtml/index.html',
							type: 'warning',
							transferRecord_id: transferRecord_id
						}
						MSMService.sendMsg(transferInfo.transferPersonInfo.phone, params);

					});
				}

				successIds.push(oneRecord.transferRecordid);
				callback(null, createdOrFoundRecords);
			});

		}, function(err, results) {
			if (err) {
				BaseController.sendOk('写入记录终止', successIds, res);
				return;
			}

			BaseController.sendOk('写入成功', successIds, res);
		});
	},
	getRecords: function(req, res) {
		var createAt = req.query.createAt ? req.query.createAt : '2000-01-01 00:00:00';
		var transferid = req.query.transferid;

		if (!transferid) {
			BaseController.sendBadParams(res);
			return;
		}

		var findRecordParams = {
			transfer_id: transferid,
			createAt: {
				'>': createAt
			},
			dbStatus: 'N',
			sort: 'recordAt'
		}

		TransferRecord.find(findRecordParams).exec(function(err, records) {
			if (err) {
				console.log(err);
				BaseController.sendDbError(err, res);
				return;
			}

			for (var i = 0; i < records.length; i++) {
				records[i] = TransferRecord.info(records[i]);
			}

			BaseController.sendOk('获取监控数据成功', records, res);
		});
	},
	getRecords2: function(req, res) {
		var transferid = req.query.transferid;
		var type = req.query.type;

		if (!transferid || !type) {
			BaseController.sendBadParams(res);
			return;
		}

		var values = [];
		if (type === 'open') {
			values.push(8);

		} else if (type === 'collision') {
			values.push(4);

		} else {
			BaseController.sendBadParams(res);
			return;
		}
		values.push(transferid);

		var sql = 'select * from transferRecord where type & ? and transfer_id=? order by recordAt DESC';
		var recordQueryAsync = Promise.promisify(TransferRecord.query);
		recordQueryAsync(sql, values)
			.then(function(records) {
				console.log(records);
				var results = [];
				for (var i = 0; i < records.length; i++) {
					results.push(records[i].recordAt);
				}
				BaseController.sendOk('获取监控数据成功', results, res);

			}, function(err) {
				console.log(err);
			});
	}
};
