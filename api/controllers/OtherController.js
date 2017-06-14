/**
 * Created by 99213 on 2017/5/10.
 */
var BaseController = require('./BaseController');
var Transaction = require('sails-mysql-transactions').Transaction;
var EventProxy = require('eventproxy');
//配置模块
var settings = require('../../config/settings');
var mysql = require('mysql');

module.exports = {
    //发送消息
  uploadAPK:function(req,res){
      //easy push
    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var sql = "select id,version,url from upload order by create_time desc limit 0,1";
    connection.query(sql, function (err, rows) {

      if(err)throw err;
      var upload = new Object();
      if(rows.length==1){
        upload.id = rows[0]['id'];
        upload.version = rows[0]['version'];
        upload.url = rows[0]['url']
        BaseController.sendOk('获取apk版本成功', upload, res);
      }

    });
    connection.end();
    }

}
