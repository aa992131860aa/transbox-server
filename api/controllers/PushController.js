/**
 * Created by 99213 on 2017/5/10.
 */
var BaseController = require('./BaseController');
var Transaction = require('sails-mysql-transactions').Transaction;
var EventProxy = require('eventproxy');
var crypto = require('crypto');
var superagent = require('superagent');
//配置模块
var settings = require('../../config/settings');
var mysql = require('mysql');
module.exports = {
  //发送消息
  pushMessage: function (req, res) {
    //easy push

  },
  getUnreadPushNum: function (req, res) {
    var user_info_id = req.query.user_info_id;
    if(Base.isEmptyString(user_info_id)){
      BaseController.sendBadParams(res);
      return;
    }
    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var sql = "select count(id) count from push where id > (select read_push_position from users where user_info_id = '" + user_info_id + "')";
    connection.query(sql, function (err, rows) {

      if (err)throw err;
      if (rows.length > 0) {
        var count = rows[0]['count'];
        console.log("发送ok:"+count)
        BaseController.sendOk('获取apk版本成功', count, res);
      }


    });
    connection.end();
  },
  pushMessage: function (req, res) {
    var phone = req.query.phone;
    var code = req.query.code;
    if(Base.isEmptyString(phone)||Base.isEmptyString(code)){
      BaseController.sendBadParams(res);
      return;
    }
    var msg = {
      u: 'azuretech',
      p: crypto.createHash('md5').update('weilab123456').digest("hex"),
      m: phone,
      c: '【器官云监控】您的验证码为:' + code + '，在60分钟内有效。'
    }
    console.log(msg)
    superagent.get('http://api.smsbao.com/sms')
      .query(msg)
      .end(function (err, res1) {
        if (err) {
          console.log(err);
          return;
        }
        try {
          console.log(res1.status)
          //console.log(res)
          //console.log('send msg:' + JSON.stringify(res.body));
          var code = parseInt(res1.status);
          if (code == 200) {
            BaseController.sendOk("发送短信", 200, res);
            console.log('send msg ok!');
          } else {
            BaseController.sendOk("发送短信", code, res);
            console.log('send msg failed:' + code);
          }


        } catch (err) {
          BaseController.sendOk("发送短信", -1, res);
          console.log('msg:parse res.body failed!');
          console.log(err)
        }
      });
  },
  clearUnreadPushMessageNum:function (req, res) {
    var user_info_id = req.query.user_info_id;
    if(Base.isEmptyString(user_info_id)){
      BaseController.sendBadParams(res);
      return;
    }
    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var sql = "update users set read_push_position = (select max(id) from push ) where user_info_id = ?";
    connection.query(sql,user_info_id, function (err, result) {

      if (err)throw err;
         console.log("清除成功:"+sql)
        BaseController.sendOk('清除成功', 0, res);

    });
    connection.end();
  },
  getPushList:function(req,res){
    var page = req.query.page;
    var pageSize = req.query.pageSize;
    if(Base.isEmptyString(page)||Base.isEmptyString(pageSize)){
      BaseController.sendBadParams(res);
      return;
    }
    page = parseInt(page);
    var params  = [page*pageSize,pageSize];
    console.log(params)
    var connection = mysql.createConnection(settings.db);
    connection.connect();
    var sql = "select id,content,DATE_FORMAT(create_time,'%Y-%m-%d %H:%i:%s') create_time from push  ORDER BY id desc limit ?,? ";
    connection.query(sql,params, function (err, rows) {

      if (err)throw err;
      var pushes = [];
       for(var i =0;i<rows.length;i++){
         var push = new Object();
         push.id = rows[i]['id'];
         push.content = rows[i]['content'];
         push.create_time = rows[i]['create_time'];
         pushes.push(push);
       }

      BaseController.sendOk('获取系统消息列表成功', pushes, res);



    });
    connection.end();
  }
}
