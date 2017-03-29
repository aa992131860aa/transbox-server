/**
 * HospitalController
 *
 * @description :: Server-side logic for managing hospitals
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');
var Transaction = require('sails-mysql-transactions').Transaction;
var Promise = require('bluebird');
var EventProxy = require('eventproxy');
var _ = require('lodash');

module.exports = {
	create: function(req, res) {
		Transaction.start(function(err, transaction) {
			if (err) {
				// the first error might even fail to return a transaction object, so double-check. 
				transaction && transaction.rollback();
				BaseController.sendDbError(err, res);
				return;
			}

			var hospitalInfo = req.body.hospitalInfo;
			var createdAccountInfo = {};
			var createdHospInfo = {};

			async.series([function(callback) {
				// create account
				var accountParams = {
					username: hospitalInfo.username
				}
				Account.transact(transaction).create(accountParams).exec(function(err, record) {
					if (err) {
						transaction.rollback();
						callback(err);
						return;
					}

					createdAccountInfo = Account.info(record);
					callback(null, createdAccountInfo);
				});

			}, function(callback) {
				// create hospital
				hospitalInfo.account_id = createdAccountInfo.accountid;

				Hospital.transact(transaction).create(hospitalInfo).exec(function(err, record) {
					if (err) {
						transaction.rollback();
						callback(err);
						return;
					}

					console.log('create hosp:');
					console.log(record);
					createdHospInfo = Hospital.info(record);
					callback(null, createdHospInfo);
				});

			}, function(callback) {
				// create transfer persons
				if (req.body.transferPersons.length > 0) {
					var persons = req.body.transferPersons;
					async.mapSeries(persons, function(person, callback2) {
						console.log('person:' + person);
						var findPersonParams = {
							name: person.name,
							phone: person.phone,
							hosp_id: createdHospInfo.hospitalid
						}
						var createPersonParams = {
							name: person.name,
							phone: person.phone,
							hosp_id: createdHospInfo.hospitalid,
							organType: person.organType
						}
						TransferPerson.transact(transaction).findOrCreate(findPersonParams, createPersonParams).exec(function(err, createdOrFoundRecords) {
							if (err) {
								transaction.rollback();
								callback2(err);
								return;
							}

							callback2(null, createdOrFoundRecords);
						});

					}, function(err, results) {
						if (err) {
							callback(err);
							return;
						}

						callback(null, results);
					});

				} else {
					callback(null, []);
				}

			}, function(callback) {
				//add box to hospital
				if (hospitalInfo.boxes && hospitalInfo.boxes.length > 0) {
					var findBoxParams = {
						dbStatus: 'N',
						boxid: hospitalInfo.boxes
					}

					var updateBoxParams = {
						hospital_id: createdHospInfo.hospitalid
					}

					Box.transact(transaction).update(findBoxParams, updateBoxParams).exec(function(err, records) {
						if (err) {
							transaction.rollback();
							callback(err);
							return;
						}

						if (!records || records.length <= 0) {
							transaction.rollback();
							callback('箱子id错误');
							return;
						}

						callback(null, '分配箱子成功');
					});

				} else {
					callback(null, '没有箱子id');
				}

			}], function(err, results) {
				if (err) {
					BaseController.sendDbError(err, res);
					return;
				}

				transaction.commit();

				var findParams = {
					hospitalid: createdHospInfo.hospitalid,
					dbStatus: 'N'
				}
				Hospital.findOne(findParams).populate('account_id').populate('boxes').populate('fittings').populate('transferPersons').exec(function(err, record) {
					if (err) {
						BaseController.sendDbError(err, res);
						return;
					}

					if (record) {
						console.log('find hosp:');
						console.log(record);
						var hosp = Hospital.detailInfo(record);
						BaseController.sendOk('创建医院成功', record, res);

					} else {
						BaseController.sendNotFound('未找到该医院', res);
					}

				});
			});
		});
	},
	getFirstByHospitalid: function(req, res) {
		var hospitalid = req.params.hospitalid;
		var findParams = {
			hospitalid: hospitalid,
			dbStatus: 'N'
		}
		var findBoxParams = {
			where: {
				hosp_id: hospitalid,
				dbStatus: 'N'
			}
		}
		Hospital.findOne(findParams).populate('account_id').populate('boxes').populate('fittings').populate('transferPersons').exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (record) {
				var hosp = Hospital.detailInfo(record);
				BaseController.sendOk('获取医院详情成功', record, res);

			} else {
				BaseController.sendNotFound('未找到该医院', res);
			}

		});
	},
	getHospitals: function(req, res) {
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

		Hospital.find(findParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			var hospitals = [];
			for (var i = parseInt(start); i < parseInt(start) + parseInt(number); i++) {
				if (i < records.length) {
					var hosp = records[i];
					hospitals.push(Hospital.info(hosp));

				} else {
					break;
				}
			}

			var info = {
				totalItems: records.length,
				numberOfPages: Math.ceil(parseFloat(records.length) / number),
				hospitals: hospitals
			}

			BaseController.sendOk('获取医院成功', info, res);
		});
	},
	updateHospital: function(req, res) {
		var hospitalid = req.params.hospitalid;
		var hospitalInfo = req.body.hospitalInfo;
		var persons = req.body.transferPersons;

		Transaction.start(function(err, transaction) {
			if (err) {
				// the first error might even fail to return a transaction object, so double-check. 
				transaction && transaction.rollback();
				BaseController.sendDbError(err, res);
				return;
			}

			var ep = new EventProxy();

			//update account
			var findAccountParams = {
				dbStatus: 'N',
				username: hospitalInfo.username
			}
			var updateAccountParams = {
				username: hospitalInfo.username
			}

			Account.transact(transaction).update(findAccountParams, updateAccountParams).exec(function(err, records) {
				if (err) {
					transaction.rollback();
					BaseController.sendDbError('无法修改账号信息', res);
					return;
				}

				if (!records || records.length === 0) {
					transaction.rollback();
					BaseController.sendDbError('无法修改账号信息', res);
					return;
				}

				var accountInfo = Account.info(records[0]);
				ep.emit('account', accountInfo);
			});

			//update transfer persons
			ep.once('account', function(accountInfo) {
				async.mapSeries(persons, function(person, callback) {
					if (person.transferPersonid) {
						//update person info
						var findPersonParams = {
							dbStatus: 'N',
							transferPersonid: person.transferPersonid
						}
						var updatePersonParams = {
							organType: person.organType,
							name: person.name,
							phone: person.phone
						}
						TransferPerson.transact(transaction).update(findPersonParams, updatePersonParams).exec(function(err, records) {
							if (err) {
								transaction.rollback();
								callback(err);
								return;
							}

							if (!records || records.length === 0) {
								transaction.rollback();
								callback('更新转运人信息失败');
								return;
							}
							var personInfo = TransferPerson.info(records[0]);
							callback(null, personInfo);
						});

					} else {
						//create a new person
						var createPersonParams = {
							organType: person.organType,
							name: person.name,
							phone: person.phone,
							hosp_id: hospitalid
						}

						console.log(createPersonParams);

						TransferPerson.transact(transaction).create(createPersonParams).exec(function(err, record) {
							if (err) {
								transaction.rollback();
								callback(err);
								return;
							}

							if (!record) {
								transaction.rollback();
								callback(err);
								return;
							}

							var personInfo = TransferPerson.info(record);
							callback(null, personInfo);
						});
					}

				}, function(err, results) {
					if (err) {
						console.log(err);
						BaseController.sendDbError('保存转运人信息失败', res);
						return;
					}

					ep.emit('person', results);
				});
			});

			//update hospital info
			ep.once('person', function(persons) {
				var findHospParams = {
					hospitalid: hospitalid,
					dbStatus: 'N'
				}
				var hospInfo = _.cloneDeep(hospitalInfo);
				delete hospInfo['boxes'];
				Hospital.transact(transaction).update(findHospParams, hospInfo).exec(function(err, records) {
					if (err) {
						console.log(err);
						transaction.rollback();
						BaseController.sendDbError('更新医院信息失败，请检查输入内容是否正确', res);
						return;
					}

					if (!records || records.length === 0) {
						console.log(records);
						transaction.rollback();
						BaseController.sendDbError('更新医院信息失败，请检查输入内容是否正确', res);
						return;
					}

					var hosp = Hospital.info(records[0]);
					ep.emit('hospital', hosp);
				});
			});

			ep.once('hospital', function(hospital) {
				//add box to hospital
				if (hospitalInfo.boxes && hospitalInfo.boxes.length > 0) {
					var findBoxParams = {
						dbStatus: 'N',
						boxid: hospitalInfo.boxes
					}

					var updateBoxParams = {
						hosp_id: hospitalid
					}

					console.log('box params:');
					console.log(updateBoxParams);
					Box.transact(transaction).update(findBoxParams, updateBoxParams).exec(function(err, records) {
						if (err) {
							transaction.rollback();
							BaseController.sendDbError(err, res);
							return;
						}

						if (!records || records.length <= 0) {
							transaction.rollback();
							BaseController.sendDbError('更新箱子信息失败', res);
							return;
						}

						var findHospParams = {
							hospitalid: hospitalid,
							dbStatus: 'N'
						}

						Hospital.transact(transaction).findOne(findHospParams).populate('account_id').populate('boxes').populate('fittings').populate('transferPersons').exec(function(err, record) {
							if (err) {
								transaction.rollback();
								BaseController.sendDbError(err, res);
								return;
							}

							if (record) {
								transaction.commit();
								var hosp = Hospital.detailInfo(record);
								BaseController.sendOk('更新医院信息成功', record, res);

							} else {
								transaction.rollback();
								BaseController.sendNotFound('未找到该医院', res);
							}

						});

					});

				} else {
					
				}
			});
		});
	},
	updatePwd: function(req, res) {
		var hospitalid = req.params.hospitalid;
		var oldPwd = req.body.oldPwd;
		var newPwd = req.body.newPwd;
		var findParams = {
			hospitalid: hospitalid,
			pwd: oldPwd,
			dbStatus: 'N'
		}
		var updateParams = {
			pwd: newPwd
		}

		Hospital.update(findParams, updateParams).exec(function(err, updated) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (updated.length > 0) {
				var hosp = updated[0];
				hosp = Hospital.info(hosp);
				BaseController.sendOk('修改密码成功', hosp, res);

			} else {
				BaseController.sendNotFound('找不到该医院，可能已经被删除', res);
			}
		});
	},
	login: function(req, res) {
		var username = req.body.username;
		var pwd = req.body.pwd;
		var findParams = {
			username: username,
			pwd: pwd,
			dbStatus: 'N'
		}

		Hospital.find(findParams).exec(function(err, records) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (records.length > 0) {
				var hosp = records[0];
				hosp = Hospital.info(hosp);
				BaseController.sendOk('登陆成功', hosp, res);

			} else {
				BaseController.sendNotFound('找不到该医院，可能已经被删除', res);
			}
		});
	},
	deleteHospital: function(req, res) {
		var hospitalid = req.params.hospitalid;
		var findParams = {
			hospitalid: hospitalid,
			dbStatus: 'N'
		}
		var updateParams = {
			dbStatus: 'D'
		}

		Hospital.update(findParams, updateParams).exec(function(err, updated) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (updated.length > 0) {
				BaseController.sendOk('删除医院成功', null, res);

			} else {
				BaseController.sendNotFound('删除医院失败，可能医院已经被删除', res);
			}
		});
	}
};
