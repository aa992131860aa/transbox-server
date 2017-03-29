module.exports = function(req, res, next) {
	if (req.params.sign) {
		var str = SecuriryService.hmacSha256String('applab');
		if (req.params.sign === str) {
			return next();

		} else {
			return res.forbidden('您没有权限，请检查参数是否正确');
		}

	} else {
		return res.forbidden('您没有权限，请检查参数是否正确');
	}
}