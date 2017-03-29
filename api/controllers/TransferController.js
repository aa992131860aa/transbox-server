/**
 * TransferController
 *
 * @description :: Server-side logic for managing Transfers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');
var Transaction = require('sails-mysql-transactions').Transaction;
var EventProxy = require('eventproxy');

// addSelf
var express = require('express');
var app = express();

var mysql = require('mysql');
//配置模块
var settings = {};

//导出
var officegen = require('officegen');
var fs = require('fs');
var path = require('path');
var docx = officegen('docx');
var async = require('async');

module.exports = {
  create: function (req, res) {
    console.log('create a new transfer.' + (new Date()));
    if (!Transfer.isCreateParamsOk(req.body)) {
      BaseController.sendBadParams(res);
      return;
    }

    console.log('params is correct.');

    //request params
    var baseInfo = req.body.baseInfo;
    var to = req.body.to;
    var person = req.body.person;
    var organ = req.body.organ;
    var opo = req.body.opo;

    //object from db
    var boxInfoDb = {};
    var organInfoDb = {};
    var personInfoDb = {};
    var opoInfoDb = {};

    Transaction.start(function (err, transaction) {
      console.log('start transation');
      if (err) {
        // the first error might even fail to return a transaction object, so double-check.
        transaction && transaction.rollback();
        BaseController.sendDbError(err, res);
        return;
      }

      var createParams = {};
      var ep = new EventProxy();

      /* =============== step1: get box info =============== */
      var findBoxParams = {
        boxid: baseInfo.box_id,
        dbStatus: 'N',
        transferStatus: 'free'
      }
      Box.transact(transaction).findOne(findBoxParams).populate('hosp_id').exec(function (err, record) {
        console.log('step1');
        if (err) {
          transaction.rollback();
          BaseController.sendDbError(err, res);
          return;
        }

        if (!record) {
          transaction.rollback();
          BaseController.sendNotFound('创建转运失败，该箱子目前不能使用或已经被删除', res);
          return;
        }

        // the box is free
        record.hospital = Hospital.info(record.hosp_id);
        var boxInfo = Box.info(record);
        boxInfoDb = boxInfo;
        ep.emit('box', boxInfo);
      });


      /* =============== step2: get organ info =============== */
      ep.once('box', function (boxInfo) {
        console.log('step2');
        if (organ.dataType === 'db') {
          var findOrgan = {
            organid: organ.organid,
            dbStatus: 'N'
          }
          var updateOrgan = Organ.getUpdateParams(organ);
          if (Object.keys(updateOrgan).length > 0) {
            Organ.transact(transaction).update(findOrgan, updateOrgan).exec(function (err, records) {
              if (err) {
                transaction.rollback();
                BaseController.sendDbError(err, res);
                return;
              }

              if (records.length > 0) {
                Organ.transact(transaction).findOne(findOrgan).exec(function (err, record) {
                  if (err) {
                    transaction.rollback();
                    BaseController.sendDbError(err, res);
                    return;
                  }

                  if (!record) {
                    transaction.rollback();
                    BaseController.sendDbError('无法获取器官信息', res);
                    return;
                  }

                  var organInfo = Organ.info(record);
                  ep.emit('organ', organInfo);
                });

              } else {
                transaction.rollback();
                BaseController.sendDbError('修改器官信息失败', res);
              }
            });

          } else {
            Organ.transact(transaction).findOne(findOrgan).exec(function (err, record) {
              if (err) {
                transaction.rollback();
                BaseController.sendDbError(err, res);
                return;
              }

              if (!record) {
                transaction.rollback();
                BaseController.sendDbError('无法获取器官信息', res);
                return;
              }

              var organInfo = Organ.info(record);
              ep.emit('organ', organInfo);
            });
          }

        } else {
          //create a organ record
          var createOrganParams = {
            segNumber: organ.segNumber,
            type: organ.type,
            bloodType: organ.bloodType,
            bloodSampleCount: organ.bloodSampleCount,
            organizationSampleType: organ.organizationSampleType,
            organizationSampleCount: organ.organizationSampleCount
          }

          Organ.transact(transaction).create(createOrganParams).exec(function (err, record) {
            if (err) {
              transaction.rollback();
              BaseController.sendDbError(err, res);
              return;
            }

            if (!record) {
              transaction.rollback();
              BaseController.sendDbError('无法新建器官信息', res);
              return;
            }

            var organInfo = Organ.info(record);
            ep.emit('organ', organInfo);
          });
        }
      });

      /* =============== step3: get transfer person info =============== */
      ep.once('organ', function (organInfo) {
        console.log('step3');
        if (person.dataType === 'db') {
          var findPersonParams = {
            transferPersonid: person.transferPersonid,
            dbStatus: 'N'
          }
          TransferPerson.transact(transaction).findOne(findPersonParams).exec(function (err, record) {
            if (err) {
              transaction.rollback();
              BaseController.sendDbError(err, res);
              return;
            }

            if (!record) {
              transaction.rollback();
              BaseController.sendDbError('无法获取该转运人信息', res);
              return;
            }

            var personInfo = TransferPerson.info(record);
            ep.emit('person', personInfo);
          });

        } else {
          //create a new transfer person
          var createPersonParams = {
            name: person.name,
            phone: person.phone,
            organType: organInfo.type,
            hosp_id: boxInfoDb.hospital.hospitalid
          }

          TransferPerson.transact(transaction).create(createPersonParams).exec(function (err, record) {
            if (err) {
              transaction.rollback();
              BaseController.sendDbError(err, res);
              return;
            }

            if (!record) {
              transaction.rollback();
              BaseController.sendDbError('无法创建转运人信息', res);
              return;
            }

            var personInfo = TransferPerson.info(record);
            ep.emit('person', personInfo);
          });
        }
      });

      /* =============== step4: get opo info =============== */
      ep.once('person', function (personInfo) {
        console.log('step4');
        if (opo.dataType === 'db') {
          var findOpo = {
            opoid: opo.opoid,
            dbStatus: 'N'
          }

          var updateOpo = Opo.getUpdateParams(opo);
          if (Object.keys(updateOpo).length > 0) {
            Opo.transact(transaction).update(findOpo, updateOpo).exec(function (err, records) {
              if (err) {
                transaction.rollback();
                BaseController.sendDbError(err, res);
                return;
              }

              if (records.length > 0) {
                Opo.transact(transaction).findOne(findOpo).exec(function (err, record) {
                  if (err) {
                    transaction.rollback();
                    BaseController.sendDbError(err, res);
                    return;
                  }

                  if (!record) {
                    transaction.rollback();
                    BaseController.sendDbError('无法获取opo信息', res);
                    return;
                  }

                  var opoInfo = Opo.info(record);
                  ep.emit('opo', opoInfo);
                });

              } else {
                transaction.rollback();
                BaseController.sendDbError('无法获取opo信息', res);
              }
            });

          } else {
            Opo.transact(transaction).findOne(findOpo).exec(function (err, record) {
              if (err) {
                transaction.rollback();
                BaseController.sendDbError(err, res);
                return;
              }

              if (!record) {
                transaction.rollback();
                BaseController.sendDbError('无法获取opo信息', res);
                return;
              }

              var opoInfo = Opo.info(record);
              ep.emit('opo', opoInfo);
            });
          }

        } else {
          //create a new opo
          var updateOpo = Opo.getUpdateParams(opo);
          if (Object.keys(updateOpo).length > 0) {
            Opo.transact(transaction).create(updateOpo).exec(function (err, record) {
              if (err) {
                transaction.rollback();
                BaseController.sendDbError(err, res);
                return;
              }

              if (!record) {
                transaction.rollback();
                BaseController.sendDbError('无法获取opo信息', res);
                return;
              }

              var opoInfo = Opo.info(record);
              ep.emit('opo', opoInfo);
            });

          } else {
            transaction.rollback();
            BaseController.sendDbError('opo参数有误', res);
          }
        }
      });

      /* =============== step5: update box status =============== */
      ep.once('opo', function (opoInfo) {
        console.log('step5');
        var findBox = {
          boxid: boxInfoDb.boxid,
          dbStatus: 'N'
        }
        var updateBox = {
          transferStatus: 'transfering'
        }
        Box.transact(transaction).update(findBox, updateBox).exec(function (err, records) {
          if (err) {
            transaction.rollback();
            BaseController.sendDbError(err, res);
            return;
          }

          if (records.length > 0) {
            var boxInfo2 = Box.info(records[0]);
            ep.emit('boxUpdated', boxInfo2);

          } else {
            transaction.rollback();
            BaseController.sendDbError('更新箱子状态失败', res);
          }
        });
      });

      /* =============== step6: create a new transfer =============== */
      ep.all('box', 'organ', 'person', 'opo', 'boxUpdated', function (boxInfo, organInfo, personInfo, opoInfo, boxInfo2) {
        console.log('step6');
        //base info
        for (var key in baseInfo) {
          createParams[key] = baseInfo[key];
        }

        //to info
        createParams.to_hosp_id = boxInfo.hospital.hospitalid;
        if (to.dataType === 'new') {
          createParams.toHospName = to.toHospName;
        }

        //person info
        createParams.transferPerson_id = personInfo.transferPersonid;

        //organ info
        createParams.organ_id = organInfo.organid;

        //opo info
        createParams.opo_id = opoInfo.opoid;

        Transfer.transact(transaction).create(createParams).exec(function (err, record) {
          if (err) {
            transaction.rollback();
            BaseController.sendDbError(err, res);
            return;
          }

          if (!record) {
            transaction.rollback();
            BaseController.sendDbError('创建转运失败', res);

          } else {
            var findParams = {
              transferid: record.transferid,
              dbStatus: 'N'
            }
            Transfer.transact(transaction).findOne(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').exec(function (err, record) {
              if (err) {
                transaction.rollback();
                BaseController.sendDbError(err, res);
                return;
              }

              if (!record) {
                transaction.rollback();
                BaseController.sendDbError('创建转运失败', res);
                return;
              }

              transaction.commit();
              var transferInfo = Transfer.detailInfo(record);
              BaseController.sendOk('新建转运成功', transferInfo, res);
              //socket event
              if (transferInfo.deviceType === 'web') {
                console.log(transferInfo);
                sails.sockets.broadcast(transferInfo.boxInfo.boxid, 'created', transferInfo);
              }
              //send msg
              // var params = {
              //     transferNumber: transferInfo.transferNumber,
              //     segNumber: transferInfo.organInfo.segNumber,
              //     url: Base.config.host + '/transbox/transportHtml/index.html',
              //     type: 'create'
              // }
              // MSMService.sendMsg(transferInfo.transferPersonInfo.phone, params);
            });
          }
        });
      });
    });
  },
  getFirstByTransferid: function (req, res) {
    var transferid = req.params.transferid;
    var findParams = {
      transferid: transferid,
      dbStatus: 'N'
    }

    Transfer.findOne(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').exec(function (err, record) {
      if (err) {
        BaseController.sendDbError(err, res);
        return;
      }

      if (!record) {
        BaseController.sendNotFound('找不到该转运信息', res);
        return;
      }

      var transferInfo = Transfer.detailInfo(record);
      BaseController.sendOk('获取转运信息成功', transferInfo, res);
    });
  },
  getInfo: function (req, res) {
    var transferNumber = req.query.transferNumber;
    var organSegNumber = req.query.organSegNumber;

    if (!transferNumber || !organSegNumber) {
      BaseController.sendBadParams(res);
      return;
    }

    async.series([function (callback) {
      console.log('step1');
      //get organ info by organ segment number
      var findOrgan = {
        segNumber: organSegNumber,
        dbStatus: 'N'
      }
      Organ.findOne(findOrgan).exec(function (err, record) {
        if (err) {
          BaseController.sendDbError(err, res);
          return;
        }

        if (!record) {
          BaseController.sendNotFound('器官段号有误', res);
          return;
        }

        callback(null, 'organ');
      });

    }, function (callback) {
      console.log('step2');
      //get transfer info by transfer number
      var findParams = {
        transferNumber: transferNumber,
        dbStatus: 'N'
      }

      Transfer.findOne(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').populate('records', {
        sort: 'recordAt'
      }).exec(function (err, record) {
        if (err) {
          BaseController.sendDbError(err, res);
          return;
        }

        if (!record) {
          BaseController.sendNotFound('找不到该转运信息', res);
          return;
        }


        var transferInfo = Transfer.detailInfo(record);
        BaseController.sendOk('获取转运信息成功', transferInfo, res);

        callback(null, 'transfer');
      });

    }], function (err, results) {

    });
  },
  transferDone: function (req, res) {
    console.log('transfer done ....');
    var transferid = req.params.transferid;

    Transaction.start(function (err, transaction) {
      if (err) {
        console.log('666:' + err);
        // the first error might even fail to return a transaction object, so double-check.
        transaction && transaction.rollback();
        BaseController.sendDbError(err, res);
        return;
      }

      var ep = new EventProxy();

      /* =============== step1: get transfer info =============== */
      var findParams = {
        transferid: transferid,
        status: {
          '!': ['done']
        }
      }

      Transfer.transact(transaction).findOne(findParams).exec(function (err, record) {
        if (err) {
          transaction.rollback();
          BaseController.sendDbError(err, res);
          return;
        }

        if (!record) {
          transaction.rollback();
          BaseController.sendNotFound('找不到符合条件的转运信息', res);
          return;
        }

        var transferInfo = Transfer.info(record);
        ep.emit('transfer', transferInfo);
      });

      /* =============== step2: update box info =============== */
      ep.once('transfer', function (transferInfo) {
        var findBox = {
          boxid: transferInfo.box_id,
          transferStatus: {
            '!': ['free']
          },
          dbStatus: 'N'
        }

        var updateBox = {
          transferStatus: 'free'
        }

        Box.transact(transaction).update(findBox, updateBox).exec(function (err, records) {
          if (err) {
            transaction.rollback();
            BaseController.sendDbError(err, res);
            return;
          }

          if (records.length > 0) {
            var boxInfo = Box.info(records[0]);
            ep.emit('box', boxInfo);

          } else {
            transaction.rollback();
            BaseController.sendDbError('无法更新该转运对应箱子的状态', res);
          }
        });
      });

      /* =============== step3: update transfer info =============== */
      ep.once('box', function (boxInfo) {
        var updateParams = {
          status: 'done',
          endAt: new Date()
        }
        Transfer.transact(transaction).update(findParams, updateParams).exec(function (err, records) {
          if (err) {
            transaction.rollback();
            BaseController.sendDbError(err, res);
            return;
          }

          if (records.length > 0) {

            var transferInfo = Transfer.info(records[0]);

            var findParams = {
              dbStatus: 'N',
              transferid: transferInfo.transferid
            }
            Transfer.transact(transaction).findOne(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').exec(function (err, record) {
              if (err) {
                transaction.rollback();
                BaseController.sendDbError(err, res);
                return;
              }

              if (!record) {
                transaction.rollback();
                BaseController.sendNotFound('找不到该转运信息', res);
                return;
              }

              transaction.commit();
              var transferInfo = Transfer.detailInfo(record);
              BaseController.sendOk('更新转运状态成功', transferInfo, res);

              //send msg
              // var params = {
              //     transferNumber: transferInfo.transferNumber,
              //     segNumber: transferInfo.organInfo.segNumber,
              //     url: Base.config.host + '/transbox/transportHtml/index.html',
              //     type: 'done'
              // }
              // MSMService.sendMsg(transferInfo.transferPersonInfo.phone, params);

            });

          } else {
            transaction.rollback();
            BaseController.sendDbError('无法更新该转运的状态', res);
          }
        });
      });
    });
  },
  getTransfersSql: function (req, res) {
    var start = req.query.start ? req.query.start : 0;
    var number = req.query.number ? req.query.number : 6;

    var findParams = {
      dbStatus: 'N',
      sort: 'createAt DESC'
    }

    if (req.query.type) {
      if (req.query.type === 'transfering') {
        findParams.status = {
          '!': ['done']
        }

      } else {
        findParams.status = req.query.type;
      }
    }

    if (req.query.transferNumber) {
      findParams.transferNumber = {
        'like': '%' + req.query.transferNumber + '%'
      }
    }

    if (req.query.fromCity) {
      findParams.fromCity = req.query.fromCity;
    }

    if (req.query.beginDate && req.query.endDate) {
      findParams.startAt = {
        '>=': req.query.beginDate + ' 00:00:00',
        '<=': req.query.endDate + ' 23:59:59'
      }

    } else if (req.query.beginDate) {
      findParams.startAt = {
        '>=': req.query.beginDate + ' 00:00:00'
      }

    } else if (req.query.endDate) {
      findParams.startAt = {
        '<=': req.query.endDate + ' 23:59:59'
      }
    }

    var hospIds = [];
    var organIds = [];
    var personIds = [];

    async.series([function (callback) {
      //find hospitals
      if (req.query.toHospitalName) {
        var findHospParams = {
          dbStatus: 'N',
          name: {
            'like': '%' + req.query.toHospitalName + '%'
          }
        }
        console.log('hospitals:' + req.query.toHospitalName);
        Hospital.find(findHospParams).exec(function (err, records) {
          if (err) {
            return callback(err);
          }

          if (records && records.length > 0) {
            for (var i = 0; i < records.length; i++) {
              hospIds.push(records[i].hospitalid);
            }

            return callback(null, hospIds);

          } else {
            return callback(null);
          }
        });

      } else {
        callback(null);
      }

    }, function (callback) {
      //find organs
      if (!req.query.organSegNumber && !req.query.organType) {
        callback(null);
      } else {
        var findOrganParams = {
          dbStatus: 'N'
        }

        if (req.query.organSegNumber) {
          findOrganParams.segNumber = {
            'like': '%' + req.query.organSegNumber + '%'
          };
        }

        if (req.query.organType) {
          findOrganParams.type = {
            'like': '%' + req.query.organType + '%'
          };
        }
        console.log('organs:' + req.query.organSegNumber + "," + req.query.organType);
        Organ.find(findOrganParams).exec(function (err, records) {
          if (err) {
            return callback(err);
          }

          if (records && records.length > 0) {
            for (var i = 0; i < records.length; i++) {
              organIds.push(records[i].organid);
            }

            return callback(null, organIds);

          } else {
            return callback(null);
          }
        });
      }

    }, function (callback) {
      //find transfer persons
      if (req.query.transferPersonName) {
        var findPersonParams = {
          dbStatus: 'N',
          name: req.query.transferPersonName
        }
        console.log('persons:' + req.query.transferPersonName);
        TransferPerson.find(findPersonParams).exec(function (err, records) {
          if (err) {
            return callback(err);
          }

          if (records && records.length > 0) {
            for (var i = 0; i < records.length; i++) {
              personIds.push(records[i].transferPersonid);
            }

            return callback(null, personIds);

          } else {
            return callback(null);
          }
        });

      } else {
        return callback(null);
      }

    }], function (err, results) {
      if (err) {
        BaseController.sendDbError(err, res);
        return;
      }

      if (hospIds.length > 0) {
        findParams.to_hosp_id = hospIds;
      }

      if (organIds.length > 0) {
        findParams.organ_id = organIds;
      }

      if (personIds.length > 0) {
        findParams.transferPerson_id = personIds;
      }

      if (req.query.hospitalid) {
        findParams.to_hosp_id = req.query.hospitalid;
      }

      console.log(findParams);

      //连接数据库
      settings.db = {
        host: 'localhost',
        user: 'root',
        password: '123456',
        database: 'transbox'
      }
      var connection = mysql.createConnection(settings.db);
      connection.connect();
      var count = 20;
      //查询
      var selectSQL = 'select t.transferid t_transferid,t.transferNumber t_transferNumber,t.organCount t_organCount,' +
        't.boxPin t_boxPin, t.fromCity t_fromCity,t.toHospName t_toHospName,t.tracfficType t_tracfficType,t.deviceType' +
        ' t_deviceType,t.getOrganAt t_getOrganAt,t.startAt t_startAt,t.endAt t_endAt,t.`status` t_status,t.createAt ' +
        't_createAt,t.modifyAt t_modifyAt,b.boxid b_boxid,b.deviceId b_deviceId,b.qrcode b_qrcode,b.model b_model,' +
        'b.transferStatus b_transferStatus,b.`status` b_status,b.createAt b_createAt,b.modifyAt b_modifyAt' +
        ',o.organid o_organid,o.segNumber o_segNumber,o.type o_type,o.bloodType o_bloodType,o.bloodSampleCount' +
        ' o_bloodSampleCount,o.organizationSampleType o_organizationSampleType,o.organizationSampleCount ' +
        'o_organizationSampleCount,o.createAt o_createAt,o.modifyAt o_modifyAt,h.hospitalid h_hospitalid,h.`name`' +
        ' h_name,h.district h_district,h.address h_address,h.grade h_grade,h.remark h_remark,h.`status` h_status,' +
        'h.createAt h_createAt,h.modifyAt h_modifyAt,h.account_id h_account_id,tp.transferPersonid tp_transferPersonid,' +
        'tp.`name` tp_name,tp.phone tp_phone,tp.organType tp_organType,tp.createAt tp_createAt,tp.modifyAt tp_modifyAt,' +
        'op.opoid op_opoid,op.`name` op_name,op.district op_district,op.address op_address,op.grade op_grade,' +
        'op.contactPerson op_contactPerson,op.contactPhone op_contactPhone,op.remark op_remark,op.createAt ' +
        'op_createAt,op.modifyAt op_modifyAt from transfer t,organ o,box b,hospital h,transferperson tp,opo op where ' +
        't.dbStatus = "N" and t.`status` = "done" and b.boxid = t.box_id and h.hospitalid = t.to_hosp_id and o.organid ' +
        '= t.organ_id and tp.transferPersonid = t.transferPerson_id and op.opoid = t.opo_id ORDER BY t.createAt' +
        ' DESC limit ' + start + ',' + number;


      var selectCount = 'select count(t.transferid) count from transfer t,organ o,box b,hospital h,transferperson tp,opo' +
        ' op where t.dbStatus = "N" and t.`status` = "done" and b.boxid = t.box_id and h.hospitalid = t.to_hosp_id ' +
        'and o.organid = t.organ_id and tp.transferPersonid = t.transferPerson_id and op.opoid = t.opo_id ';
      connection.query(selectCount, function (err, rows) {
        if (err) throw err;
        count = rows[0]['count'];


      });
      connection.query(selectSQL, function (err, rows) {
        if (err) throw err;
        //for (var i = 0; i < rows.length; i++) {
        //  arr[i] = rows[i].name;
        //
        //}
        var transfers = [];

        for (var i = 0; i < rows.length; i++) {


          var transbox = new Object();
          var boxInfo = new Object();
          var organInfo = new Object();
          var toHospitalInfo = new Object();
          var transferPersonInfo = new Object();
          var opoInfo = new Object();
          transbox.transferid = rows[i]['t_transferid'];
          transbox.transferNumber = rows[i]['t_transferNumber'];
          transbox.organCount = rows[i]['t_organCount'];
          transbox.boxPin = rows[i]['t_boxPin'];
          transbox.fromCity = rows[i]['t_fromCity'];
          transbox.toHospName = rows[i]['t_toHospName'];
          transbox.tracfficType = rows[i]['t_tracfficType'];
          transbox.deviceType = rows[i]['t_deviceType'];
          transbox.getOrganAt = rows[i]['t_getOrganAt'];
          transbox.startAt = rows[i]['t_startAt'];
          transbox.endAt = rows[i]['t_endAt'];
          transbox.status = rows[i]['t_status'];
          transbox.createAt = rows[i]['t_createAt'];
          transbox.modifyAt = rows[i]['t_modifyAt'];

          boxInfo.boxid = rows[i]['b_boxid'];
          boxInfo.deviceId = rows[i]['b_deviceId'];
          boxInfo.qrcode = rows[i]['b_qrcode'];
          boxInfo.model = rows[i]['b_model'];
          boxInfo.transferStatus = rows[i]['b_transferStatus'];
          boxInfo.status = rows[i]['b_status'];
          boxInfo.createAt = rows[i]['b_createAt'];
          boxInfo.modifyAt = rows[i]['b_modifyAt'];
          transbox.boxInfo = boxInfo;

          organInfo.organid = rows[i]['o_organid'];
          organInfo.segNumber = rows[i]['o_segNumber'];
          organInfo.type = rows[i]['o_type'];
          organInfo.bloodType = rows[i]['o_bloodType'];
          organInfo.bloodSampleCount = rows[i]['o_bloodSampleCount'];
          organInfo.organizationSampleType = rows[i]['o_organizationSampleType'];
          organInfo.organizationSampleCount = rows[i]['o_organizationSampleCount'];
          organInfo.createAt = rows[i]['o_createAt'];
          organInfo.modifyAt = rows[i]['o_modifyAt'];
          transbox.organInfo = organInfo;

          toHospitalInfo.hospitalid = rows[i]['h_hospitalid'];
          toHospitalInfo.name = rows[i]['h_name'];
          toHospitalInfo.district = rows[i]['h_district'];
          toHospitalInfo.address = rows[i]['h_address'];
          toHospitalInfo.grade = rows[i]['h_grade'];
          toHospitalInfo.remark = rows[i]['h_remark'];
          toHospitalInfo.status = rows[i]['h_status'];
          toHospitalInfo.createAt = rows[i]['h_createAt'];
          toHospitalInfo.modifyAt = rows[i]['h_modifyAt'];
          toHospitalInfo.account_id = rows[i]['h_account_id'];
          transbox.toHospitalInfo = toHospitalInfo;

          transferPersonInfo.transferPersonid = rows[i]['tp_transferPersonid'];
          transferPersonInfo.name = rows[i]['tp_name'];
          transferPersonInfo.phone = rows[i]['tp_phone'];
          transferPersonInfo.organType = rows[i]['tp_organType'];
          transferPersonInfo.createAt = rows[i]['tp_createAt'];
          transferPersonInfo.modifyAt = rows[i]['tp_modifyAt'];
          transbox.transferPersonInfo = transferPersonInfo;

          opoInfo.opoid = rows[i]['op_opoid'];
          opoInfo.name = rows[i]['op_name'];
          opoInfo.district = rows[i]['op_district'];
          opoInfo.address = rows[i]['op_address'];
          opoInfo.grade = rows[i]['op_grade'];
          opoInfo.contactPerson = rows[i]['op_contactPerson'];
          opoInfo.contactPhone = rows[i]['op_contactPhone'];
          opoInfo.remark = rows[i]['op_remark'];
          opoInfo.createAt = rows[i]['op_createAt'];
          opoInfo.modifyAt = rows[i]['op_modifyAt'];
          transbox.opoInfo = opoInfo;
          transfers.push(transbox);


        }


        //transfers = JSON.stringify(transfers);
        //transfers =JSON.parse(transfers);
        //console.log(transfers);
        var info = {
          totalItems: count,
          numberOfPages: Math.ceil(parseFloat(count) / number),
          transfers: transfers
        }

        BaseController.sendOk('获取转运信息成功', info, res);
        console.log("mysql query");
        //把搜索值输出
        //app.get('/', function (req, res) {
        //  res.send(arr);
        //});


      });

      //关闭连接
      connection.end();


    });

  },
  getTransfers: function (req, res) {
    var start = req.query.start ? req.query.start : 0;
    var number = req.query.number ? req.query.number : 6;

    var findParams = {
      dbStatus: 'N',
      sort: 'createAt DESC'
    }

    if (req.query.type) {
      if (req.query.type === 'transfering') {
        findParams.status = {
          '!': ['done']
        }

      } else {
        findParams.status = req.query.type;
      }
    }

    if (req.query.transferNumber) {
      findParams.transferNumber = {
        'like': '%' + req.query.transferNumber + '%'
      }
    }

    if (req.query.fromCity) {
      findParams.fromCity = req.query.fromCity;
    }

    if (req.query.beginDate && req.query.endDate) {
      findParams.startAt = {
        '>=': req.query.beginDate + ' 00:00:00',
        '<=': req.query.endDate + ' 23:59:59'
      }

    } else if (req.query.beginDate) {
      findParams.startAt = {
        '>=': req.query.beginDate + ' 00:00:00'
      }

    } else if (req.query.endDate) {
      findParams.startAt = {
        '<=': req.query.endDate + ' 23:59:59'
      }
    }

    var hospIds = [];
    var organIds = [];
    var personIds = [];

    async.series([function (callback) {
      //find hospitals
      if (req.query.toHospitalName) {
        var findHospParams = {
          dbStatus: 'N',
          name: {
            'like': '%' + req.query.toHospitalName + '%'
          }
        }
        console.log('hospitals:' + req.query.toHospitalName);
        Hospital.find(findHospParams).exec(function (err, records) {
          if (err) {
            return callback(err);
          }

          if (records && records.length > 0) {
            for (var i = 0; i < records.length; i++) {
              hospIds.push(records[i].hospitalid);
            }

            return callback(null, hospIds);

          } else {
            return callback(null);
          }
        });

      } else {
        callback(null);
      }

    }, function (callback) {
      //find organs
      if (!req.query.organSegNumber && !req.query.organType) {
        callback(null);
      } else {
        var findOrganParams = {
          dbStatus: 'N'
        }

        if (req.query.organSegNumber) {
          findOrganParams.segNumber = {
            'like': '%' + req.query.organSegNumber + '%'
          };
        }

        if (req.query.organType) {
          findOrganParams.type = {
            'like': '%' + req.query.organType + '%'
          };
        }
        console.log('organs:' + req.query.organSegNumber + "," + req.query.organType);
        Organ.find(findOrganParams).exec(function (err, records) {
          if (err) {
            return callback(err);
          }

          if (records && records.length > 0) {
            for (var i = 0; i < records.length; i++) {
              organIds.push(records[i].organid);
            }

            return callback(null, organIds);

          } else {
            return callback(null);
          }
        });
      }

    }, function (callback) {
      //find transfer persons
      if (req.query.transferPersonName) {
        var findPersonParams = {
          dbStatus: 'N',
          name: req.query.transferPersonName
        }
        console.log('persons:' + req.query.transferPersonName);
        TransferPerson.find(findPersonParams).exec(function (err, records) {
          if (err) {
            return callback(err);
          }

          if (records && records.length > 0) {
            for (var i = 0; i < records.length; i++) {
              personIds.push(records[i].transferPersonid);
            }

            return callback(null, personIds);

          } else {
            return callback(null);
          }
        });

      } else {
        return callback(null);
      }

    }], function (err, results) {
      if (err) {
        BaseController.sendDbError(err, res);
        return;
      }

      if (hospIds.length > 0) {
        findParams.to_hosp_id = hospIds;
      }

      if (organIds.length > 0) {
        findParams.organ_id = organIds;
      }

      if (personIds.length > 0) {
        findParams.transferPerson_id = personIds;
      }

      if (req.query.hospitalid) {
        findParams.to_hosp_id = req.query.hospitalid;
      }


      Transfer.find(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').exec(function (err, records) {
        //Transfer.find(findParams).exec(function(err, records) {


        if (err) {
          BaseController.sendDbError(err, res);
          return;
        }

        // var transfers = [];
        // for (var i = 0; i < records.length; i++) {
        //     var transferInfo = Transfer.detailInfo(records[i]);
        //     transfers.push(transferInfo);
        // }
        // BaseController.sendOk('获取转运信息成功', transfers, res);
        console.log('query finish');
        var transfers = [];
        for (var i = parseInt(start); i < parseInt(start) + parseInt(number); i++) {
          if (i < records.length) {
            transfers.push(Transfer.detailInfo(records[i]));

          } else {
            break;
          }
        }

        console.log('for finish');
        var info = {
          totalItems: records.length,
          numberOfPages: Math.ceil(parseFloat(records.length) / number),
          transfers: transfers
        }

        BaseController.sendOk('获取转运信息成功', info, res);
        console.log('send finish');
      });


    });

  },
  /**
   * 导出word
   */
  getExportFile: function (req, res) {
    console.log('exportWord-------------');
    var docx = officegen('docx');
    docx.on('finalize', function (written) {
      console.log('Finish to create Word file.\nTotal bytes created: ' + written + '\n');
    });


    docx.on('error', function (err) {
      console.log(err);
    });







    var data = [[{
      type: "text",
      val: "XX/T XXXXX--XXXX",
      opt: {color: '000000'},
      lopt: {align: 'right'}
    }, {
      type: "text",
      val: "附录",
      opt: {color: '000000'},
      lopt: {align: 'center'}
    },
      {
        type: "text",
        val: "附录",
        opt: {color: '000000'},
        lopt: {align: 'center'}
      },
      {
        type: "linebreak"
      }, {
        type: "text",
        val: "附录",
        opt: {color: '000000'},
        lopt: {align: 'center'}
      }], {
      type: "horizontalline"
    }, [{backline: 'EDEDED'}, {
      type: "text",
      val: "  backline text1.",
      opt: {bold: true}
    }, {
      type: "text",
      val: "  backline text2.",
      opt: {color: '000088'}
    }], {
      type: "text",
      val: "Left this text.",
      lopt: {align: 'left'}
    }, {
      type: "text",
      val: "Center this text.",
      lopt: {align: 'center'}
    }, {
      type: "text",
      val: "Right this text.",
      lopt: {align: 'right'}
    }, {
      type: "text",
      val: "Fonts face only.",
      opt: {font_face: 'Arial'}
    }, {
      type: "text",
      val: "Fonts face and size.",
      opt: {font_face: 'Arial', font_size: 40}
    },
      {
      type: "table",
      val: table,
      opt: tableStyle
    }, [{ // arr[0] is common option.
      align: 'right'
    }, {
      type: "image",
      path: path.resolve(__dirname, 'images/a2.png')
    }, {
      type: "image",
      path: path.resolve(__dirname, 'images/a2.png')
    }], {
      type: "pagebreak"
    }
    ]

    docx.createByJson(data);


    var out = fs.createWriteStream('out.docx');// 文件写入
    out.on('error', function (err) {
      console.log(err);
    });


    var result = docx.generate(out);// 服务端生成word


    res.writeHead(200, {

// 注意这里的type设置，导出不同文件type值不同applicationnd.openxmlformats-officedocument.presentationml.presentation
      "Content-Type": "applicationnd.openxmlformats-officedocument.wordprocessingml.document",

      'Content-disposition': 'attachment; filename=out.docx'

    });
    docx.generate(res);// 客户端导出word


  },
  getExportFiles: function (req, res) {
    var transferid = req.params.transferid;
    var findParams = {
      transferid: transferid,
      dbStatus: 'N'
    }


    async.series([function (callback) {
      //get temperature records
      var sql = "select count(*) as tempCount from transferRecord where type&1 and transfer_id='" + transferid + "'";
      TransferRecord.query(sql, function (err, records) {
        if (err) {
          return callback(err);
        }
        callback(null, records[0].tempCount);
      });

    }, function (callback) {
      //get collision info
      var sql = "select count(*) as collisionCount from transferRecord where type&4 and transfer_id='" + transferid + "'";
      TransferRecord.query(sql, function (err, records) {
        if (err) {
          return callback(err);
        }
        callback(null, records[0].collisionCount);
      });

    }], function (err, results) {
      if (err) {
        BaseController.sendDbError(err, res);
        return;
      }

      var badInfo = '';
      if (parseInt(results[0]) > 0) {
        badInfo.concat('温度异常：' + results[0]);
      }

      if (parseInt(results[1]) > 0) {
        badInfo = badInfo.length > 0 ? badInfo.concat('；碰撞：' + results[1]) : '碰撞：' + results[1];
      }

      badInfo = badInfo.length > 0 ? badInfo : '无';

      Transfer.findOne(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').populate('records', {
        sort: 'recordAt DESC',
        limit: 1
      }).exec(function (err, record) {
        if (err) {
          BaseController.sendDbError(err, res);
          return;
        }

        if (!record) {
          BaseController.sendNotFound('找不到该转运信息', res);
          return;
        }

        var transferInfo = Transfer.detailInfo(record);
        transferInfo.badInfo = badInfo;
        if (!transferInfo.records || transferInfo.records.length < 1) {
          var record = {
            avgTemperature: '无记录'
          }

          transferInfo.records = [record];
        }

        if (!transferInfo.tracfficNumber) {
          transferInfo.tracfficNumber = '';
        }

        res.attachment(transferInfo.transferNumber + '.doc');
        //res.render('export', {
        //  transferInfo: transferInfo,
        //});
      });
    });
  }

};
