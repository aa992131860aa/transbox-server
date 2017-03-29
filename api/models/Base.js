/**
 * Base.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var uuid = require('node-uuid');

module.exports = {

  attributes: {

  },
  removeNull: function(obj) {
    for (var key in obj) {
      if ( (!obj[key] || obj[key] === null) && obj[key] !== 0 ) {
        delete obj[key];
      }
    }

    return obj;
  },
  uuid: function() {
    return uuid.v4();
  },
  getBoxNumber: function() {
    var rnd = Math.random() * (99999999 - 10000000) + 10000000;
    return 'b' + Math.floor(rnd);
  },
  isEmptyString: function(str) {
    return !str || str.length === 0;
  },
  getTransferNumber: function() {
    var rnd = Math.random() * (99999999 - 10000000) + 10000000;
    return Math.floor(rnd);
  },
  config: {
    host: 'http://192.168.1.115:1337'
  },
};
