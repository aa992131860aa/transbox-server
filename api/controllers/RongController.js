/**
 * Created by 99213 on 2017/5/10.
 */
var BaseController = require('./BaseController');
var Transaction = require('sails-mysql-transactions').Transaction;
var EventProxy = require('eventproxy');
var rongcloudSDK = require('rongcloud-sdk');
module.exports = {
  //实例化,并返回token
  create: function (req, res) {
    rongcloudSDK.init('p5tvi9dsp4od4', 'JH0s5aQ1Vc');
    console.log("come in")
    console.log(req.query)
    var userId = req.query.userId;
    var userName = req.query.userName;
    var photoUrl = req.query.photoUrl;

    if (Base.isEmptyString(userId) || Base.isEmptyString(userName)) {
      BaseController.sendBadParams(res);
      return;
    }

    rongcloudSDK.user.getToken(userId, userName, photoUrl, function (err, resultText) {
      if (err) {
        // Handle the error
        BaseController.sendServerError(err, res);
        //console.log(err)
        return;
      }
      else {
        var result = JSON.parse(resultText);
        if (result.code === 200) {
          BaseController.sendOk('获取成功', result.token, res);
          console.log("token:" + result.token)
        } else {
          BaseController.sendServerError(result.code, res);
          console.log(err)
        }
      }
    });
  },
  //检查用户在线状态方法
  checkOnline: function (req, res) {
    var userId = req.query.userId;
    if (Base.isEmptyString(userId)) {
      BaseController.sendBadParams(res);
      return;
    }
    console.log(userId);
    rongcloudSDK.init('p5tvi9dsp4od4', 'JH0s5aQ1Vc');
    rongcloudSDK.user.checkOnline(userId, function (err, resultText) {
      if (err) {
        BaseController.sendServerError(err, res);
        console.log(err);
      }


      var result = JSON.parse(resultText);
      if (result.code === 200) {

        BaseController.sendOk("获取用户状态成功", result.status, res);
      } else {
        BaseController.sendServerError(err, res);
      }
    });
  },
  sendGroupMessage: function (req, res) {
    //var content= {"content":"hello","extra":"helloExtra"}
    // var pushContent = 'pushContent'
    //   var pushData = 'pushData'
    // var params = {
    //   fromUserId: fromUserId,
    //   toGroupId: toGroupId,
    //   objectName: objectName,
    //   content: content,
    //   pushContent:pushContent,
    //   pushData:pushData
    // }
    console.log('come in sendGroupMessage')
    rongcloudSDK.init('p5tvi9dsp4od4', 'JH0s5aQ1Vc');
    var fromUserId = 'admin';
    var toGroupId = 'ae7e25e0-f920-464e-93f2-182d7c67a18d'
    var objectName = 'RC:TxtMsg'
    var content = "this is a group message."

    rongcloudSDK.message.discussion.publish(fromUserId,toGroupId,objectName,content, function (err, resultText) {
      if (err) {
        //BaseController.sendServerError(err, res);
        console.log(err);
      }


      var result = JSON.parse(resultText);
      // if (result.code === 200) {
      //
      //   BaseController.sendOk("获取用户状态成功", result.status, res);
      // } else {
      //   BaseController.sendServerError(err, res);
      // }
    });
  },
  sendSystemMessage: function (req, res) {
    var userId = req.query.userId;
    if (Base.isEmptyString(userId)) {
      BaseController.sendBadParams(res);
      return;
    }
    console.log(userId);
    rongcloudSDK.init('p5tvi9dsp4od4', 'JH0s5aQ1Vc');
    // var params = {
    //   fromUserId:"admin",
    //   toUserId:["user","admin"],
    //   objectName:"RC:TxtMsg",
    //   content:"this is a system message"
    // }
    var params = {
      platform: ["ios", "android"],
      audience: {is_to_all: true},
      notification: {alert: "this is a push."}
    }
    rongcloudSDK.push(params, function (err, resultText) {
      console.log(resultText)
      console.log(err)
    })
  }
}
