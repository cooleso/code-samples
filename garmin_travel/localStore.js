// модуль для у правления localStorage. Грузим данные с сервера, если их нет в localStorage, или auth.getAuthData() возвращает значение build, отличное от хранящегося в localStorage.

angular.module('gt')
    .service('localStore', ['gt.auth.authService', '$q', 'utils', '$rootScope', 'settings', function (auth, $q, utils, $rootScope, settings) {
        var storageEnabled;
        var loadedDefer = $q.defer();

        if (typeof(Storage) !== "undefined") {
            var build = localStorage.getItem('build');
            $q.when(auth.getAuthData()).then(function (data) {
                    if (data.build == build) {
                        if(loadFromStorage()){
                            loadedDefer.resolve($rootScope.static.poiGroups)
                        }else{
                            loadFromDB(function (err) {
                                if (err) {
                                    console.error(err);
                                    loadedDefer.reject();
                                    return;
                                }
                                saveToStorage(data.build);
                                loadedDefer.resolve($rootScope.static.poiGroups);

                            });
                        }
                    } else {
                        loadFromDB(function (err) {
                            if (err) {
                                loadedDefer.reject();
                                return;
                            }
                            saveToStorage(data.build);
                            loadedDefer.resolve($rootScope.static.poiGroups);
                        })
                    }
                },
                function () {
                    loadedDefer.reject();
                }
            );
        } else {
            storageEnabled = false;
            loadFromDB(function (err) {
                if (err) {
                    loadedDefer.reject();
                    return;
                }
                loadedDefer.resolve($rootScope.static.poiGroups);
            });
        }

        function loadFromDB(cb) {
            utils.req('GET', settings.server.path + "static/get")
                .success(function (data) {
                    $rootScope.static = data;
                    sortPoiGroups($rootScope.static.poiGroups);
                    cb(null);
                })
                .error(function (data) {
                    cb(data)
                })
            ;

        }

        // сортировки не будет! барем из базы как есть, если нада, то сортируем вручную в базе
        function sortPoiGroups(data){
            getParent();
            function getParent(){
                for(var i= 0,n=data.length; i<n; ++i){
                    if(isParent(data, i)){
                        data[i].is_parent = true;
                    }
                }
            }

            function isParent(data, i){
                var arr = (data[i].poi_group_id).split('.');
                var stage = arr.length;
                if(data.length> (i+1)){

                    var arr2= data[i+1].poi_group_id.split('.');
                    if(arr2.length>stage){
                        return true;
                    }
                }
                return false;
            }
        }

        function loadFromStorage(){
            try{
                $rootScope.static = {
                    regions:JSON.parse(localStorage.getItem('regions')),
                    routeTypes: JSON.parse(localStorage.getItem('routeTypes')),
                    poiGroups: JSON.parse(localStorage.getItem('poiGroups'))
                };

                if(!!$rootScope.static.regions && !!$rootScope.static.routeTypes && !!$rootScope.static.poiGroups){
                    return true
                }else{
                    return false;
                }
            }catch(err){
                localStorage.setItem('build', 0);
                return false;
            }
        }

        function saveToStorage(build){
            localStorage.setItem('regions', JSON.stringify($rootScope.static.regions));
            localStorage.setItem('routeTypes', JSON.stringify($rootScope.static.routeTypes));
            localStorage.setItem('poiGroups', JSON.stringify($rootScope.static.poiGroups));
            localStorage.setItem('build', build);
        }

        //--public-----

        this.loaded = function () {
            return loadedDefer.promise;
        };

    }]);