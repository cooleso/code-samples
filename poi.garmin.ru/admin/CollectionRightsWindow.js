// окно для редактирования прав доступа к коллекциям для модератора.
Ext.ns("AC.ui.components");

AC.ui.components.CollectionRightsWindow = Ext.extend(Ext.Window, {
    closeAction:'hide',
    height:450,
    width:450,
    description:"Установите права доступа к коллекциям для модератора.",
    layout:'vbox',
    layoutConfig:{
        align:'stretch',
        pack:'start'
    },
    align:'stretch',
    modal:true,
    initComponent:function () {
        Ext.applyIf(this, {

            items:[
                {
                    xtype:'container',
                    autoScroll:true,
                    height:30,
                    flex:1,

                    style:{
                        padding:'5px'
                    },
                    items:[
                        {
                            xtype:'displayfield',
                            style:{
                                fontWeight:"bold"
                            },
                            value:this.description
                        }
                    ]
                },
                {
                    xtype:'container',
                    layout:'fit',
                    flex:1,
                    items:[
                        this.grid = new Ext.grid.GridPanel({
                            headerAsText:false,

                            //  autoExpandColumn: 'Region_name',
                            autoExpandColumn:'desc',
                            store:this.store = new Ext.data.Store({
                                autoLoad:false,
                                proxy:new Ext.data.HttpProxy({
                                    url:'../../Info.aspx?method=get_collections_for_user',
                                    method:"POST",
                                    scriptTag:true

                                }),
                                baseParams:{
                                    id:0
                                },
                                reader:new Ext.data.JsonReader({
                                    root:'list',
                                    totalProperty:'total',
                                    idProperty:'id',
                                    fields:[
                                        'id',
                                        'name',
                                        'desc',
                                        'right'
                                    ]
                                }),
                                remoteSort:false
                            }),
                            enableColumnMove:false,
                            enableColumnHide:false,
                            enableDragDrop:false,
                            enableHdMenu:false,
                            selModel:new Ext.grid.RowSelectionModel({
                                singleSelect:true
                            }),
                            columns:[
                                {

                                    header:"id",
                                    dataIndex:"id",
                                    hidden:true
                                },
                                {
                                    xtype:'checkcolumn',
                                    header:'Выбран',
                                    dataIndex:'right',
                                    width:55,
                                    sortable:true
                                },

                                {
                                    id:"name",
                                    header:"Коллекция",
                                    resizable:true,
                                    dataIndex:"name",
                                    width:'auto',
                                    sortable:true
                                },
                                {
                                    id:"desc",
                                    header:"Описание",
                                    resizable:true,
                                    dataIndex:"desc",
                                    width:'auto',
                                    sortable:true
                                }
                            ]
                        })


                    ]
                }
            ],
            buttons:[
                {
                    text:'Применить',
                    scope:this,
                    handler:this.apply
                },
                {
                    text:'Отмена',
                    scope:this,
                    handler:this.cancel
                }
            ]

        });
        AC.ui.components.SelectRegionsWindow.superclass.initComponent.call(this);
    },
    open:function (rec) {

        this.store.setBaseParam('user_id', rec.ID);
        this.user_id = rec.ID;
        this.show();
        this.store.reload();
        this.setTitle('Права на коллекции для <span class="msgData">' + rec.Nick + '</span>:');
    },
    apply:function () {
        var ids = [];
        this.store.each(function (rec) {
            if (rec.data.right) {
                ids.push(rec.data.id);
            }
        }, this);
        if (ids.length == 0 || ids.length == this.store.getCount()) {

            ids = [];
        }

        AC.data.AuthController.request2({
            url:"../../Info.aspx?method=set_collections_for_user",
            data:{
                user_id:this.user_id,
                ids:ids
            },
            silent:true
        }).done($.proxy(function (data) {
            this.hide();
        }, this)).fail($.proxy(function (data) {
            Ext.MessageBox.show({
                title:'Административная консоль',
                msg:data,
                icon:Ext.MessageBox.ERROR,
                buttons:Ext.Msg.OK
            });
            this.hide();
        }, this));
    },
    cancel:function () {
        this.hide();
    }

});