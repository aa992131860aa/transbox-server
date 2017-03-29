/**
 * OptionController
 *
 * @description :: Server-side logic for managing Options
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');

module.exports = {
	create: function(req, res) {
		Keyword.create(req.body).exec(function(err, record) {
			if (err) {
				console.log(err);
				BaseController.sendDbError(err, res);
				return;
			}

			if (!record) {
				BaseController.sendDbError('新建选项失败', res);
				return;
			}

			var option = Keyword.info(record);
			BaseController.sendOk('新建选项成功', option, res);
		});
	},
	getOptions: function(req, res) {
		// var sql = "SELECT category,GROUP_CONCAT('\"',name,'\"') as keywords FROM keyword group by category";
		var sql = "SELECT category,GROUP_CONCAT('{','\"','name','\"',':','\"',name,'\"',',','\"','idx','\"',':',idx,'}') as keywords FROM keyword group by category";
		Keyword.query(sql, function(err, records){
			if (err) {
				console.log(err);
				BaseController.sendDbError(err, res);
				return;
			}

			var options = {};
			for (var i = 0; i < records.length; i++) {
				var oneGroup = records[i];
				var keywords = '[' + oneGroup.keywords + ']';
				var temObj = JSON.parse(keywords);
				var sortedKeywords = temObj.sort(function(a, b) {
					if (a.idx > b.idx) {
						return 1;
					}

					if (a.idx < b.idx) {
						return -1;
					}

					return 0;
				});
	
				var finalKeywords = [];
				for (var j = 0; j < sortedKeywords.length; j++) {
					finalKeywords.push(sortedKeywords[j].name);
				}
				options[oneGroup.category] = finalKeywords;
			}

			BaseController.sendOk('获取选项成功', options, res);
		});
	},
	getOptionsForAndroid: function(req, res) {
		// var sql = "SELECT category,GROUP_CONCAT('\"',name,'\"') as keywords FROM keyword group by category";
		var sql = "SELECT category,GROUP_CONCAT('{','\"','name','\"',':','\"',name,'\"',',','\"','idx','\"',':',idx,'}') as keywords FROM keyword group by category";
		Keyword.query(sql, function(err, records){
			if (err) {
				console.log(err);
				BaseController.sendDbError(err, res);
				return;
			}

			var options = {};
			for (var i = 0; i < records.length; i++) {
				var oneGroup = records[i];
				var keywords = '[' + oneGroup.keywords + ']';
				var temObj = JSON.parse(keywords);
				var sortedKeywords = temObj.sort(function(a, b) {
					if (a.idx > b.idx) {
						return 1;
					}

					if (a.idx < b.idx) {
						return -1;
					}

					return 0;
				});
				
				var finalKeywords = [];
				for (var j = 0; j < sortedKeywords.length; j++) {
					finalKeywords.push(sortedKeywords[j].name);
				}
				options[oneGroup.category] = finalKeywords;
			}

			BaseController.sendOk('获取选项成功', options, res);
		});
	}
};

