/**
 * SocketController
 *
 * @description :: Server-side logic for managing Sockets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BaseController = require('./BaseController');

module.exports = {
	getSocketId: function(req, res) {
        var params = req.allParams();

        console.log('android:' + JSON.stringify(params));
		if (req.isSocket) {
			var socketid = sails.sockets.getId(req);
			console.log('socketid:' + socketid);
			var boxid = req.params.boxid;
			console.log('boxid:' + boxid);
			sails.sockets.join(req, boxid, function(err) {
				if (err) {
					console.log('can not join this req to room:' + boxid);
					return;

					console.log('this req has been joined to room:' + boxid);
				}
			});

		} else {
			console.log('this is not socket req.');
		}
	}
};

