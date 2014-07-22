// всплывающее окно на для маркера на карте. Сервис MarkerPanel расширяет google.maps.OverlayView. Директива markerPanel - слушает модель и управляет MarkerPanel.  
angular.module('gt')
    .factory('MarkerPanel', ['gmap', function (gmap) {
        var MarkerPanel = function (params) {
            this.marker = params.marker;
            this.iconParams = params.iconParams;
            this.div = params.el.get(0);
            this.el = params.el;
            this.setMap(gmap.getMap());
        };

        MarkerPanel.prototype = $.extend(new google.maps.OverlayView, {
            onAdd: function () {
                var prj = this.getProjection();
                var latLng = this.marker.getPosition();
                var position = prj.fromLatLngToDivPixel(this.marker.getPosition());
                this.div.style.left = '0px';
                this.div.style.top = '0px';
                this.getPanes().floatPane.appendChild(this.div);
                //   google.maps.event.addListener(this, 'click', function (e) {
                //  });
            },
            onRemove: function () {
                this.div.parentNode.removeChild(this.div);
            },
            draw: function () {
                var prj = this.getProjection();
                if (!!prj) {
                    var position = prj.fromLatLngToDivPixel(this.marker.getPosition());
                    this.div.style.left = (position.x + this.iconParams.width / 2) + 'px';
                    this.div.style.top = (position.y - this.iconParams.height / 2 - 10) + 'px';
                }
            },
            show: function () {
                gmap.centerOnMap(this.marker, this.div);
                $(this.div).fadeIn(200);
            },
            hide: function (delay) {
                var _this = this;
                if (delay) {

                    //_this.div.style.display = 'none';
                    fadeOut();

                } else {
                    fadeOut();
                    //this.div.style.display = 'none';
                }
                function fadeOut() {
                    //$timeout(function(){
                    //   if()
                    $(_this.div).fadeOut(200);
                    // },200);


                }
            },
            setName: function (name) {
                $(this.div).find('.name-value').html(name);
            }
        });
        return MarkerPanel;
    }])
    .directive('markerPanel', ['MarkerPanel', '$timeout', 'settings', function (MarkerPanel, $timeout, settings) {
        return{
            restrict: 'E',
            require: '^mapMarker',
            transclude: true,
            replace: true,
            templateUrl: 'template/map/popup/markerPanel.html',
            link: function (scope, el, attr, ctrl) {
                el.on('click', function (e) {
                    e.preventDefault();
                });

                /// не срабатывает никогда (проверить $droadcast marker_select)
                scope.$on('marker_selected', function (e, data) {
                    if (data.scopeId != scope.$id) {
                        scope.wayPoint.active = false;
                    }
                });
                var marker = ctrl.getMarker();
                var markerPanel = new MarkerPanel({
                    marker: ctrl.getMarker(),
                    iconParams: ctrl.getIconParams(),
                    el: el
                });

                var hoverEnabled = settings.map.markerHoverEnabled;

                var listeners = [
                    google.maps.event.addListener(marker, 'position_changed', function () {
                        markerPanel.draw();
                    }),
                    google.maps.event.addListener(marker, 'zindex_changed', function () {
                        markerPanel.draw();
                    }),
                    google.maps.event.addListener(marker, 'drag', function (e) {
                        markerPanel.draw();
                    }),
                    google.maps.event.addListener(marker, 'mouseover', function (e) {
                        if (hoverEnabled) {
                            markerPanel.show();
                            markerPanel.draw();
                            scope.$apply(function () {
                                scope.hover = true;
                            })
                        }
                    }),
                    google.maps.event.addListener(marker, 'mouseout', function () {
                        scope.$apply(function () {
                            scope.hover = false;
                        })
                    }),
                    /*   google.maps.event.addListener(marker, 'mouseout', function (e) {
                     if (!scope.wayPoint.active) {
                     markerPanel.hide();
                     }
                     }),  */
                    google.maps.event.addDomListener(el.get(0), 'mouseover', function () {
                        scope.$apply(function () {
                            scope.hover = true;
                        })
                    }),
                    google.maps.event.addDomListener(el.get(0), 'mouseout', function () {
                        scope.$apply(function () {
                            scope.hover = false;
                        })
                    })

                ];

                scope.$watch('hover', function (val) {
                    if (hoverEnabled) {
                        if (!val && !scope.wayPoint.active) {
                            $timeout(function () {
                                if (!scope.hover) {
                                    markerPanel.hide();
                                }
                            }, 200);
                        }

                    }
                });
                scope.$watch('wayPoint.active', function (newVal) {
                    if (!!newVal) {
                        markerPanel.show();
                        markerPanel.draw();
                    } else {
                        markerPanel.hide();
                    }
                }, true);

                scope.$watch('wayPoint.visible', function (newVal) {
                    if (!newVal) {
                        markerPanel.hide();
                    }
                });
                scope.$watch('wayPoint.name', function (newVal) {
                    markerPanel.setName(newVal);
                });

                scope.$on('$destroy', function () {
                    for (var i = 0, l = listeners.length; i < l; ++i) {
                        google.maps.event.removeListener(listeners[i]);
                    }
                    markerPanel.setMap(null);
                    markerPanel = null;
                });

                scope.removeSelection = function () {
                    if (scope.wayPoint.active) {
                        scope.wayPoint.setActive(false);
                    }
                    markerPanel.hide();

                };
            }
        }
    }]);