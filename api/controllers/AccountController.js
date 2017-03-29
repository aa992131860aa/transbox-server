/**
 * AccountController
 *
 * @description :: Server-side logic for managing Accounts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');
var Transaction = require('sails-mysql-transactions').Transaction;

module.exports = {
	login: function(req, res) {
		var username = req.body.username;
		var pwd = req.body.pwd;

		if (Base.isEmptyString(username) || Base.isEmptyString(pwd)) {
			BaseController.sendBadParams('参数有误，请检查参数', res);
			return;
		}

		pwd = SecurityService.hmacSha256String(pwd);
		var findParams = {
			username: username,
			pwd: pwd,
			dbStatus: 'N'
		}

		Account.findOne(findParams).exec(function(err, record) {
			if (err) {
				console.log(err);
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				switch (record.type) {
					case 'hospital':
						{
							Account.findOne(findParams).populate('hospitals').exec(function(err, record) {
								if (err) {
									BaseController.sendDbError(err, res);
									return;
								}

								if (record) {
									if (record.hospitals.length > 0) {
										var hosp = record.hospitals[0];
										hosp = Hospital.info(hosp);
										record.hospital = hosp;
									}
									var account = Account.info(record);
									// var options = {
									// 	signed: true
									// }
									// res.cookie('apple1', account.accountid);
									// res.cookie('type1', account.type);

									BaseController.sendOk('登陆成功', account, res);

								} else {
									BaseController.sendNotFound('用户名或密码错误', res);
								}
							});
							break;
						}
					case 'admin':
						{
							// var account = Account.info(record);
							// var options = {
							// 	signed: true
							// }
							// res.cookie('apple1', account.accountid, options);
							// res.cookie('type1', account.type);

							BaseController.sendOk('登陆成功', record, res);
							break;
						}
					default:
						{
							BaseController.sendOk('登陆成功', account, res);
							break;
						}
				}

			} else {
				BaseController.sendNotFound('用户名或密码错误', res);
			}
		});
	},
	updatePwd: function(req, res) {
		var pwd = req.body.pwd;
		var accountid = req.body.accountid;

		if (!pwd || !pwd) {
			BaseController.sendBadParams(res);
			return;
		}

		var findParams = {
			dbStatus: 'N',
			accountid: accountid
		}

		pwd = SecurityService.hmacSha256String(pwd);
		var updateParams = {
			pwd: pwd
		}

		Account.update(findParams, updateParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (!records || records.length <= 0) {
				BaseController.sendDbError(err, res);
				return;
			}

			var info = Account.info(records[0]);
			BaseController.sendOk('修改密码成功', info, res);
		});
	},
	getFirstByAccountid: function(req, res) {
		var findParams = {
			dbStatus: 'N',
			accountid: req.params.accountid
		}

		Account.findOne(findParams).populate('hospitals').exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (!record) {
				BaseController.sendNotFound('未找到该账号', res);
				return;
			}

			var accountInfo = Account.info(record);
			BaseController.sendOk('获取账号信息成功', accountInfo, res);
		});
	},
	resetPwds: function(req, res) {
		var accountIds = req.body.accountIds;
		if (!accountIds || accountIds.length <= 0) {
			BaseController.sendBadParams(res);
			return;
		}

		Transaction.start(function(err, transaction) {
			console.log('start transation');
			if (err) {
				// the first error might even fail to return a transaction object, so double-check.
				transaction && transaction.rollback();
				BaseController.sendDbError(err, res);
				return;
			}

			async.map(accountIds, function(accountid, callback) {
				var findParams = {
					dbStatus: 'N',
					accountid: accountid
				}
				var updateParams = {
					pwd: SecurityService.hmacSha256String('123456')
				}

				Account.transact(transaction).update(findParams, updateParams).exec(function(err, records) {
					if (err) {
						transaction.rollback();
						callback(err);
						return;
					}

					if (!records || records.length <= 0) {
						transaction.rollback();
						callback('账号id错误');
						return;
					}

					// var accountInfo = Account.info(records[0]);
					callback(null, '重置密码成功');
				});

			}, function(err, results) {
				if (err) {
					BaseController.sendDbError(err, res);
					return;
				}

				transaction.commit();
				BaseController.sendOk('重置密码成功', results, res);
			});
		});

	}
};