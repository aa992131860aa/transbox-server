module.exports = function(req, res, next) {
	if (req.cookies.apple) {
		var findAccountParams = {
			dbStatus: 'N',
			accountid: req.cookies.apple
		}
		Account.findOne(findAccountParams).exec(function(err, record) {
			if (err) {
				return res.forbidden('无法校验身份，请联系管理员');
			}

			if (!record) {
				return res.forbidden('身份校验不通过，请联系管理员');
			}

			if (record.type === 'admin') {
				return next();

			} else {
				return res.forbidden('您不是管理员，没有该权限');
			}
			
		});

	} else {
		return res.forbidden('您没有权限，请先登录');
	}
}