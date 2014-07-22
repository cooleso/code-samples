// модуль для отображения координат точки на панели настроек.

define([
    'text!PoiSettings/modules/coordinates.html',
    'util/namespace',
    'util/utils',
    'PoiSettings/modules/alertEditModules/modulePanel'
],
    function (template, a, b, ModulePanel) {
        Coordinates = function (div_id, settingsPanel) {
            this.div_id = div_id;
            this.settingsPanel = settingsPanel;
            this.name = 'coordinates';
            this.defaultSettings = { //
                visibility: true
            };
            this.settings = _.clone(this.defaultSettings);
            Coordinates.superclass.constructor.call(this, div_id);
            this.div = document.getElementById(div_id);
            $(this.div).html(_.template(template, {}));
            $('#coordFormat').buttonset();
            this.setMode('gradMin');
            var me = this;
            $("input[name='coordFormat']").change(function () {
                me.setMode($(this).val());
            });
            $('#alertEditModuleLat').keyup($.proxy(function () {
                this.settingsPanel.fireLatlngChangedEvent();
            }, this));
            $('#alertEditModuleLng').keyup($.proxy(function () {
                this.settingsPanel.fireLatlngChangedEvent();
            }, this));

        }


        extend(Coordinates, ModulePanel);


        mixin(Coordinates.prototype, {
            setView: function () {
                if (this.settings.visibility || this.fullView) {
                    this.div.style.display = 'block';
                }
                else {
                    this.div.style.display = 'none';
                }
            },

            update: function (data) {
                this.settings = _.clone(this.defaultSettings);
                this.settings = _.extend(this.settings, PC.Data.GCats[data.Icon].modules[this.name]);
                if (data.Lat) {
                    this.settings.Lat = data.Lat;
                }
                if (data.Lon) {
                    this.settings.Lon = data.Lon;
                }
                $('#alertEditModuleLng').val(this.setDataFn(this.settings.Lon));
                $('#alertEditModuleLat').val(this.setDataFn(this.settings.Lat));
                this.setView();
                this.lat = data.Lat;
                this.lng = data.Lon;
                this.setData({
                    Lat: data.Lat, Lon: data.Lon
                });
            },

            validate: function () {
                var lat = $('#alertEditModuleLat').val();
                var lng = $('#alertEditModuleLng').val();
                if (PC.Validator.isEmpty('alertEditModuleLat', 'alertEditModuleLatError') ||
                    PC.Validator.isEmpty('alertEditModuleLng', 'alertEditModuleLngError')) {
                    return false;
                } else {
                    if (this.mode == 'gradMin') {
                        var re = /\d+[° ]\d+\.\d+/ig;
                        ;
                        if (!re.test(lat)) {
                            PC.Validator.Error('alertEditModuleLat', 'alertEditModuleLatError', 'Формат координаты должен быть ГГ°ММ.МММ');
                            return false;
                        }
                        var re = /\d+[° ]\d+\.\d+/ig;
                        if (!re.test(lng)) {
                            PC.Validator.Error('alertEditModuleLng', 'alertEditModuleLngError', 'Формат координаты должен быть ГГ°ММ.МММ');
                            return false;
                        }
                    } else if (this.mode == 'gradDeg') {
                        if (!parseInt(lat)) {
                            PC.Validator.Error('alertEditModuleLat', 'alertEditModuleLatError', 'Координата должна быть целым или дробным числом');
                            return false;
                        }
                        if (parseInt(lat) < 0 || parseInt(lat) > 180) {
                            PC.Validator.Error('alertEditModuleLat', 'alertEditModuleLatError', 'Неверное значение координаты');
                            return false;
                        }
                        if (!parseInt(lng)) {
                            PC.Validator.Error('alertEditModuleLng', 'alertEditModuleLngError', 'Координата должна быть целым или дробным числом');
                            return false;
                        }
                        if (parseInt(lng) < 0 || parseInt(lng) > 180) {
                            PC.Validator.Error('alertEditModuleLng', 'alertEditModuleLngError', 'Неверное значение координаты');
                            return false;
                        }
                    }
                    return true;
                }
            },

            setData: function (data) {
                $('#alertEditModuleLng').val(this.setDataFn(data.Lon));
                $('#alertEditModuleLat').val(this.setDataFn(data.Lat));
            },

            getData: function () {
                var res = {
                    Lat: this.getDataFn($('#alertEditModuleLat').val()),
                    Lon: this.getDataFn($('#alertEditModuleLng').val())
                }
                return res;
            },

            setMode: function (mode) {
                this.mode = mode;
                var lat, lon;
                switch (mode) {
                    case 'gradMin':
                        this.getDataFn = this.minToDeg;
                        this.setDataFn = this.degToMin;
                        lat = $('#alertEditModuleLat').val();
                        lon = $('#alertEditModuleLng').val();
                        this.setData({Lat: lat, Lon: lon});

                        break;
                    case 'gradDeg':
                        this.getDataFn = this.returnDeg;
                        this.setDataFn = this.getDeg;
                        lat = this.minToDeg($('#alertEditModuleLat').val());
                        lon = this.minToDeg($('#alertEditModuleLng').val());
                        this.setData({Lat: lat, Lon: lon});
                        break;
                }
                PC.Validator.Reset('alertEditModuleLng', 'alertEditModuleLngError');
                PC.Validator.Reset('alertEditModuleLat', 'alertEditModuleLatError');

            },

            minToDeg: function (minVal) { //ГГ MM.MMM to ГГ.ГГГГ
                var re = /(\d+)[° ](\d+\.\d+)/ig;
                var res = re.exec(minVal);
                var val = 0;
                if (res == null) {
                    re = /(\d+)[° ]/ig;
                    res = re.exec(minVal);
                    if (res) {
                        return res[1];
                    } else {
                        return null;
                    }
                }
                if (res[1]) {
                    val = parseInt(res[1]);
                }
                if (res[2]) {
                    val += parseFloat(res[2]) / 60;
                }
                return val;
            },
// getDataFn
            returnDeg: function (val) {
                var floatVal = parseFloat(val);
                if (floatVal && floatVal > 0 && floatVal < 180) {
                    return floatVal;
                } else {
                    return null;
                }
            },
            getDeg: function (val) {
                var floatVal = parseFloat(val);
                if (!floatVal) {
                    return null;
                }
                // округляем до 6 знаков
                floatVal = Math.round(floatVal * 1000000) / 1000000;
                return floatVal;
            },

            degToMin: function (degVal) { // ГГ.ГГГГ to ГГ MM.MMM
                var grad = Math.floor(degVal);
                if (!grad) {
                    return null;
                }
                var min = (degVal - grad) * 60;
                // округляем до 4 знаков
                return grad.toString() + '°' + Math.round(min * 10000) / 10000;
            }



        });

        return Coordinates;

    });