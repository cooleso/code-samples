// немного наколхозил с web api. Формируется Массив methods, который используется и для выбора метода, который обрабатывает запрос, и для формирования странички с описанием методов api

var
    //log = require('../utils/log')(module),
    log = require('intel'),
    _ = require('lodash'),
    userTypes = require('../data/UserTypes');

module.exports = function (app) {

    var intel = require('intel');
    var logger = intel.getLogger('main.test');

    //logger.error('ermahgawd', new Error('boom'));


    var apiDescr = [];




    var addMethod = function (obj) {
        if (!obj.middleware) {
            obj.middleware = [];
        }
        if (_.isObject(obj)) {
            if (obj.method == "POST") {
                app.post(obj.path, obj.middleware, obj.action);
            } else {
                app.get(obj.path, obj.middleware, obj.action);
            }
        }
        apiDescr.push(getDescr(obj));
    };

    addMethod("Авторизация на сайте");
    addMethod(require('./auth/current'));
    addMethod(require('./auth/login'));
    addMethod(require('./auth/logout'));
    addMethod(require('./auth/reg'));
    addMethod(require('./auth/restore'));
    addMethod("Работа с маршрутами");
  //  addMethod(require('./routes/build'));
    addMethod(require('./routes/getById'));
    addMethod(require('./routes/get'));
    addMethod(require('./routes/save'));
    addMethod(require('./routes/update'));
    addMethod(require('./routes/delete'));
    addMethod(require('./routes/findLast'));
    addMethod("Работа с путевыми точками пользователя");
    addMethod(require('./waypoints/create'));
    addMethod(require('./waypoints/get'));
    addMethod(require('./waypoints/update'));
    addMethod(require('./waypoints/delete'));
    addMethod('Работа с точками POI');
    addMethod(require('./poi/get'));
    addMethod('Данные для приложения');
    addMethod(require('./static/get'));
    addMethod('Поиск');
    addMethod(require('./city/get'));
    addMethod(require('./city/find'));

    app.get('/', function (req, res) {
        //res.locals.decode = getFormat;
        res.locals._ = _;
        res.locals.userTypes = userTypes;
        res.render('index');
    });

    app.get('/api', function (req, res) {
        res.end(JSON.stringify({methods: apiDescr, userTypes: userTypes}));
    })


}

var getDescr = function (method) {
    if (typeof method == 'object') {
        return {
            path: method.path,
            descr: method.descr,
            method: method.method,
            //нужно для формирования описания
            responseFormat: method.responseFormat,
            requestFormat: method.requestFormat
        }
    } else {
        return method;
    }
};

