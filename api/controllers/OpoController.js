/**
 * OpoController
 *
 * @description :: Server-side logic for managing Opoes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');

module.exports = {
	create: function(req, res) {
		Opo.create(req.body).exec(function(err, record){
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				var opo = Opo.info(record);
				BaseController.sendOk('新建opo成功', opo, res);

			} else {
				BaseController.sendDbError('数据库未生成数据', res);
			}
		});
	},
	updateOpo: function(req, res) {
		var opoid = req.params.opoid;
		var findOpoParams = {
			opoid: opoid,
			dbStatus: 'N'
		}
		Opo.update(findOpoParams, req.body).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (!records || records.length === 0) {
				BaseController.sendDbError('更新失败，请检查填写内容是否正确', res);
				return;
			}

			var opoInfo = Opo.info(records[0]);
			BaseController.sendOk('更新OPO信息成功', opoInfo, res);
		});
	},
	deleteOpo: function(req, res) {
		var opoid = req.params.opoid;
		var findParams = {
			opoid: opoid,
			dbStatus: 'N'
		}
		var updateParams = {
			dbStatus: 'D',
			modifyAt: new Date()
		}

		Opo.update(findParams, updateParams).exec(function(err, records){
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (records.length > 0) {
				BaseController.sendOk('删除opo成功', null, res);

			} else {
				BaseController.sendNotFound('找不到该opo，可能已经被删除', res);
			}
		});
	},
	getOpos: function(req, res) {

		var start = req.query.start ? req.query.start : 0;
		var number = req.query.number ? req.query.number : 6;

		var findParams = {
			dbStatus: 'N',
			sort: 'createAt DESC'
		}

		if (req.query.name) {
			findParams.name = {
				'like': '%' + req.query.name + '%'
			}
		}

		if (req.query.district) {
			findParams.district = {
				'like': '%' + req.query.district + '%'
			}
		}

		if (req.query.address) {
			findParams.address = {
				'like': '%' + req.query.address + '%'
			}
		}

		Opo.find(findParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			var opos = [];
			for (var i = parseInt(start); i < parseInt(start) + parseInt(number); i++) {
				if (i < records.length) {
					var hosp = records[i];
					opos.push(Opo.info(hosp));

				} else {
					break;
				}
			}

			var info = {
				totalItems: records.length,
				numberOfPages: Math.ceil(parseFloat(records.length) / number),
				opos: opos
			}

			BaseController.sendOk('获取OPO成功', info, res);
		});
	},
	getOpos2: function(req, res) {
		var findParams = {
			dbStatus: 'N'
		}

		Opo.find(findParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			var opos = [];
			for (var i = 0; i < records.length; i++) {
				var o = Opo.info(records[i]);
				opos.push(o);
			}

			BaseController.sendOk('获取opo信息成功', opos, res);
		});
	}
};

