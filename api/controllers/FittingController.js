/**
 * FittingController
 *
 * @description :: Server-side logic for managing Fittings
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');

module.exports = {
	create: function(req, res) {
		Fitting.create(req.body).exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				var findParams = {
					fittingid: record.fittingid,
					dbStatus: 'N'
				}
				Fitting.findOne(findParams).populate('hosp_id').exec(function(err, record) {
					if (err) {
						BaseController.sendDbError(err, res);
						return;
					}

					if (record) {
						record.hospital = Hospital.info(record.hosp_id);
						var fitting = Fitting.info(record);
						BaseController.sendOk('新建配件成功', fitting, res);

					} else {
						BaseController.sendDbError('数据库未生成数据', res);
					}
				});

			} else {
				BaseController.sendDbError('数据库未生成数据', res);
			}
		});
	},
	updateFitting: function(req, res) {
		var fittingid = req.params.fittingid;
		var findParams = {
			fittingid: fittingid,
			dbStatus: 'N'
		}
		var updateParams = Fitting.getUpdateParams(req.body);

		if (Object.keys(updateParams).length > 0) {
			updateParams.modifyAt = new Date();
			Fitting.update(findParams, updateParams).exec(function(err, records) {
				if (err) {
					BaseController.sendDbError(err, res);
					return;
				}

				if (records.length > 0) {
					Fitting.findOne(findParams).populate('hosp_id').exec(function(err, record) {
						if (err) {
							BaseController.sendDbError(err, res);
							return;
						}

						if (record) {
							record.hospital = Hospital.info(record.hosp_id);
							var fitting = Fitting.info(record);
							BaseController.sendOk('更新配件成功', fitting, res);

						} else {
							BaseController.sendDbError('数据库未生成数据', res);
						}
					});

				} else {
					BaseController.sendDbError('更新失败，该配件可能已经被删除', res);
				}
			});

		} else {
			BaseController.sendBadParams(res);
		}
	},
	getFirstByFittingid: function(req, res) {
		var fittingid = req.params.fittingid;
		var findParams = {
			fittingid: fittingid,
			dbStatus: 'N'
		}

		Fitting.findOne(findParams).populate('hosp_id').exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				record.hospital = Hospital.info(record.hosp_id);
				var fitting = Fitting.info(record);
				BaseController.sendOk('获取配件信息成功', fitting, res);

			} else {
				BaseController.sendNotFound('未找到该配件，可能已经被删除', res);
			}
		});
	},
	getFittings: function(req, res) {
		var start = req.query.start ? req.query.start : 0;
		var number = req.query.number ? req.query.number : 6;

		var findParams = {
			dbStatus: 'N',
			sort: 'createAt DESC'
		}

		if (req.query.model) {
			findParams.model = {
				'like': '%' + req.query.model + '%'
			}
		}

		if (req.query.status) {
			findParams.status = req.query.status;
		}
		
		// if (req.query.boxNumber) {
		// 	findParams.boxNumber = {
		// 		'like': '%' + req.query.boxNumber + '%'
		// 	}
		// }

		// if (req.query.buyAt) {
		// 	findParams.buyAt = {
		// 		'>': req.query.buyAt
		// 	}
		// }

		Fitting.find(findParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			var fittings = [];
			for (var i = parseInt(start); i < parseInt(start) + parseInt(number); i++) {
				if (i < records.length) {
					var box = records[i];
					fittings.push(Fitting.info(box));

				} else {
					break;
				}
			}

			var info = {
				totalItems: records.length,
				numberOfPages: Math.ceil(parseFloat(records.length) / number),
				fittings: fittings
			}

			BaseController.sendOk('获取配件信息成功', info, res);
		});

		// var findParams = {
		// 	dbStatus: 'N'
		// }
		// if (req.query.hospitalid) {
		// 	findParams.hosp_id = req.query.hospitalid;
		// }

		// Fitting.find(findParams).populate('hosp_id').exec(function(err, records){
		// 	if (err) {
		// 		BaseController.sendDbError(err, res);
		// 		return;
		// 	}

		// 	var fittings = [];
		// 	for (var i = 0; i < records.length; i++) {
		// 		var record = records[i];
		// 		record.hospital = Hospital.info(record.hosp_id);
		// 		var fitting = Fitting.info(record);
		// 		fittings.push(fitting);
		// 	}

		// 	BaseController.sendOk('获取配件成功', fittings, res);
		// });
	},
	deleteFitting: function(req, res) {
		var fittingid = req.params.fittingid;
		var findParams = {
			fittingid: fittingid,
			dbStatus: 'N'
		}
		var updateParams = {
			dbStatus: 'D',
			modifyAt: new Date()
		}

		Fitting.update(findParams, updateParams).exec(function(err, records){
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (records.length > 0) {
				BaseController.sendOk('删除成功', null, res);
				
			} else {
				BaseController.sendNotFound('未找到该配件，可能已经被删除', res);
			}
		});
	}
};