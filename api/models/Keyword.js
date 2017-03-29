/**
 * Option.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'keyword',
	attributes: {
		keywordid: {
			type: 'string',
			primaryKey: true
		},
		category: {
			type: 'string',
			required: true
		},
		name: {
			type: 'string',
			required: true
		},
		idx: {
			type: 'integer'
		},
		dbStatus: {
			type: 'string'
		},
		createAt: {
			type: 'datetime'
		},
		modifyAt: {
			type: 'datetime'
		}
	},
	beforeCreate: function(values, cb) {
		values.keywordid = Base.uuid();
		cb();
	},
	beforeUpdate: function(values, cb) {
		values.modifyAt = new Date();
		cb();
	},
	info: function(params) {
		var option = Base.removeNull(params);
		delete option['dbStatus'];
		delete option['idx'];

		return option;
	}
};