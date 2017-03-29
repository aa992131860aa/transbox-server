/**
 * OrganController
 *
 * @description :: Server-side logic for managing Organs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');

module.exports = {
	create: function(req, res) {
		Organ.create(req.body).exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				var organ = Organ.info(record);
				BaseController.sendOk('创建器官成功', organ, res);

			} else {
				BaseController.sendDbError('数据库无法查到新建的器官信息', res);
			}

		});
	},
	getOrgans: function(req, res) {
		var findParams = {
			dbStatus: 'N'
		}

		Organ.find(findParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			var organs = [];
			for (var i = 0; i < records.length; i++) {
				organs.push(Organ.info(records[i]));
			}

			BaseController.sendOk('获取器官成功', organs, res);
		});
	},
	getFirstByOrganid: function(req, res) {
		var organid = req.params.organid;
		var findParams = {
			organid: organid,
			dbStatus: 'N'
		}

		Organ.findOne(findParams).exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				var organ = Organ.info(record);
				BaseController.sendOk('获取器官详情成功', organ, res);

			} else {
				BaseController.sendNotFound('找不到相应的器官，可能已经被删除', res);
			}

		});
	},
	updateOrgan: function(req, res) {
		var organid = req.params.organid;
		var updateParams = Organ.getUpdateParams(req.body);

		if (Object.keys(updateParams).length > 0) {
			var findParams = {
				organid: organid,
				dbStatus: 'N'
			}
			updateParams.modifyAt = new Date();
			Organ.update(findParams, updateParams).exec(function(err, records) {
				if (err) {
					BaseController.sendDbError(err, res);
					return;
				}

				if (records.length > 0) {
					var organ = Organ.info(records[0]);
					BaseController.sendOk('修改器官信息成功', organ, res);

				} else {
					BaseController.sendNotFound('找不到相应的器官，可能已经被删除', res);
				}

			});

		} else {
			BaseController.sendBadParams(res);
		}
	},
	deleteOrgan: function(req, res) {
		var organid = req.params.organid;
		var findParams = {
			organid: organid,
			dbStatus: 'N'
		}
		var updateParams = {
			dbStatus: 'D',
			modifyAt: new Date()
		}

		Organ.update(findParams, updateParams).exec(function(err, records) {
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
	}
};