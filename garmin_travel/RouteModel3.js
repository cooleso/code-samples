//сервис RouteModel - модель маршрута, описывает бизнес-логику маршрута.

angular.module('gt')
    .factory('RouteModel', ['$rootScope', 'settings', '$resource', 'errorHandler', '$q', 'nmsRouteModel', 'WayPointModel', 'utils', function ($rootScope, settings, $resource, errorHandler, $q, NmsRouteModel, WayPoint, utils) {


        var routeResource = $resource(settings.server.resourcePath + 'routes/:action/:id', {}, {
            findOne: {
                method: 'GET',
                params: {
                    action: 'get',
                    id: '@id'
                }
            },
            create: {
                method: 'POST',
                params: {
                    action: 'save'
                }
            },
            update: {
                method: 'POST',
                params: {
                    action: 'update'
                }
            },
            delete: {
                method: 'POST',
                params: {
                    action: 'delete'
                }
            }
        });

        var _computeMarkers = function (points) {
            var i;
            for (i = 0; i < points.length; ++i) {
                var point = points[i];
                if (point.index != i) {
                    point.setIndex(i);
                }
            }
            // сортируем, так как на сервер нумерация идет в порядке очереди точек
            _.sortBy(points, function (wp) {
                return wp.index;
            });
            return points;
        };

        var RouteModel = function (index) {
            // что-бы определять, waypoint входит в route или нет
            this.is_route = true;
            this.index = index;
            this.waypoints = [];
            this.point = [];
            // становится true при загрузке точек. нужно для отределения асинхронной первоначальной загрузки с сервера, по point.length определять не получается, так как есть режим редактирования, и в нем тоже надо определять первоначальную загрузку точек
            this.pointLoaded = false;
            this.is_track = false;
            // находится ли маршрут в режиме редактирования (пока не нужно)
            this.edit = false;
            // показывать/не показывать на карте
            this.visible = true;
            // выбран или нет для дальнейших действий (используется при сохранении нескольких треков из навигатора),
            this.selected = false;
            // выделен на карте
            this.active = true;
            this.id = 0;
            this.drive_time = null;
            this.drive_length = null;
            this.instructions = null;
            this.instructionsSegments = null;
            this.cities = [];
            // маршрут доступен всем или только создателю
            this.is_public = false;
            // если route editabble, то wayPoints, создаваемые в ней, тоже будут editable
            this.editable = false;
            // по-умолчанию атомобильный маршрут
            this.route_type_id = 1;
            // скорость взята из трека
            this.speedFromTrack = false;

        };

        RouteModel.prototype = {
            // добавляем wp при редактировании маршрута
            addWayPoint: function (data) {
                if (this.point.length > 0) {
                    return this.addWayPointToTrack(data);
                }

                var len = this.waypoints.length;
                // создает точку, ставит ей max индекс
                var wp = this.createWayPoint(data);
                if (len < 2) {
                    this.waypoints.push(wp);
                    // вставляем мовый wp на предпоследнее место
                } else {
                    this.waypoints.splice(len - 1, 0, wp);
                }
                // расставляет индексы для wp в соответствии с индексом в массиве
                _computeMarkers(this.waypoints);
               // this.selectWayPoint(wp.index);
                return wp;
            },


            // добавляет wp и присваивает ей номер исходя из трека
            addWayPointToTrack: function (data) {
                // вычисляем номер точки трека, длижайщей к добавляемой
                if (this.point.length == 0) {
                    return this.addWayPoint(data);
                }

                var ptNum = this._getNumPt(data);
                var ptNums = [];
                //вычисляем номера ближайших точек трека ко всем wp, которые меньше добавляемой
                _.each(this.waypoints, function (wp, index) {
                    var pt = this._getNumPt(wp);
                    if (pt <= ptNum) {
                        ptNums.push({wp: index, pt: pt});
                    }
                }, this);
                // если добавляемая точка самая первая ставим ее первой
                var maxWpIndex;
                if (ptNums.length == 0) {
                    maxWpIndex = -1;
                } else {
                    // ищем max номер точки трека и индекс wp из ближайших к wp, кототый меньше ptNum
                    var maxPtNums = _.max(ptNums, function (pt) {
                        return pt.pt;
                    });
                    maxWpIndex = maxPtNums.wp;
                }
                this._addWayPointAfter(data, maxWpIndex);
            },

            // добавляет новый WP после wp с указанным индексом (afterIndex)
            _addWayPointAfter: function (data, afterIndex) {
                var wp = this.createWayPoint(data);
                this.waypoints.splice(afterIndex + 1, 0, wp);
                _computeMarkers(this.waypoints);
                this.selectWayPoint(wp.index);
                return wp;
            },

            // определяем ближайшую точку к заданным координатам
            _getNumPt: function (point) {
                var ptMinDist = utils.getLength(this.point[0], point);
                var l;
                var minDistIndex = 0;
                for (var i = 1, n = this.point.length; i < n; ++i) {
                    //_.each(this.point, function(pt, index){
                    l = utils.getLength(this.point[i], point);
                    if (l < ptMinDist) {
                        ptMinDist = l;
                        minDistIndex = i;
                    }
                    //},this);
                }
                return minDistIndex;
            },


            addMiddlePoints: function (numPoints) {
                //вычисляем ближайшие точки к waupoints
                // не ставим промежуточные точки до 1-й и после последней
                var points = this.point;
                var midWps = [];
                var routeLength = this.drive_length;
                var itemLength = routeLength / (parseInt(numPoints) + 1);
                //индекс для каждой точки в маршруте
                var j = 1;
                // коэффициент, на который умножаем расстояние между промежуточными точками, что-бы отсчитать расстояние от начала трека до нужной точки
                var i = 1;
                var sumLength = 0;

                while ((j <= points.length - 1) && (midWps.length < numPoints)) {
                    var len = itemLength * i;
                    if ((sumLength < len)) {
                        while ((sumLength < len) && (j < points.length - 1)) {
                            sumLength += utils.getLength(points[j - 1], points[j]);
                            j++;
                        }
                    } else {
                        sumLength += utils.getLength(points[j - 1], points[j]);
                        j++;
                    }
                    midWps.push({x: points[j - 1].x, y: points[j - 1].y});
                    this.addWayPointToTrack({x: points[j - 1].x, y: points[j - 1].y, middle: true});
                    ++i;
                }

            },

            deleteMiddlePoints: function () {
                _.remove(this.waypoints, function (wp) {
                    return wp.middle;
                });
                _computeMarkers(this.waypoints);
            },

            // добавляем wp из набора данных (при загрузке маршрута)
            createWayPoint: function (data) {
                var wp = new WayPoint(this, this.waypoints.length, data);
                if (this.editable) {
                    wp.editable = true;
                }
                return wp;
            },


            deleteWayPoint: function (index) {
                this.waypoints.splice(index, 1);
                this.waypoints = _computeMarkers(this.waypoints);

            },
            selectWayPoint: function (index) {
                _.each(this.waypoints, function (wp) {
                    if (wp.active) {
                        wp.setActive(false);
                    }
                }, this);
                this.waypoints[index].setActive(true);
                //this.waypoints[index].active = true;
            },
            // move up waypoint
            moveUp: function (num) {
                var points = this.waypoints;
                if (points.length > 1 && num != 0) {
                    var start = (points.length > 1) ? points.slice(0, num - 1) : [];
                    var mid1 = points.slice(num - 1, num + 1);
                    var mid2 = mid1.reverse();
                    var end = points.length > num + 1 ? points.slice(num + 1, points.length) : [];
                    this.waypoints = start.concat(mid2, end);
                    this.waypoints = _computeMarkers(this.waypoints);
                    // this.scope.$apply();
                }
            },
            //moveDown waypoint
            moveDown: function (num) {
                var points = this.waypoints;
                if (points.length > 1 && num != points.length - 1) {
                    var start = (points.length > 1) ? points.slice(0, num) : [];
                    var mid1 = points.slice(num, num + 2);
                    var mid2 = mid1.reverse();
                    var end = points.length > num + 2 ? points.slice(num + 2, points.length) : [];
                    this.waypoints = start.concat(mid2, end);
                    //markers = computeMarkers();
                    this.waypoints = _computeMarkers(this.waypoints);
                }
            },

            load: function (id) {
                this.id = id;
                var defer = $q.defer();
                var me = this;
                var route = routeResource.findOne({id: id},
                    function () {
                        // нада выцепить Waypoints
                        angular.extend(me, route);
                        me.waypoints = [];
                        _.each(route.waypoints, function (point) {
                            var wp = me.createWayPoint(point);
                            me.waypoints.push(wp);
                        });
                        _computeMarkers(me.waypoints);
                        me.active = true;
                        me.pointLoaded = true;
                        defer.resolve();
                        //определяем, есть ли данные о скорости в базе
                        // в базе не должно быть null!!!
                        if(me.point[0].speed){
                            if (_.isNumber(parseFloat(me.point[0].speed))){
                                me.speedFromTrack = true;
                            }
                        }
                    },
                    function (data) {
                        defer.reject(data);
                    }
                );
                return defer.promise;
            },

            loadFromTrk: function (trk) {
                var data = {
                    name: trk.name,
                    is_track: true,
                    point: [],
                    waypoints: []
                };
                var points = [];
                if (_.isArray(trk.trkseg)) {
                    points = trk.trkseg;
                } else {
                    points.push(trk.trkseg);
                }
                // если есть extensions.TrackPointExtension
                // если в какой-то точке есть speed, значит speed берем отсюда, где нет speed, ставим speed=0;
                var hasSpeed = false, hasCourse = false, hasExtension = false;
                if (points.length > 0) {
                    if (points[0].trkpt.length > 0) {
                        if (points[0].trkpt[0].extensions) {
                            if (points[0].trkpt[0].extensions.TrackPointExtension) {
                                hasExtension = true;
                            }
                        }
                    }
                }
                _.each(points, function (pts) {

                    for (var i = 0, l = pts.trkpt.length; i < l; ++i) {
                        var pt = pts.trkpt[i];
                        var pointData = {
                            x: Math.floor(pt._lon * 10000000) / 10000000,
                            y: Math.floor(pt._lat * 10000000) / 10000000,
                            ele: parseFloat(pt.ele),
                            time: pt.time,
                            type: 0
                        };
                        if (hasExtension) {
                            var extension = pt.extensions.TrackPointExtension;
                            if (extension.speed) {
                                pointData.speed = Math.round(parseFloat(extension.speed.__text)*3.6*1000)/1000;
                                hasSpeed = true;
                            }
                            if (extension.course) {
                                pointData.course = Math.round(parseFloat(extension.course.__text)*100)/100;
                                hasCourse = true;
                            }
                        }
                        data.point.push(pointData);
                    }
                });
                if (hasSpeed) {
                    // скорость загружена из трека
                    this.speedFromTrack = true;
                }
                angular.extend(this, data);
                this.waypoints.push(this.createWayPoint({
                    x: data.point[0].x,
                    y: data.point[0].y,
                    name: 'Старт'
                }));
                this.waypoints.push(this.createWayPoint({
                    x: data.point[data.point.length - 1].x,
                    y: data.point[data.point.length - 1].y,
                    name: 'Финиш'
                }));
                _computeMarkers(this.waypoints);
                this.pointLoaded = true;
            },
            // вызывается на странице маршрута (summary), в процессе редактирования маршрута
            updateTrackParams: function () {
                var a = this.point;
                var minEle = null, maxEle = null;
                var isEle = !!a[0].ele;
                if (isEle) {
                    maxEle = a[0].ele;
                    minEle = a[0].ele;
                }

                var params = {
                    avgSpeed: null,
                    maxSpeed: null,
                    maxSpeedItem: null,
                    minEle: minEle,
                    maxEle: maxEle,
                    dist:0
                };

                if (this.speedFromTrack) {
                    computeWithSpeed(params);
                } else {
                    computeWithoutSpeed(params);
                }
                // есть ли в точках трека отметки со временем
                var len = a.length;
                this.drive_length = params.dist;
                if(a[0].time){
                    this.drive_time = getDriveTime(a[0].time, a[len - 1].time);
                    this.start_time = utils.getDate(a[0].time);
                    this.end_time = utils.getDate(a[len - 1].time);
                }
                this.avg_speed = Number(params.avgSpeed).toFixed(1);
                this.max_speed = Math.round(params.maxSpeed);
                this.max_ele = Math.round(params.maxEle * 10) / 10;
                this.min_ele = Math.round(params.minEle * 10) / 10;

                function getDriveTime(val1, val2) {
                    var ts1 = utils.getTimeStamp(val1),
                        ts2 = utils.getTimeStamp(val2);
                    var time = ts2 - ts1;
                    return Number(time / 1000 / 60).toFixed(2);
                }

                function computeEle(i, params) {
                    if (isEle) {
                        if (a[i].ele > params.maxEle) {
                            params.maxEle = a[i].ele;
                        }
                        if (a[i].ele < params.minEle) {
                            params.minEle = a[i].ele;
                        }
                    }
                }
                //avg_speed, max_speed, ele ,dist
                function computeWithSpeed(params) {
                    var line;
                    var len = a.length;

                    params.avgSpeed = a[0].speed?parseFloat(a[0].speed):0;
                    for (var i = 1; i < len; i++) {
                        var speed = parseFloat(a[i].speed);
                        if(isEle){
                            computeEle(i,params);
                        }
                        line = utils.getLength(a[i - 1], a[i]);
                        params.dist += line;

                        params.avgSpeed += speed?speed:0;
                        if (params.maxSpeed < speed) {
                            params.maxSpeed = speed;
                            params.maxSpeedItem = i;
                        }

                    }
                    params.avgSpeed = params.avgSpeed/len;
                }

                function computeWithoutSpeed(params) {
                    var line;
                    var isTime = !!a[0].time;
                    if (isTime) {
                        a[0].speed = 0;
                        params.avgSpeed = 0;
                        params.maxSpeed = 0;
                        params.maxSpeedItem = 0;
                    }
                    var speed, startSpeedIndex = 0;
                    var prevTime = utils.getTimeStamp(a[0].time);
                    var time;
                    var speedLine = 0;
                    var len = a.length;
                    for (var i = 1; i < len; i++) {
                        line = utils.getLength(a[i - 1], a[i]);
                        params.dist += line;
                        if(isEle){
                            computeEle(i, params);
                        }
                        if (isTime) {
                            time = utils.getTimeStamp(a[i].time);
                            speedLine += line;
                            // если прошло больше 10с, вычисляем среднюю скорость

                            //если ставить много секунд, то график получается слишком сглаженным на низких скоростях
                            //если ставить мало секунд (1-2) то вылезают ошибки на больших скоростях из-за маленького промежутка времени и большой дистанции
                            // в идеале надо считать по разному количеству точек на разных скоростях


                            if (time - prevTime >= 5 * 1000) {
                                speed = (speedLine / 1000) / ((time - prevTime) / (1000 * 60 * 60));
                                speed = Math.round(speed * 1000) / 1000;
                                // добавляем speed всем точкам, начиная со startSpeedIndex
                                for (var j = startSpeedIndex + 1, n = i; j <= n; ++j) {
                                    a[j].speed = speed;
                                    params.avgSpeed += speed;
                                }
                                if (params.maxSpeed < speed) {
                                    params.maxSpeed = speed;
                                    params.maxSpeedItem = i;
                                }
                                // бобавляем значения в avgSpeed, maxSpeed;
                                startSpeedIndex = i;
                                prevTime = time;
                                speedLine = 0;
                            }
                        }

                    }
                    if (isTime) {
                        params.avgSpeed = params.avgSpeed / len;
                    }
                }
            },

            clear: function () {
                this.waypoints = [];
                this.point = [];
                this.drive_time = null;
                this.drive_length = null;
                this.instructions = null;
                this.instructionsSegments = null;
            },
            save: function () {
                var defer = $q.defer();
                var saveData = {
                    name: this.name,
                    descrshort: this.descrshort,
                    drive_length: this.drive_length,
                    drive_time: this.drive_time,
                    point: getPointsForSave(this.point, this.speedFromTrack),
                    //waypoints: this.waypoints,
                    is_public: this.is_public,
                    is_track: this.is_track,
                    route_type_id: this.route_type_id,
                    cities: this.cities
                };
                var wps = [];
                _.each(this.waypoints, function (wp) {
                    wps.push({
                        index: wp.index,
                        name: wp.name,
                        x: wp.x,
                        y: wp.y,
                        wp_point_id: wp.wp_point_id,
                        poi_point_id: wp.poi_point_id
                    });
                });
                saveData.waypoints = wps;

                // promise
                routeResource.create(saveData,
                    function (data) {
                        defer.resolve(data);
                    },
                    function (data) {
                        defer.reject(data);
                    }
                );
                return defer.promise;
            },
            update: function () {
                var defer = $q.defer();
                var updateData = {
                    id: this.id,
                    name: this.name,
                    is_public: this.is_public,
                    descrshort: this.descrshort,
                    drive_length: this.drive_length,
                    drive_time: this.drive_time,
                    route_type_id: this.route_type_id,
                    point: getPointsForSave(this.point, this.speedFromTrack),
                    is_track: this.is_track,
                    cities: this.cities
                };
                var wps = [];
                _.each(this.waypoints, function (wp) {
                    wps.push({
                        index: wp.index,
                        name: wp.name,
                        x: wp.x,
                        y: wp.y,
                        wp_point_id: wp.wp_point_id,
                        poi_point_id: wp.poi_point_id
                    });
                });

                updateData.waypoints = wps;
                // promise
                routeResource.update(updateData,
                    function (data) {
                        defer.resolve(data);
                    },
                    function (data) {
                        defer.reject(data);
                    }
                );
                return defer.promise;
            },
            delete: function () {
                var defer = $q.defer();
                var me = this;
                routeResource.delete({id: this.id},
                    function (data) {
                        me.clear();
                        defer.resolve(data);
                    },
                    function (data) {
                        defer.reject(data);
                    });

                return defer.promise;
            },
            deletePt: function (num) {
                this.point[num] = null;
                this.point.splice(num, 1);
            },
            deletePtsInSquare: function (xmax, ymax, xmin, ymin) {
                var forDel = [];
                var _this = this;
                var nums = [];
                angular.forEach(this.point, function (pt, num) {
                    if (pt.x > xmin &&
                        pt.x < xmax &&
                        pt.y > ymin &&
                        pt.y < ymax) {
                        _this.point[num] = null;
                        nums.push(num);
                    }
                });
                _.remove(this.point, function (pt) {
                    return pt === null;
                });
                return nums;
            }
        };

        function getPointsForSave(points, containsSpeed) {
            var res = [];
            for (var i = 0, n = points.length; i < n; i++) {
                var p = points[i];
                var pt = {
                    x: p.x,
                    y: p.y
                };
                if (!!p.time) {
                    pt.time = p.time;
                }
                if (!!p.ele) {
                    pt.ele = p.ele;
                }
                if(containsSpeed){
                    pt.speed = p.speed? p.speed:0;
                }
                res.push(pt);
            }
            return res;
        }


        return RouteModel;
    }]);