/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

var ROUTE_PREFIX = "/transbox/api";

// add global prefix to manually defined routes
function addGlobalPrefix(routes) {
  var paths = Object.keys(routes),
      newRoutes = {};

  if(ROUTE_PREFIX === "") {
    return routes;
  }

  paths.forEach(function(path) {
    var pathParts = path.split(" "),
        uri = pathParts.pop(),
        prefixedURI = "", newPath = "";

      prefixedURI = ROUTE_PREFIX + uri;

      pathParts.push(prefixedURI);

      newPath = pathParts.join(" ");
      // construct the new routes
      newRoutes[newPath] = routes[path];
  });

  return newRoutes;
};

module.exports.routes = addGlobalPrefix({

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
  * etc. depending on your default view engine) your home page.              *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  '/': {
    view: 'homepage'
  },

  /***************************************************************************
  *                                                                          *
  * Custom routes here...                                                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the custom routes above, it   *
  * is matched against Sails route blueprints. See `config/blueprints.js`    *
  * for configuration options and examples.                                  *
  *                                                                          *
  ***************************************************************************/

  //hospital routes
  'post /hospital': 'HospitalController.create',
  'get /hospital/:hospitalid': 'HospitalController.getFirstByHospitalid',
  'get /hospitals': 'HospitalController.getHospitals',
  'put /hospital/:hospitalid' : 'HospitalController.updateHospital',
  'put /hospital/:hospitalid/updatePwd': 'HospitalController.updatePwd',
  'post /hospital/login': 'HospitalController.login',
  'delete /hospital/:hospitalid': 'HospitalController.deleteHospital',

  //box routes
  'post /box': 'BoxController.create',
  'get /boxes': 'BoxController.getBoxes',
  'get /box/:boxid': 'BoxController.getFirstByBoxid',
  'put /box/:boxid': 'BoxController.updateBox',
  'delete /box/:boxid': 'BoxController.deleteBox',
  'get /boxInfo': 'BoxController.getBoxInfo',
  'get /boxOptions': 'BoxController.getBoxesForOptions',

  //organ routes
  'post /organ': 'OrganController.create',
  'get /organs': 'OrganController.getOrgans',
  'get /organ/:organid': 'OrganController.getFirstByOrganid',
  'put /organ/:organid': 'OrganController.updateOrgan',
  'delete /organ/:organid': 'OrganController.deleteOrgan',

  //fitting routes
  'post /fitting': 'FittingController.create',
  'put /fitting/:fittingid': 'FittingController.updateFitting',
  'get /fitting/:fittingid': 'FittingController.getFirstByFittingid',
  'get /fittings': 'FittingController.getFittings',
  'delete /fitting/:fittingid': 'FittingController.deleteFitting',

  //tranferPerson routes
  'post /transferPerson': 'TransferPersonController.create',
  'get /transferPersons': 'TransferPersonController.getTransferPersons',

  //opo routes
  'post /opo': 'OpoController.create',
  'get /opos': 'OpoController.getOpos',
  'get /opos2': 'OpoController.getOpos2',
  'put /opo/:opoid': 'OpoController.updateOpo',
  'delete /opo/:opoid': 'OpoController.deleteOpo',

  //transfer routes
  'post /transfer': 'TransferController.create',
  'get /transfer/:transferid': 'TransferController.getFirstByTransferid',
  'get /transferInfo': 'TransferController.getInfo',
  'put /transfer/:transferid/done': 'TransferController.transferDone',
  'get /transfers': 'TransferController.getTransfers',
  'get /transfersSql': 'TransferController.getTransfersSql',
  'get /export/:transferid': 'TransferController.getExportFile',

  //transfer record routes
  'post /transferRecord': 'TransferRecordController.create',
  'get /records': 'TransferRecordController.getRecords',
  'get /records2': 'TransferRecordController.getRecords2',

  //account routes
  'post /account/login': 'AccountController.login',
  'put /account/updatePwd': 'AccountController.updatePwd',
  'get /account/:accountid': 'AccountController.getFirstByAccountid',
  'put /account/resetPwd': 'AccountController.resetPwds',

  //base routes
  'get /base/qrcode': 'BaseController.genQrcodeImg',

  //keyword routes
  'post /keyword': 'KeywordController.create',
  'get /keywords': 'KeywordController.getOptions',
  'get /kwds': 'KeywordController.getOptionsForAndroid',

  //socket router
  'get /socket/getSocketId/:boxid': 'SocketController.getSocketId',

  // check record routes
  'get /checkRecord/:phone': 'CheckRecordController.getTransferByPhone'
});
