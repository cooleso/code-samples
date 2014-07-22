// директива отвечает за рендеринг траектории трека на карте

angular.module('gt')
    .directive('mapRoute', ['gmap', '$timeout', '$q', function (gmap, $timeout, $q) {
        return{
            restrict: 'E',
            translcude: true,
            link: function (scope, el, attr) {               
				var polyline = null;
				$q.when(gmap.getMap()).then(function (map) {
					var polyline = null;
					var listeners;
					var unwatch = scope.$watch('route', function (route) {
						if (polyline !== null) {
							polyline.setMap(null);
						}
						var polylinePath = polylineFromRoute(route.point);

						polyline = new google.maps.Polyline({
							path: polylinePath,
							strokeColor: getColor(scope.route.active),
							map: map,
							icons:[{
								icon:{
									path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
									scale:2
								},
								repeat:'100px'
							}]
						});
						scope.$watch('route.selected', function (newVal) {
							var color = getColor(newVal),
								width = 3;
							if (newVal) {
								width = 5
							}

							polyline.setOptions({
								strokeColor: color,
								strokeWeight: width
							});
							watchVisible();
						});

						scope.$watch('route.visible', function (newVal) {
							polyline.setVisible(newVal);
							angular.forEach(scope.route.waypoints, function(wp){
								wp.visible = newVal;
							});
						});

						listeners = [
							google.maps.event.addListener(map, 'zoom_changed', function(){
								scope.route.mapZoom = map.getZoom();
								if(!scope.$$phase){
									scope.$apply();
								}
							})
						];

						scope.$on('route_point_deleted', function(e, num){
							if(_.isArray(num)){
								_.each(num,function(i){
									polylinePath.removeAt(i);
									//OMG смещаем индексы, так как элемент массива удаляется
									_.each(num, function(j,index){
										if(j>i){num[index]-=1;}
									});
								});
							}else{
								//удаляем одну точку
								polylinePath.removeAt(num);
							}
						});
						// если хотим, что-бы чентрировалась карта, надо для route изменить active
						scope.$watch('route.active', function (newVal) {
							watchVisible();
							if(newVal){
								extendMapBounds(scope.route.point);
							}
						});

						// следим за заменой route.point
						scope.$watch('route.point', function (point, prev) {
							for(var i= 0, n=polylinePath.getLength(); i<n;++i){
								polylinePath.pop();
							}
							for(i=0, n=point.length;i<n;++i){
								polylinePath.push(new google.maps.LatLng(point[i].y, point[i].x))
							}
						},false);
						unwatch();
					}, false);


					scope.$on('$destroy', function () {
						if(!!polyline){
							polyline.setMap(null);
						}
						for (var i = 0, l = listeners.length; i < l; ++i) {
							google.maps.event.removeListener(listeners[i]);
						}
					});

				});

                function extendMapBounds(points) {
                    if (points.length > 0) {
                        var bounds = new google.maps.LatLngBounds();
                        for (var i = 0; i < points.length; i++) {
                            bounds.extend(new google.maps.LatLng(points[i].y, points[i].x));
                        }
                        gmap.getMap().fitBounds(bounds);
                    }
                }

                var polylineFromRoute = function (points) {
                    var res = new google.maps.MVCArray();
                    _.each(points, function (point) {
                        res.push(new google.maps.LatLng(point.y, point.x));
                    }, this);
                    if(res.length === 0){
                        res.push(new google.maps.LatLng(0, 0));
                        res.push(new google.maps.LatLng(0, 0));
                    }
                    return res;
                };
                var getColor = function (active) {
                    if (!active) {
                        return 'green'
                    } else {
                        return 'yellow'
                    }
                };

                var watchVisible = function () {
                    if (scope.route.active || scope.route.selected) {
                        scope.route.visible = true;
                    }
                    else {
                        scope.route.visible = false;
                    }

                }

            }
        }
    }]);