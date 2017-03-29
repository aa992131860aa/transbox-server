/**
 * BaseController
 *
 * @description :: Server-side logic for managing Bases
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var qr = require('qr-image');
var fs = require('fs');

module.exports = {
	sendOk: function(msg, data, res) {
		var success = {
			status: 'OK',
			msg: msg
		}

		if (data) {
			success.data = data;
		}
		res.send(success);
	},
	sendNotFound: function(msg, res) {
		var notFound = {
			status: 'NOT FOUND',
			msg: msg
		}
		res.send(notFound);
	},
	sendUnautherized: function(res) {
		var unautherized = {
			status: 'Unautherized',
			msg: '身份认证未通过'
		}
		res.send(unautherized);
	},
	sendDbError: function(error, res) {
		var dbError = {
			status: 'DB ERROR',
			msg: '数据库错误',
			error: error
		}
		res.send(dbError);
	},
	sendServerError: function(error, res) {
		var serverError = {
			status: 'SERVER ERROR',
			msg: '服务器错误',
			error: error
		}
		res.send(serverError);
	},
	sendBadParams: function(res) {
		var badParams = {
			status: 'BAD PARAMS',
			msg: '参数错误，请检查参数'
		}
		res.send(badParams);
	},
	genQrcodeImage: function(deviceId, callback) {
		var qr_png = qr.image(Base.config.host + '/transbox/transportHtml/create/index.html#create?deviceId=' + deviceId, {
			type: 'png',
			size: 6
		});
		var imgName = deviceId + '.png';
		var basePath = 'public/qr_imgs/';
		var qr_pipe = qr_png.pipe(fs.createWriteStream(basePath + imgName));
		qr_pipe.on('error', function(err) {
			callback(err, null);
			return;
		});
		qr_pipe.on('finish', function() {
			callback(null, imgName);
		});
	}
};