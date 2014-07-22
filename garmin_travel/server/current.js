// возвращает текущее состояние авторизации + общие параметры для всего приложения

var User = require('../../data/userModel'),
    async = require('async'),
    intel = require('intel'),
    crypto = require('crypto'),
    //log = require('../../utils/log')(module);
    getLocation = require('../actions/getLocation');


module.exports = {
    path: '/auth/current',
    descr: 'Текущее состояние авторизации + общие параметры для всего приложения (ip geolocation)',
    method: 'GET',
    //нужно для формирования описания
    //  responseFormat: {gt_type: userTypes.array, items: Route.description},
    responseFormat: "",
    requestFormat: "Нет параметров",
    middleware: [
        require('../../middleware/logging'),
        require('../../middleware/pgClient')
    ],
    action: function (req, res, next) {
        var log = require('../../utils/log')(req, 'main.api.auth.current');
        var result = {};
        if (!!req.session.user) {
            result.user = req.session.user;
        } else {
            result.user = new User({
                id: 0, name: "", email: '', role: 0, city_id:null
            }).get();
        }
        async.parallel([
            applyLocation,
            getBuild
        ], function(err, data){
            if(err){
                return next(err);
            }
            req.pgConnection.done();
            result.location = data[0];
            result.build = data[1];
            result.hash = getHash();
            res.send(JSON.stringify(result));

        });

        function applyLocation(cb) {
            if (typeof req.session.location != 'undefined') {
                cb(null, req.session.location);
            } else {
                getLocation(req, function(err, result){
                    if(err){
                        cb(err);
                        return;
                    }
                    req.session.location = result;
                    cb(null, req.session.location);
                });
            }
        }

        function getBuild(cb){
            req.pgConnection.client.query('select version from build order by id desc limit 1', function(err, data){
                if(err){
                    cb(err);
                    return;
                }
                cb(null, data.rows[0].version);
            });
        }

        function getHash(){
            var ipStr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            var re = /(\d+\.\d+\.\d+\.\d+)/;
            var result = re.exec(ipStr);

            var ip = "";
            if (result.length > 1) {
                ip = result[1];
            }
            var userAgent = req.headers['user-agent'];
            var str = ip + ':' + userAgent;
            console.warn(str);
            var hash = crypto.createHash('md5').update(str, 'utf-8').digest("hex").toUpperCase();
            return hash;
        }
    }
};