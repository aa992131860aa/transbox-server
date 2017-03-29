/**
 * BoxController
 *
 * @description :: Server-side logic for managing Boxes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');

module.exports = {
	create: function(req, res) {
		Box.create(req.body).exec(function(err, record) {
			if (err) {
				console.log(err);
				BaseController.sendDbError(err, res);
				return;
			}

			var box = Box.info(record);
			BaseController.genQrcodeImage(box.deviceId, function(err, imgName) {
				if (err) {
					console.log('生成箱子二维码图片失败');
					BaseController.sendOk('新建箱子成功', box, res);
					return;
				}

				var findBox = {
					boxid: box.boxid
				}
				var updateBox = {
					qrcode: Base.config.host + '/transbox/transbox-server/public/qr_imgs/' + imgName
				}

				Box.update(findBox, updateBox).exec(function(err, records) {
					if (err) {
						console.log('更新箱子二维码图片失败');
						BaseController.sendOk('新建箱子成功', box, res);
						return;
					}

					if (records.length > 0) {
						var box = Box.info(record);
						BaseController.sendOk('新建箱子成功', box, res);

					} else {
						console.log('更新箱子二维码图片失败');
						BaseController.sendOk('新建箱子成功', box, res);
					}
				});
			});
		});

		// var findParams = {
		// 	hospitalid: req.body.hosp_id,
		// 	dbStatus: 'N'
		// }
		// Hospital.findOne(findParams).exec(function(err, record) {
		// 	if (err) {
		// 		console.log(err);
		// 		BaseController.sendDbError(err, res);
		// 		return;
		// 	}

		// 	if (record) {
		// 		var hosp = Hospital.info(record);
		// 		Box.create(req.body).exec(function(err, record) {
		// 			if (err) {
		// 				console.log(err);
		// 				BaseController.sendDbError(err, res);
		// 				return;
		// 			}

		// 			var box = Box.info(record);
		// 			box.hospital = hosp;
		// 			BaseController.genQrcodeImage(box.boxid, function(err,imgName) {
		// 				if (err) {
		// 					console.log('生成箱子二维码图片失败');
		// 					BaseController.sendOk('新建箱子成功', box, res);
		// 					return;
		// 				}

		// 				var findBox = {
		// 					boxid: box.boxid
		// 				} 
		// 				var updateBox = {
		// 					qrcode: 'http://192.168.0.112:8088/transbox-server/public/qr_imgs/' + imgName
		// 				}

		// 				Box.update(findBox, updateBox).exec(function(err, records) {
		// 					if (err) {
		// 						console.log('更新箱子二维码图片失败');
		// 						BaseController.sendOk('新建箱子成功', box, res);
		// 						return;
		// 					}

		// 					if (records.length > 0) {
		// 						var box = Box.info(record);
		// 						box.hospital = hosp;
		// 						BaseController.sendOk('新建箱子成功', box, res);

		// 					} else {
		// 						console.log('更新箱子二维码图片失败');
		// 						BaseController.sendOk('新建箱子成功', box, res);
		// 					}
		// 				});
		// 			});	
		// 		});

		// 	} else {
		// 		BaseController.sendNotFound('无法找到对应的医院，可能已经被删除', res);
		// 	}
		// });

	},
	getBoxes: function(req, res) {

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

		if (req.query.boxNumber) {
			findParams.boxNumber = {
				'like': '%' + req.query.boxNumber + '%'
			}
		}

		if (req.query.buyAt) {
			findParams.buyAt = {
				'>': req.query.buyAt
			}
		}

		if (req.query.status) {
			findParams.status = req.query.status;
		}

		if (req.query.deviceId) {
			findParams.deviceId = {
				'like': '%' + req.query.deviceId + '%'
			}
		}

		Box.find(findParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			var boxes = [];
			for (var i = parseInt(start); i < parseInt(start) + parseInt(number); i++) {
				if (i < records.length) {
					var box = records[i];
					boxes.push(Box.info(box));

				} else {
					break;
				}
			}

			var info = {
				totalItems: records.length,
				numberOfPages: Math.ceil(parseFloat(records.length) / number),
				boxes: boxes
			}

			BaseController.sendOk('获取箱子信息成功', info, res);
		});
	},
	getBoxesForOptions: function(req, res) {
		var findParams = {
			dbStatus: 'N'
		}

		Box.find(findParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			var boxes = [];
			for (var i = 0; i < records.length; i++) {
				var box = records[i];
				boxes.push(Box.info(box));
			}

			BaseController.sendOk('获取箱子信息成功', boxes, res);
		});
	},
	getFirstByBoxid: function(req, res) {
		var boxid = req.params.boxid;
		var findBoxParams = {
			boxid: boxid,
			dbStatus: 'N'
		}

		Box.findOne(findBoxParams).populate('hosp_id').exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				record.hospital = Hospital.info(record.hosp_id);
				var b = Box.info(record);
				BaseController.sendOk('获取箱子详情成功', b, res);

			} else {
				BaseController.sendNotFound('找不到该箱子，可能已经被删除', res);
			}
		});
	},
	updateBox: function(req, res) {
		var boxid = req.params.boxid;
		var params = Box.getUpdateParams(req.body);

		if (Object.keys(params).length > 0) {
			params.modifyAt = new Date();
			var findParams = {
				boxid: boxid,
				dbStatus: 'N'
			}

			Box.update(findParams, params).exec(function(err, records) {
				if (err) {
					BaseController.sendDbError(err, res);
					return;
				}

				if (records.length > 0) {
					var box = records[0];
					var findParams = {
						boxid: box.boxid,
						dbStatus: 'N'
					}

					Box.findOne(findParams).populate('hosp_id').exec(function(err, record) {
						if (err) {
							BaseController.sendDbError(err, res);
							return;
						}

						if (record) {
							record.hospital = Hospital.info(record.hosp_id);
							var box = Box.info(record);
							BaseController.sendOk('修改箱子信息成功', box, res);

						} else {
							BaseController.sendNotFound('无法找到对应的箱子，可能已经被删除', res);
						}
					});

				} else {
					BaseController.sendNotFound('无法找到对应的箱子，可能已经被删除', res);
				}
			});

		} else {
			BaseController.sendBadParams(res);
		}
	},
	deleteBox: function(req, res) {
		var boxid = req.params.boxid;
		var findParams = {
			boxid: boxid,
			dbStatus: 'N'
		}
		var updateParams = {
			dbStatus: 'D',
			modifyAt: new Date()
		}

		Box.update(findParams, updateParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (records.length > 0) {
				BaseController.sendOk('删除箱子成功', null, res);

			} else {
				BaseController.sendNotFound('无法找到对应的箱子，可能已经被删除', res);
			}
		});
	},
	getBoxInfo: function(req, res) {
		var deviceId = req.query.deviceId;
		if (!deviceId) {
			BaseController.sendBadParams(res);
			return;
		}

		var findBoxParams = {
			deviceId: deviceId,
			dbStatus: 'N'
		}

		Box.findOne(findBoxParams).populate('hosp_id').exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				record.hospital = Hospital.info(record.hosp_id);
				var b = Box.info(record);
				if (b.transferStatus !== 'free') {
					var findTransferParams =  {
						box_id: b.boxid,
						dbStatus: 'N',
						sort: 'createAt DESC',
						status: {
							'!': ['done']
						}
					}

					Transfer.find(findTransferParams).exec(function(err, records) {
						if (err) {
							BaseController.sendNotFound('箱子在使用中，但是无法获取转运单信息', res);
							return;
						}

						if (!records || records.length <= 0) {
							BaseController.sendNotFound('箱子在使用中，但是无法获取转运单信息', res);
							return;
						}

						b.transfer_id = records[0].transferid;
						BaseController.sendOk('获取箱子详情成功', b, res);
					});

				} else {
					BaseController.sendOk('获取箱子详情成功', b, res);
				}

			} else {
				BaseController.sendNotFound('找不到该箱子，可能已经被删除', res);
			}
		});
	},
	androidConnect: function(req, res) {
		if (req.isSocket) {

			var boxid = req.body.boxid;
			var findBox = {
				boxid: boxid,
				dbStatus: 'N'
			}
			Box.findOne(findBox).exec(function(err, record) {
				if (err) {
					BaseController.sendDbError(err, res);
					return;
				}

				if (!record) {
					BaseController.sendNotFound('找不到该箱子，可能已经被删除', res);
					return;
				}


			});

			var ad = {
				boxid: boxid,
				name: 'toky'
			}
			Box.publishCreate(ad, req);

			setTimeout(function() {
				Box.message(boxid, {
					msg: 'hello'
				});

			}, 5000);

		} else {
			console.log('this is not socket req.');
			res.send({
				ok: '777'
			});
		}
	}
};
