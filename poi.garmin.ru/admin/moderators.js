// список модераторов

Ext.ns('AC.modules.moderatorsModule');

AC.modules.moderatorsModule.Moderators = function () {
    this.inContainer = false;
    this.mainGridPageSize = 50;
    this.mainWidget = new Ext.Panel({
        layout:'fit',
        frame:false,
        items:[
            this.grid = new Ext.grid.GridPanel({
                header:false,
                border:false,
                stripeRows:true,

                store:this.store = new Ext.data.Store({

                    proxy:new Ext.data.HttpProxy({
                        url:'../../Info.aspx?method=getusers',
                        method:"POST",
                        scriptTag:true
                    }),
                    baseParams:{
                        role:2
                    },
                    autoLoad:{
                        params:{
                            //role:0,
                            start:0,
                            limit:this.mainGridPageSize
                        }
                    },
                    reader:new Ext.data.JsonReader({
                        root:'data',
                        totalProperty:'total',
                        idProperty:'ID',
                        fields:[
                            'ID',
                            'Nick',
                            'NAM',
                            'EMail',
                            'Registered',
                            'LastActivity',
                            'TTL',
                            'ModBy',
                            'isTester'
                        ]
                    }),
                    remoteSort:true
                }),
                enableColumnMove:false,
                enableColumnHide:false,
                enableDragDrop:false,
                enableHdMenu:false,

                selModel:new Ext.grid.RowSelectionModel({
                    singleSelect:true
                }),
                viewConfig:{
                    forceFit:true
                },
                columns:[
                    {
                        header:"ID",
                        dataIndex:"ID",
                        hidden:true
                    },
                    {
                        header:"Ник",
                        sortable:true,
                        resizable:true,
                        dataIndex:"Nick"
                    },
                    {
                        header:"Имя",
                        sortable:true,
                        resizable:true,
                        dataIndex:"NAM"
                    },

                    {
                        header:"E-mail",
                        sortable:true,
                        resizable:true,
                        dataIndex:"EMail"
                    },
                    {
                        header:"Зарегистрирован",
                        sortable:true,
                        resizable:true,
                        dataIndex:"Registered",
                        renderer:function (value, metaData, record) {
                            return  PC.Utils.dateFromReq(value).format('dd.mm.yyyy hh:nn');
                        }

                    },
                    {
                        header:"Последняя активность",
                        sortable:true,
                        resizable:true,
                        dataIndex:"LastActivity",
                        renderer:function (value, metaData, record) {
                            return  PC.Utils.dateFromReq(value).format('dd.mm.yyyy hh:nn');
                        }

                    },
                    {
                        header:"Точек добавлено",
                        sortable:true,
                        resizable:true,
                        dataIndex:"TTL"
                    },
                    {
                        header:"Точек промодерировано",
                        sortable:true,
                        resizable:true,
                        dataIndex:"ModBy"
                    },
                    {
                        header:"Тестер",
                        sortable:true,
                        resizable:true,
                        dataIndex:"isTester",
                        renderer:function (val) {
                            if (val) {
                                return "Да";
                            }
                        },
                        width:40,
                        align:'center'
                    }
                ],
                tbar:[
                    {
                        xtype:"buttongroup",
                        title:"Модератор",
                        columns:5,
                        items:[
                            {
                                text:"Добавить",
                                rowspan:1,
                                colspan:1,
                                iconAlign:"top",
                                scale:"small",
                                iconCls:"btnAdd",
                                scope:this,
                                handler:$.proxy(this.openNewUserWindow, this)
                            },
                            {
                                text:"Назначить",
                                scale:"small",
                                scope:this,
                                colspan:1,
                                rowspan:1,
                                iconCls:'btnOK_16',
                                iconAlign:"top",
                                handler:$.proxy(this.openUserSelectWindow, this)
                            },
                            {
                                text:"Удалить",
                                iconAlign:"top",
                                scale:"small",
                                scope:this,
                                colspan:1,
                                rowspan:1,
                                iconCls:'btnMinus',
                                handler:$.proxy(this.deleteModer, this)
                            },
                            {
                                text:"Свойства",
                                iconAlign:"top",
                                scale:"small",
                                scope:this,
                                colspan:1,
                                rowspan:1,
                                iconCls:'btnUserSettings',
                                handler:$.proxy(this.userSettings, this)
                            },
                            {
                                text:"Статистика",
                                iconAlign:"top",
                                scale:"small",
                                scope:this,
                                colspan:1,
                                rowspan:1,
                                iconCls:'btnStatistic',
                                handler:$.proxy(this.openUserStatisticWindow, this)

                            }

                        ]
                    },
                    {
                        xtype:"buttongroup",
                        title:"Параметры списка",
                        columns:2,
                        items:[
                            {
                                text:"Промежуток времени",
                                rowspan:1,
                                colspan:1,
                                iconAlign:"left",
                                scale:"large",
                                iconCls:"btnCalendar",
                                scope:this,
                                handler:$.proxy(this.openDateIntervalWindow, this)
                            }
                        ]
                    },
                    {
                        xtype:"buttongroup",
                        title:"Регионы",
                        columns:1,
                        items:[
                            {
                                text:"Назначить регион",
                                rowspan:1,
                                colspan:1,
                                iconAlign:"left",
                                scale:"large",
                                iconCls:"btnRegion",
                                scope:this,
                                handler:$.proxy(this.openSelectRegionWindow, this)
                            }
                        ]
                    },
                    {
                        xtype:"buttongroup",
                        title:"Коллекции",
                        columns:1,
                        items:[
                            {
                                text:"Права для коллекций",
                                rowspan:1,
                                colspan:1,
                                iconAlign:"left",
                                scale:"large",
                                iconCls:"btnCollection",
                                scope:this,
                                handler:$.proxy(this.openCollectionRightsWindow, this)
                            }
                        ]
                    }

                ],
                bbar:this.toolbar = new Ext.PagingToolbar({
                    pageSize:this.mainGridPageSize,
                    store:this.store,
                    displayInfo:true,
                    displayMsg:'Записи в таблице: {0} - {1} из {2}',
                    emptyMsg:"Нет записей"
                })
            })
        ]
    });
}
AC.modules.moderatorsModule.Moderators.prototype = {
    openUserSelectWindow:function () {
        if (!this.userSelectWindow) {
            this.userSelectWindow = new AC.ui.components.UserSelectWindow({
                title:"Назначение модератором",
                role:2,
                description:'Выберете пользователя, которого хотите назначить модератором:'
            });
            this.userSelectWindow.on('user_select', this.updateStore, this);

        }
        this.userSelectWindow.show();
    },
    updateStore:function (params) {
        this.store.baseParams = Ext.apply(this.store.baseParams, params);
        this.toolbar.doRefresh();
        //this.grid.getStore().reload();
    },
    deleteModer:function () {
        var sm = this.grid.getSelectionModel();
        var selRecords = sm.getSelections();
        if (selRecords.length === 0) {
            Ext.MessageBox.show({
                title:'Удаление модератора',
                msg:'Выберите модератора из списка',
                icon:Ext.MessageBox.INFO,
                buttons:Ext.Msg.OK
            });
            return;
        }
        var me = this;
        Ext.MessageBox.confirm('Удаление модератора', 'Удалить модератора <span class="msgData">' + selRecords[0].data.Nick + '</span>?<br>При удалении пользователя из списка модераторов ему присваиваются права пользователя.',
            function (p) {
                if (p == "no") {
                    return;
                }
                AC.data.AuthController.request2({
                    url:"../../AddMdf.aspx?method=set_role",
                    data:[
                        {
                            id:selRecords[0].data.ID,
                            role:0
                        }
                    ]
                }).done(function (data) {
                        me.updateStore();
                    }).fail(function (data) {
                        Ext.MessageBox.show({
                            title:'Административная консоль',
                            msg:data,
                            icon:Ext.MessageBox.ERROR,
                            buttons:Ext.Msg.OK
                        });
                    });
            });
    },

    userSettings:function () {
        var sm = this.grid.getSelectionModel();
        var selRecords = sm.getSelections();
        if (selRecords.length === 0) {
            Ext.MessageBox.show({
                title:'Удаление модератора',
                msg:'Выберите модератора из списка',
                icon:Ext.MessageBox.INFO,
                buttons:Ext.Msg.OK
            });
            return;
        }
        if (!this.userSettingsWindow) {
            this.userSettingsWindow = new AC.ui.components.UserSettingsWindow({

            });
            this.userSettingsWindow.on('user_changed', function () {
                this.updateStore();
            }, this);
        }
        this.userSettingsWindow.open(selRecords[0].data);
    },

    openNewUserWindow:function () {
        if (!this.newUserWindow) {
            this.newUserWindow = new AC.ui.components.NewUserWindow({
                userRole:2,
                title:'Новый модератор'
            });
            this.newUserWindow.on('user_added', function () {
                this.updateStore();
            }, this);
        }
        this.newUserWindow.show();
    },
    openDateIntervalWindow:function () {
        if (!this.dateIntervalWindow) {
            this.dateIntervalWindow = new AC.ui.components.DateIntervalWindow();
            this.dateIntervalWindow.on('date_select', function (data) {
                var dates = {
                    dateStart:'\/Date(' + data.dateStart + '+0400)\/',
                    dateEnd:'\/Date(' + data.dateEnd + '+0400)\/'
                };
                this.updateStore(dates);
            }, this);
        }
        this.dateIntervalWindow.show();
    },
    openSelectRegionWindow:function () {
        if (!this.selectRegionWindow) {
            this.selectRegionWindow = new AC.ui.components.SelectRegionsWindow();

        }
        var sm = this.grid.getSelectionModel();
        var selRecords = sm.getSelections();
        if (selRecords.length === 0) {
            Ext.MessageBox.show({
                title:'Назначение региона',
                msg:'Выберите модератора из списка',
                icon:Ext.MessageBox.INFO,
                buttons:Ext.Msg.OK
            });
            return;
        }
        this.selectRegionWindow.open(selRecords[0].data);
    },
    openCollectionRightsWindow:function () {
        if (!this.collectionRightsWindow) {
            this.collectionRightsWindow = new AC.ui.components.CollectionRightsWindow();
        }
        var sm = this.grid.getSelectionModel();
        var selRecords = sm.getSelections();
        if (selRecords.length === 0) {
            Ext.MessageBox.show({
                title:'Права для коллекций',
                msg:'Выберите модератора из списка',
                icon:Ext.MessageBox.INFO,
                buttons:Ext.Msg.OK
            });
            return;
        }
        this.collectionRightsWindow.open(selRecords[0].data);
    },
    openUserStatisticWindow:function () {
        if (!this.userStatisticWindow) {
            this.userStatisticWindow = new AC.ui.components.UserStatisticWindow();
        }
        var sm = this.grid.getSelectionModel();
        var selRecords = sm.getSelections();
        if (selRecords.length === 0) {
            Ext.MessageBox.show({
                title:'Статистика для модератора',
                msg:'Выберите модератора из списка',
                icon:Ext.MessageBox.INFO,
                buttons:Ext.Msg.OK
            });
            return;
        }
        var data = _.clone(selRecords[0].data);
        if (this.dateIntervalWindow) {
            var dates = this.dateIntervalWindow.getDates();
            data.dateStart = dates.dateStart;
            data.dateEnd = dates.dateEnd;
        }
        this.userStatisticWindow.open(data);
    }
};

AC.ModuleFactory.reg('m-moderators', AC.modules.moderatorsModule.Moderators);
