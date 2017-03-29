var crypto = require('crypto');
var superagent = require('superagent');

module.exports = {
	sendMsg: function(phone, params) {
		var content = '';
		switch (params.type) {
			case 'create':
				content = '【器官转运】您已成功新建转运，此次转运的单号为：' + params.transferNumber + '，器官段号为：' + params.segNumber + '，查看详细内容请前往' + params.url;
				break;
			case 'check':
				content = '【器官转运】转运单号：' + params.transferNumber + '，器官段号：' + params.segNumber + '。查看详细内容请前往' + params.url;
				break;
			case 'warning':
				content = '【器官转运】请注意！转运箱出现异常，请立即处理。转运单号：' + params.transferNumber + '，器官段号：' + params.segNumber + '。查看详细内容请前往' + params.url;
				break;
			case 'done':
				content = '【器官转运】本次转运已结束。转运单号：' + params.transferNumber + '，器官段号：' + params.segNumber + '。查看详细内容请前往' + params.url;
				break;
		}

		var msg = {
			u: 'azuretech',
			p: crypto.createHash('md5').update('weilab123456').digest("hex"),
			m: phone,
			c: content
		}
		console.log(msg);
		//create a notice record
		if (params.transferRecord_id) {
			var noticeInfo = {
				transferRecord_id: params.transferRecord_id,
				phone: phone,
				message: content
			}

			Notice.create(noticeInfo).exec(function(err, record) {
				if (err) {
					console.log('create notice failed!');
					return;
				}

				console.log('create notice success!');
			});
		}
		superagent.get('http://api.smsbao.com/sms')
			.query(msg)
			.end(function(err, res) {
				if (err) {
					console.log(err);
					return;
				}

				try {

					console.log('send msg:' + JSON.stringify(res.body));
					var code = parseInt(res.body);
					if (code == 0) {
						console.log('send msg ok!');
					} else {
						console.log('send msg failed:' + code);
					}

				} catch (err) {
					console.log('msg:parse res.body failed!');
				}
			});
	}
};