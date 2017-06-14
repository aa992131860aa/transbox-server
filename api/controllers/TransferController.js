/**
 * TransferController
 *
 * @description :: Server-side logic for managing Transfers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');
var Transaction = require('sails-mysql-transactions').Transaction;
var EventProxy = require('eventproxy');


var mysql = require('mysql');
//配置模块
var settings = require('../../config/settings');

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
    console.log(req.body);
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
      console.log(req.body);
      Box.transact(transaction).findOne(findBoxParams).populate('hosp_id').exec(function (err, record) {
        console.log('step1');
        if (err) {
          transaction.rollback();
          BaseController.sendDbError(err, res);
          return;
        }
        console.log(1);
        console.log(err);
        console.log(2);
        if (!record) {
          transaction.rollback();

          BaseController.sendNotFound('创建转运失败，该箱子目前不能使用或已经被删除', res);
          return;
        }
        console.log(3);
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

        }
        else {
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
          console.log(findPersonParams);
          TransferPerson.transact(transaction).findOne(findPersonParams).exec(function (err, record) {
            if (err) {
              transaction.rollback();
              console.log("organ error:"+err);
              BaseController.sendDbError(err, res);
              return;
            }

            if (!record) {
              transaction.rollback();
              BaseController.sendDbError('无法获取该转运人信息', res);
              console.log("organ error1:"+res);
              return;
            }

            var personInfo = TransferPerson.info(record);
            ep.emit('person', personInfo);
          });

        }
        else {
          //create a new transfer person
          var createPersonParams = {
            name: person.name,
            phone: person.phone,
            organType: organInfo.type,
            hosp_id: boxInfoDb.hospital.hospitalid
          }
          console.log(createPersonParams);

          TransferPerson.transact(transaction).create(createPersonParams).exec(function (err, record) {
            if (err) {
              transaction.rollback();
              console.log("organ error2:"+err);
              BaseController.sendDbError(err, res);
              return;
            }

            if (!record) {
              transaction.rollback();
              console.log("organ error3:"+res);
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

        }
        else {
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
        console.log(createParams);
        Transfer.transact(transaction).create(createParams).exec(function (err, record) {
          if (err) {
            transaction.rollback();
            BaseController.sendDbError(err, res);
            console.log("transfer6:"+err);
            return;
          }

          if (!record) {
            transaction.rollback();
            console.log("transfer6r:"+record);
            BaseController.sendDbError('创建转运失败', res);

          } else {
            var findParams = {
              transferid: record.transferid,
              dbStatus: 'N'
            }
            Transfer.transact(transaction).findOne(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').exec(function (err, record) {
              if (err) {
                transaction.rollback();
                console.log("transfer61:"+err);
                BaseController.sendDbError(err, res);
                return;
              }

              if (!record) {
                transaction.rollback();
                console.log("transfer6r1:"+record);
                BaseController.sendDbError('创建转运失败', res);
                return;
              }

              transaction.commit();
              var transferInfo = Transfer.detailInfo(record);
              BaseController.sendOk('新建转运成功', transferInfo, res);
              //socket event
              if (transferInfo.deviceType === 'web') {
                //console.log(transferInfo);
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
  modifyTransfer: function (req, res) {
    console.log('create a new transfer.' + (new Date()));
    if (!Transfer.isCreateParamsOk(req.body)) {
      BaseController.sendBadParams(res);
      return;
    }



    //request params
    var baseInfo = req.body.baseInfo;
    var to = req.body.to;
    var person = req.body.person;
    var organ = req.body.organ;
    var opo = req.body.opo;
    var transferid = req.body.transferId;
    console.log(req.body);
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
        transferStatus: 'transfering'
      }
      console.log(req.body);
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
        console.log(3);
        // the box is free
        record.hospital = Hospital.info(record.hosp_id);
        var boxInfo = Box.info(record);
        boxInfoDb = boxInfo;
        ep.emit('box', boxInfo);
        //return ;
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

        }
        else {
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
        if (person.transferPersonid) {
          var findPersonParams = {
            transferPersonid: person.transferPersonid,
            dbStatus: 'N'
          }
          console.log(findPersonParams);
          TransferPerson.transact(transaction).findOne(findPersonParams).exec(function (err, record) {
            if (err) {
              transaction.rollback();
              console.log("organ error:"+err);
              BaseController.sendDbError(err, res);
              return;
            }

            if (!record) {
              transaction.rollback();
              BaseController.sendDbError('无法获取该转运人信息', res);
              console.log("organ error1:"+res);
              return;
            }

            var personInfo = TransferPerson.info(record);
            ep.emit('person', personInfo);
          });

        }
        else {
          //create a new transfer person
          var createPersonParams = {
            name: person.name,
            phone: person.phone,
            organType: organInfo.type,
            hosp_id: boxInfoDb.hospital.hospitalid
          }
          //console.log(createPersonParams);
             console.log("create person")
          TransferPerson.transact(transaction).create(createPersonParams).exec(function (err, record) {
            if (err) {
              transaction.rollback();
              console.log("organ error2:"+err);
              BaseController.sendDbError(err, res);
              return;
            }

            if (!record) {
              transaction.rollback();
              console.log("organ error3:"+res);
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
        console.log(opo.opoid);
        if (opo.opoid) {
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
                console.log("opoerr1:"+err)
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

        }
        else {
          //create a new opo
          var updateOpo = Opo.getUpdateParams(opo);
          if (Object.keys(updateOpo).length > 0) {
            Opo.transact(transaction).create(updateOpo).exec(function (err, record) {
              console.log("opo create");
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
      ep.all('box', 'organ', 'person','opo', 'boxUpdated', function (boxInfo, organInfo, personInfo, opoInfo, boxInfo2) {
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
        //var createParams1 = Transfer.detailInfo(opo);
        var findTransfer = {
          transferid:transferid
        }
        console.log('transferid');
        console.log(transferid);
        Transfer.transact(transaction).update(findTransfer, createParams).exec(function (err, record) {
          if (err) {
            transaction.rollback();
            BaseController.sendDbError(err, res);
            console.log("transfer6:"+err);
            return;
          }

          if (!record) {
            transaction.rollback();
            console.log("transfer6r:"+record);
            BaseController.sendDbError('创建转运失败', res);

          } else {

            transaction.commit();

            BaseController.sendOk('新建转运成功', 'ok', res);





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
  getInfoBase:function(req,res){
    var transferId = req.query.transferId;
    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var sql = 'select t.transferid t_transferid,t.transferNumber t_transferNumber,t.organCount t_organCount,' +
    't.boxPin t_boxPin, t.fromCity t_fromCity,t.toHospName t_toHospName,t.tracfficType t_tracfficType,t.tracfficNumber t_tracfficNumber,t.deviceType' +
    ' t_deviceType,DATE_FORMAT(t.getOrganAt,"%Y-%m-%d") t_getOrganAt,DATE_FORMAT(t.startAt,"%Y-%m-%d") t_startAt,DATE_FORMAT(t.endAt,"%Y-%m-%d") t_endAt,t.`status` t_status,t.createAt ' +
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
    'op_createAt,op.modifyAt op_modifyAt from transfer t,organ o,box b,hospital h,transferPerson tp,opo op where ' +
    't.dbStatus = "N"  and b.boxid = t.box_id and h.hospitalid = t.to_hosp_id and o.organid ' +
    '= t.organ_id and tp.transferPersonid = t.transferPerson_id and op.opoid = t.opo_id and t.transferid ="'+transferId+'"';
    console.log(sql);
    connection.query(sql, function (err, rows) {
      if(err)throw err;

      BaseController.sendOk('获取转运信息成功', rows, res);
    });
    connection.end();
  },
  getInfoSql: function (req, res) {

    var transferId = req.query.transferId;


    //获取展示的条数
    var lineSize = 30;
    //总的数量
    var count = 1;
    var arr = [];
    //基础的温湿度

    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var info = "";
    var sql1 = "select count,duration,distance,currentCity,avgTemperature,power,expendPower,maxTemperature,minTemperature,maxHumidity,minHumidity,avgHumidity,DATE_FORMAT(minRecordAt,'%Y-%m-%d %H:%i:%s') minRecordAt from (select count(duration) count,duration,distance,currentCity,avgTemperature,power,expendPower from transferRecord where  transfer_id='"+transferId+"' order by recordAt DESC limit 0,1) as a,(select max(temperature) maxTemperature,min(temperature) minTemperature,max(humidity) maxHumidity,min(humidity)minHumidity,avg(humidity)avgHumidity,min(recordAt) minRecordAt from transferRecord where  transfer_id='"+transferId+"' ) as b;";
    //console.log(sql1);
     if(transferId){
       connection.query(sql1, function (err, rows) {
         if(err)throw err;
         info = rows;
         arr.push(rows);

         var sql2 = "Select transfer_id,DATE_FORMAT(recordAt,'%Y-%m-%d %H:%i:%s') recordAt,DATE_FORMAT(recordAt,'%m-%d %H:%i') recordAt1,longitude,latitude,temperature,humidity From transferRecord  where  transfer_id='"+transferId+"' and recordAt >'2016-05-05' order by recordAt asc";

         //console.log(sql2);
         //console.log("=================================================================");
         //温湿度集
         connection.query(sql2, function (err, rows) {
           if(err)throw err;
           arr.push(rows);
           BaseController.sendOk('获取转运信息成功', arr, res);
           connection.end();
         });


         //BaseController.sendOk('获取转运信息成功', rows, res);
       });
     }else{

     }



  },
  getBoxNum:function(req,res){
    var boxNum = req.query.boxNum;

    var page = req.query.page;
    var pageSize = req.query.pageSize;
    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var sql = "select transferid,transferNumber,fromCity,toHospName,DATE_FORMAT(t.createAt,'%Y-%m-%d %H:%i:%s') createAt,o.segNumber segNumber from transfer t,organ o where o.organid=t.organ_id and box_id = (select boxid  from box where deviceId = '"+boxNum+"') order by createAt DESC limit "+page*pageSize+","+pageSize+";";
    console.log(sql);

    connection.query(sql, function (err, rows) {
      if(err)throw err;

      BaseController.sendOk('获取转运信息成功', rows, res);
    });
    connection.end();
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
        //console.log(transferInfo);

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
          console.log(err);
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
         console.log(findBox);
        var updateBox = {
          transferStatus: 'free'
        }

        Box.transact(transaction).update(findBox, updateBox).exec(function (err, records) {
          if (err) {
            transaction.rollback();
            BaseController.sendDbError(err, res);
            console.log(err);
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
            console.log(transferInfo);
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
  getOrganTypes:function (req, res) {


    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var sql = "select type from organ GROUP BY type";
    connection.query(sql, function (err, rows) {
      if(err)throw err;

      BaseController.sendOk('获取转运信息成功', rows, res);
    });
    connection.end();
  },
  getHospitalName:function(req,res){
    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var sql = "select name from hospital where name<>'default'";
    connection.query(sql, function (err, rows) {
      if(err)throw err;

      BaseController.sendOk('获取转运信息成功', rows, res);
    });
    connection.end();
  },
  getTransfersSql: function (req, res) {



    var start = req.query.start ? req.query.start : 0;
    var number = req.query.number ? req.query.number : 20;
    var hospitalid = req.query.hospitalid;
    //console.log("hospitalid:"+hospitalid);
    //console.log(settings.db);
    //连接数据库


    var connection = mysql.createConnection(settings.db);
    connection.connect();
    console.log("conn")
    var count = 20;
    var sort = 'ASC';
    var type = req.query.type;
    if (!type) {
      type = 't.createAt';
    }
    var reverse = req.query.reverse;
    //console.log("reverse:"+reverse);
    if (reverse == 'true') {
      sort = 'DESC';
    } else {
      sort = 'ASC';
    }
    //条件
    var condition ='';

      if(req.query.fromCity){
          condition += ' and t.fromCity like "%'+req.query.fromCity+'%"';
      }
    if(req.query.organSegNumber){
      condition += ' and o.segNumber like "%'+req.query.organSegNumber+'%"';
    }
    if(req.query.transferNumber){
      condition += ' and t.transferNumber like "%'+req.query.transferNumber+'%"';
    }
    if(req.query.transferPersonName){
      condition += ' and tp.name like "%'+req.query.transferPersonName+'%"';
    }
    if(req.query.toHospitalName&&req.query.toHospitalName!="0"){
      condition += ' and h.name like "%'+req.query.toHospitalName+'%"';
    }
    if(req.query.organType&&req.query.organType!="0"){
      condition += ' and o.type like "%'+req.query.organType+'%"';
    }if(req.query.beginDate){
      condition += ' and t.startAt > "'+req.query.beginDate+'"';
    }
    if(req.query.endDate){
      condition += ' and t.startAt < "'+req.query.endDate+'"';
    }
    if(hospitalid){
      condition += ' and h.hospitalid = "'+hospitalid+'" ';
    }
    //查询
    var selectSQL = 'select t.transferid t_transferid,t.transferNumber t_transferNumber,t.organCount t_organCount,' +
      't.boxPin t_boxPin, t.fromCity t_fromCity,t.toHospName t_toHospName,t.tracfficType t_tracfficType,t.deviceType' +
      ' t_deviceType,DATE_FORMAT(t.getOrganAt,"%Y-%m-%d") t_getOrganAt,DATE_FORMAT(t.startAt,"%Y-%m-%d") t_startAt,DATE_FORMAT(t.endAt,"%Y-%m-%d") t_endAt,t.`status` t_status,t.createAt ' +
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
      'op_createAt,op.modifyAt op_modifyAt from transfer t,organ o,box b,hospital h,transferPerson tp,opo op where ' +
      't.dbStatus = "N" and t.`status` = "done" and b.boxid = t.box_id and h.hospitalid = t.to_hosp_id and o.organid ' +
      '= t.organ_id and tp.transferPersonid = t.transferPerson_id and op.opoid = t.opo_id '+condition+' ORDER BY ' + type +
      '  ' + sort + ' limit ' + start + ',' + number;
    console.log(selectSQL);

    var selectCount = 'select count(t.transferid) count from transfer t,organ o,box b,hospital h,transferPerson tp,opo' +
      ' op where t.dbStatus = "N" and t.`status` = "done" and b.boxid = t.box_id and h.hospitalid = t.to_hosp_id ' +
      'and o.organid = t.organ_id and tp.transferPersonid = t.transferPerson_id and op.opoid = t.opo_id '+condition;
    //console.log(selectCount);
    connection.query(selectCount, function (err1, rows1) {
      if (err1) {
        throw err1;
      } else {
        count = rows1[0]['count'];
        //console.log("count:" + count);
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

          //把搜索值输出
          //app.get('/', function (req, res) {
          //  res.send(arr);
          //});

          //关闭连接
          connection.end();
        });
      }
    });


  },
  getTransfersSqlAndroid: function (req, res) {



    var start = req.query.start ? req.query.start : 0;
    var number = req.query.number ? req.query.number : 20;
    var hospitalid = req.query.hospitalid;
    //console.log("hospitalid:"+hospitalid);
    //console.log(settings.db);
    //连接数据库


    var connection = mysql.createConnection(settings.db);
    connection.connect();
    console.log("conn")
    var count = 20;
    var sort = 'ASC';
    var type = req.query.type;
    if (!type) {
      type = 't.createAt';
    }
    var reverse = req.query.reverse;
    //console.log("reverse:"+reverse);
    if (reverse == 'true') {
      sort = 'DESC';
    } else {
      sort = 'ASC';
    }
    //条件
    var condition ='';

    if(req.query.fromCity){
      condition += ' and t.fromCity like "%'+req.query.fromCity+'%"';
    }
    if(req.query.organSegNumber){
      condition += ' and o.segNumber like "%'+req.query.organSegNumber+'%"';
    }
    if(req.query.transferNumber){
      condition += ' and t.transferNumber like "%'+req.query.transferNumber+'%"';
    }
    if(req.query.transferPersonName){
      condition += ' and tp.name like "%'+req.query.transferPersonName+'%"';
    }
    if(req.query.toHospitalName&&req.query.toHospitalName!="0"){
      condition += ' and h.name like "%'+req.query.toHospitalName+'%"';
    }
    if(req.query.organType&&req.query.organType!="0"){
      condition += ' and o.type like "%'+req.query.organType+'%"';
    }if(req.query.beginDate){
      condition += ' and t.startAt > "'+req.query.beginDate+'"';
    }
    if(req.query.endDate){
      condition += ' and t.startAt < "'+req.query.endDate+'"';
    }
    if(hospitalid){
      condition += ' and h.hospitalid = "'+hospitalid+'" ';
    }
    //查询
    var selectSQL = 'select t.transferid t_transferid,t.transferNumber t_transferNumber,t.organCount t_organCount,' +
      't.boxPin t_boxPin, t.fromCity t_fromCity,t.toHospName t_toHospName,t.tracfficType t_tracfficType,t.deviceType' +
      ' t_deviceType,DATE_FORMAT(t.getOrganAt,"%Y-%m-%d") t_getOrganAt,DATE_FORMAT(t.startAt,"%Y-%m-%d") t_startAt,DATE_FORMAT(t.endAt,"%Y-%m-%d") t_endAt,t.`status` t_status,t.createAt ' +
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
      'op_createAt,op.modifyAt op_modifyAt from transfer t,organ o,box b,hospital h,transferPerson tp,opo op where ' +
      't.dbStatus = "N" and t.`status` = "done" and b.boxid = t.box_id and h.hospitalid = t.to_hosp_id and o.organid ' +
      '= t.organ_id and tp.transferPersonid = t.transferPerson_id and op.opoid = t.opo_id '+condition+'  ORDER BY ' + type +
      '  ' + sort + ' limit ' + start*number + ',' + number;
    console.log(selectSQL);



        //console.log("count:" + count);
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


          BaseController.sendOk('获取转运信息成功', transfers, res);

          //把搜索值输出
          //app.get('/', function (req, res) {
          //  res.send(arr);
          //});

          //关闭连接
          connection.end();
        });




  },
  getTransfersStatus: function (req, res) {
    var page = req.query.page;
    var pageSize = req.query.pageSize;
    var status = req.query.status;
    if(Base.isEmptyString(page)||Base.isEmptyString(pageSize)||Base.isEmptyString(status)){
      BaseController.sendBadParams(res);
      return;
    }
    page = parseInt(page);
    pageSize = parseInt(pageSize);
    var params  = [status,page*pageSize,(page+1)*pageSize];
    //连接数据库
    var connection = mysql.createConnection(settings.db);
    connection.connect();

    //查询
    var selectSQL = 'select t.transferid t_transferid,t.transferNumber t_transferNumber,t.organCount t_organCount,' +
      't.boxPin t_boxPin, t.fromCity t_fromCity,t.toHospName t_toHospName,t.tracfficType t_tracfficType,t.deviceType' +
      ' t_deviceType,DATE_FORMAT(t.getOrganAt,"%Y-%m-%d") t_getOrganAt,DATE_FORMAT(t.startAt,"%Y-%m-%d") t_startAt,DATE_FORMAT(t.endAt,"%Y-%m-%d") t_endAt,t.`status` t_status,t.createAt ' +
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
      'op_createAt,op.modifyAt op_modifyAt from transfer t,organ o,box b,hospital h,transferPerson tp,opo op where ' +
      't.dbStatus = "N"  and b.boxid = t.box_id and h.hospitalid = t.to_hosp_id and o.organid ' +
      '= t.organ_id and tp.transferPersonid = t.transferPerson_id and op.opoid = t.opo_id and t.status = ?  ORDER BY t.createAt limit ?,?';
       console.log(selectSQL);
       console.log(params)
        connection.query(selectSQL,params, function (err, rows) {
          if (err) throw err;

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


          BaseController.sendOk('获取转运信息成功', transfers, res);

          //把搜索值输出
          //app.get('/', function (req, res) {
          //  res.send(arr);
          //});

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
        //console.log('hospitals:' + req.query.toHospitalName);
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
        //console.log('organs:' + req.query.organSegNumber + "," + req.query.organType);
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
        //console.log('persons:' + req.query.transferPersonName);
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

        res.attachment(transferInfo.transferNumber + '.html');
        res.render('export', {
          transferInfo: transferInfo,
        });
      });
    });
  }

};
