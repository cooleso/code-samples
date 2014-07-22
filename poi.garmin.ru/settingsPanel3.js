// модуль отвечает за вывод панели настроек для одной точки poi. Соответственно подгружает все настройки по-отдельности.

define(['text!PoiSettings/settingsPanel3.html',
    'PoiSettings/modules/coordinates',
    'PoiSettings/modules/typeSelector',
    'PoiSettings/modules/description',
    'PoiSettings/modules/catSelector',
    'PoiSettings/modules/Alert/proximity',
    'PoiSettings/modules/Alert/circles',
    'PoiSettings/modules/Alert/minSpeed',
    'PoiSettings/modules/mapInfo/testModule',
    'PoiSettings/modules/operationTime',
    'PoiSettings/modules/collections',
    'PoiSettings/modules/radiusSetting',
    'PoiSettings/modules/gallery',
    'PoiSettings/modules/helper',
    'PoiSettings/modules/trailParams',
    'jquery',
    'lib/jquery-ui/core',
    'lib/jquery-ui/dialog',
    'lib/jquery-ui/slider',
    'lib/layout/jquery.layout'

],
    function (template, Coordinates, TypeSelector, Description, CatSelector, Proximity, Circles, MinSpeed, TestModule, OperationTime, Collections, RadiusSetting, Gallery, Helper, TrailParams) {
        var SettingsPanel3 = function (div_id, authController, mapController) {
            this.mapController = mapController;
            this.authController = authController;
            this.div = document.getElementById(div_id);

            this.moduleConstructors = {
                coordinates: Coordinates,
                description: Description,
                typeSelector: TypeSelector,
                catSelector: CatSelector,
                proximity: Proximity,
                circles: Circles,
                minSpeed: MinSpeed,
                testModule: TestModule,
                operationTime: OperationTime,
                collections: Collections,
                radius: RadiusSetting,
                gallery: Gallery,
                helper: Helper,
                trailParams: TrailParams
            };
            this.modules = {};

            this.templateData = {
                panelHeader: PC.Data.getPoiTypeByGCat(51).name
            };
            $(this.div).html(_.template(template, this.templateData));
            $('#settingsPanelCloseImage').click($.proxy(function () {
                this.hide();
                $(this).trigger('pointEditComplete');
            }, this));
            this.fullViewMode = true;
            this._setViewMode(false);// показывать все свойства или только самые необходимые
            $('#alertEditMoreSettings').click($.proxy(function () {
                this._setViewMode(!this.fullViewMode);
            }, this));
            $('#delBtn').button({icons: {primary: 'ui-icon-trash'},
                label: 'Удалить точку'
            });
            $('#delBtn').click($.proxy(this, '_deletePoint'));

            $('#settingsBtnApply').button();
            $('#settingsBtnApply').click($.proxy(function () {
                this.apply();
            }, this));

            $('#settingsBtnCancel').button();
            $('#settingsBtnCancel').click($.proxy(function () {
                this.hide();
                $(this).trigger('pointEditComplete');

            }, this));
            this.pointData = {};
            this.mode = 'new'; // new, edit
            this.fullViewMode = false;

            $(this.mapController).on('point_deleted', $.proxy(function () {
                this.hide();
            }, this));
            this.defaultComment = "Точка промодерирована";
            $('#settingsPanel').layout({
                defaults: {
                    closable: false,
                    resizable: false,
                    slidable: false,
                    spacing_closed: 0,
                    spacing_open: 0
                },
                north: {
                    size: 20
                }
            });
            /*   this.keyupHanlder = function(){
             $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
             }
             $('input.numeric').on('keyup', this.keyupHanlder);  */

        };

        SettingsPanel3.prototype = {
            /*
             mode:{'new', 'edit'}
             data: getpoi data, если mode = 'new' то передаем type_id (poi_type) и Icon(GCat)
             */
            show: function (data, mode) {
                this.pointData = data;
                this.mode = mode;
                $('#settingsPanelHeaderName').html(PC.Data.getPoiTypeByGCat(data.Icon).name);

                this.showModules(mode, data);
                if (mode == 'new') {
                    $('#delBtn').css('display', 'none');
                } else {
                    $('#delBtn').css('display', 'block');
                }
                this.div.style['display'] = 'block';
                var poiType = PC.Data.getPoiTypeByGCat(data.Icon);
                // если точка - предупреждение и юзер - модератор
                if (mode == 'edit' && (this.authController.getUserData()).role == 'moder') {
                    $('#alertEditAddCommentModule').css('display', 'block');
                    $("#alertEditComment").val(this.defaultComment);
                } else {
                    $('#alertEditAddCommentModule').css('display', 'none');
                }
                // $('input.numeric').unbind('keyup');
                /*$('input.numeric').on('keyup', function (e) {

                 $(this).val($(this).val().replace(/[^0-9\.]/g, ''));
                 });  */


            },
            hide: function () {
                this.div.style['display'] = 'none';
                this.hideModules();

                //this._setViewMode(false);

                $(this).trigger('settingsPanelClosed');
                $(this).trigger("resize_map");
            },

            getEditedPointParams: function () { // контроллер запрашивает эту функцию для определения параметров редактируемой точки (используется при первом показе точки, когда пользователь еще не совершал действий)
                if (this.mode != 'new' && this.mode != 'edit') {
                    return null;
                }
                var res = this.getData();
                return res;

            },

            showModules: function (mode, pointData) {
                _.each(PC.Data.GCats[pointData.Icon].modules, function (moduleSettings, moduleName) {
                    if (this.authController.getUserData().role != 'moder' && moduleName == 'collections') {
                        return;
                    }
                    this.showModule(mode, moduleName, _.clone(pointData));
                }, this);
                if ((this.authController.getUserData()).role == 'user') {
                    this._setViewMode(false);
                }
                if (this.authController.getUserData().role == 'moder' && this.fullViewMode == false) {
                    this._setViewMode(false);
                }
            },
            showModule: function (mode, moduleName, pointData) {
                if (!this.modules[moduleName]) {
                    this.modules[moduleName] = new this.moduleConstructors[moduleName]('module_' + moduleName, this);
                }
                this.modules[moduleName].activate(true);
                this.modules[moduleName].setup(mode, pointData);
            },

            hideModules: function () {
                _.each(this.modules, function (module, moduleName) {
                    module.activate(false);
                    module.hide();
                }, this);
            },
            updateModules: function (pointData) {
                var newPointData = _.clone(pointData);
                this.pointData = _.extend(this.pointData, newPointData);
                this.hideModules();
                _.each(PC.Data.GCats[this.pointData.Icon].modules, function (module, moduleName) {
                    if (this.authController.getUserData().role != 'moder' && moduleName == 'collections') {
                        return;
                    }

                    if (!this.modules[moduleName]) {
                        this.modules[moduleName] = new this.moduleConstructors[moduleName]('module_' + moduleName, this);
                    }
                    this.modules[moduleName].activate(true);
                    this.modules[moduleName].update(this.pointData);
                }, this);
                $(this).trigger('pointSettingsChanged', this.getData());
                $(this).trigger('typeChanged', this.pointData.Icon);
            },
            _setViewMode: function (viewMode) {
                if (viewMode === true)// все настройки
                {
                    this.fullViewMode = true;
                    $('#alertEditMoreSettings').html('Меньше настроек <<');
                    _.each(this.modules, function (module) {
                        module.setOlwaysVisible();
                    }, this);
                } else {
                    this.fullViewMode = false;
                    $('#alertEditMoreSettings').html('Больше настроек >>');
                    _.each(this.modules, function (module) {
                        module.unsetOlwaysVisible();
                    }, this);
                }

            },
            _deletePoint: function () {
                var poiid = this.pointData.POIID;
                $(this).trigger('delete_point', poiid);
            },

            apply: function () {
                var me = this;
                if (!this.validate()) {
                    return;
                }
                var data = this.getData();
                var method = (this.mode == 'new') ? 'add_poi' : 'mdf_poi';
                this.authController.request2({
                    url: '../../AddMdf.aspx?method=' + method,
                    data: data
                }).done($.proxy(function (reqData) {
                        this.hide();
                        $(this).trigger('pointEditComplete');
                        var isModer = ((this.authController.getUserData()).role == 'moder') ? true : false;
                        if ((this.mode == 'edit') && ($('#alertEditAddComment').attr('checked')) && isModer) {
                            this.sendComment();
                        }
                        PC.Data.setPointStatistic(reqData.pointStat);
                    }, this));


            },
            /*   sendComment:function () {

             this.authController.request2({
             url:'../../AddMdf.aspx?method=add_comment',
             data:{
             POIID:this.pointData.POIID,
             Text:$("#alertEditComment").val()
             }
             }).done($.proxy(function (data) {
             this.authController.request2({
             url:'../../Info.aspx?method=comviewed',
             data:{
             comments:[data.id],
             viewed:true
             }
             });
             }, this));
             },*/

            validate: function () {
                var ok = true;
                for (var key in this.modules) {
                    if (this.modules[key].IsActive()) {

                        if (!this.modules[key].validate()) {
                            ok = false;
                            this.modules[key].setOlwaysVisible();
                            break;
                        }
                    }
                }

                return ok;
            },
            setCoordinates: function (latlng) {
                if (this.modules['coordinates'] && this.modules['coordinates'].IsActive()) {
                    this.pointData.Lat = latlng.lat();
                    this.pointData.Lon = latlng.lng();
                    this.modules['coordinates'].update(this.pointData);
                }
            },
            fireLatlngChangedEvent: function () {
                var data = this.modules.coordinates.getData();
                if (!(data.Lat && data.Lon)) {
                    return;
                } // если формат координат не верен не включаем событие
                var latlng = new google.maps.LatLng(data.Lat, data.Lon);
                if (latlng != undefined) {
                    $(this).trigger('latlngChanged', latlng);
                }
            },
            getData: function () { // формат данных универсальный для всех модулей и для сервера
                //
                //
                //добавить poi_type!!!
                var data = _.clone(this.pointData);

                // !!!
                // if (!data.SettingsCustom) {
                data.SettingsCustom = [];
                // }


                // собираем данные от каждого модуля
                _.each(this.modules, function (module, moduleName) {
                    // SettingsCustom добавляем в общий массив SettingsCustom c заменой, остальное просто добавляем
                    if (module.IsActive()) {
                        var moduleData = module.getData();

                        if (moduleData.SettingsCustom) {
                            var settingsCustom = _.clone(moduleData.SettingsCustom);
                            delete moduleData.SettingsCustom;
                            for (i = 0; i < settingsCustom.length; ++i) {
                                PC.Utils.setSettingById(
                                    settingsCustom[i].id,
                                    settingsCustom[i].value,
                                    data.SettingsCustom);
                            }
                        }
                        data = _.extend(data, moduleData);

                        /* if (moduleData.SettingsCustom) {
                         var newData = moduleData.SettingsCustom;
                         var i;
                         for(i=0;i<moduleData.SettingsCustom.length;++i){
                         PC.Utils.setSettingById(
                         moduleData.SettingsCustom[i].id,
                         moduleData.SettingsCustom[i].value,
                         data.SettingsCustom);
                         }
                         } else {
                         data = _.extend(data, module.getData());
                         }*/
                    }
                }, this);
                // потом преобразовываем данные в нужный формат
                var poiType = PC.Data.getPoiTypeByGCat(data.Icon);
                data.Type_id = poiType.id;
                var poiTypeId = parseInt(poiType.id);
                if (poiTypeId == 1 || poiTypeId == 5) { // если точка является предупреждением
                    data.Alert = {
                        ATYPE_ID: 2,
                        Proximity: parseInt(data.Proximity),
                        MinSpeed: data.MinSpeed,
                        Enabled: true,
                        Circles: [],
                        Bearings: data.Bearings
                    };
                    data.IsAlert = true;
                    delete data.Proximity;
                    delete data.MinSpeed;
                    delete data.Bearings;
                } else {
                    data.IsAlert = false;
                }

                this.data = data;
                return data;
            },
            updateData: function (data) { // обновляем данные на панели при дергании слайдеров, чтобы быстро работало
                if (data.Alert) {
                    this.data.Alert = _.extend(this.data.Alert, data.Alert);
                }
                delete data.Alert;
                this.data = _.extend(this.data, data);
                return this.data;
            },
            sendComment: function () {
                this.authController.request2({
                    url: '../../AddMdf.aspx?method=add_comment',
                    data: {
                        POIID: this.pointData.POIID,
                        Text: $("#alertEditComment").val()
                    }
                }).done($.proxy(function (data) {
                        this.authController.request2({
                            url: '../../Info.aspx?method=comviewed',
                            data: {
                                comments: [data.id],
                                viewed: true
                            }
                        });
                    }, this));
            }

        };

        return SettingsPanel3;
    });