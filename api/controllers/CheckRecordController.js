/**
 * CheckRecordController
 *
 * @description :: Server-side logic for managing Checkrecords
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');

module.exports = {
	getTransferByPhone: function(req, res) {
		var transferid = req.query.transferid;
		var phone = req.params.phone;

		if (!transferid || !phone) {
			BaseController.sendBadParams(res);
			return;
		}

		var findParams = {
			transferid: transferid,
			dbStatus: 'N'
		}
		Transfer.findOne(findParams).populate('box_id').populate('opo_id').populate('organ_id').populate('transferPerson_id').populate('to_hosp_id').exec(function(err, record) {
			if (err) {
				BaseController.sendDbError(err, res);
				return;
			}

			if (!record) {
				BaseController.sendDbError('获取转运信息成功，请检查转运id是否正确', res);
				return;
			}

			var transferInfo = Transfer.detailInfo(record);
			BaseController.sendOk('信息已发送', transferInfo, res);

			//create a record
			var info = {
				phone: phone,
				transfer_id: transferInfo.transferid
			}
			
			CheckRecord.create(info).exec(function(err, record) {
				if (err) {
					console.log('create check record failed!');
					return;
				}

				console.log('create check record success!');
			});

			//send msg
			var params = {
			    transferNumber: transferInfo.transferNumber,
			    segNumber: transferInfo.organInfo.segNumber,
			    url: Base.config.host + '/transbox/transportHtml/index.html',
			    type: 'check'
			}
			MSMService.sendMsg(phone, params);
		});
	}
};

