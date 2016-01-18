Q = require 'q'
_assign = require 'lodash/object/assign'

###*
# Обработчик ошибок для плеера.
# Может послать статистику, сделать логгинг, вывести попап
# Может определить тип ошибки по объекту ошибки
#
# @class PlayerErrorHandler
###
class PlayerErrorHandler
  ###*
  # Типы обрабатываемых шоибок
  #
  # @property errorTypes
  # @type Object
  ###
  errorTypes:
    CONTENT_PROVIDER: 0
    PLAYER: 1,
    SERVER: 2,
    EXCEPTION: 3

  ###*
  # @class PlayerErrorHandler
  # @constructor
  ###
  constructor: (@_logger, @_statLogger, @_popupManager, _resourceManager) ->
    @locale = _resourceManager?.get 'player/playerController'
    @_initStatParamsGetters()
    @_initErrorMessageGetters()
    @_initPopupTitleGetters()

  ###*
  # Получить тип ошибки по объекту ошибки
  #
  # @method getErrorType
  # @param {Object} error - объект ошибки
  # @return {Number} errorType тип ошибки
  ###
  getErrorType: (error) ->
    return @errorTypes.CONTENT_PROVIDER if error.type is 'content-provider'
    return @errorTypes.PLAYER if error?.code?
    return @errorTypes.SERVER if error?.moreParameters?
    return @errorTypes.EXCEPTION if error.stack?

  ###*
  # Логгирование ошибки
  #
  # @method log
  # @param {Object} error - объект ошибки
  ###
  log: (error) ->
    if error.stack? and !error.code? and !error.moreParameters?
    then @_logger.error error.stack
    else @_logger.log 'Error in player:', error

  ###*
  # Отправка статистики по ошибке
  #
  # @method sendStat
  # @param {Object} error - объект ошибки
  # @param {PlayingItemModel} playingModel playingItemModel
  ###
  sendStat: (error, playingModel) ->
    errorType = @getErrorType error
    statParams = @statParamsGetters[errorType]?.call @, error
    return unless statParams?
    providerParams = playingModel.get 'providerParams'
    _assign statParams?.params,
      movie_id: playingModel.get('itemModel').get 'id'
      service_id: providerParams.name
    @_statLogger.log statParams

  ###*
  # Показать попап по ошибке
  #
  # @method showPopup
  # @param {Object} error - объект ошибки
  # @param {PlayingItemModel} playingModel playingItemModel
  ###
  showPopup: (error, playingModel) ->
    errorType = @getErrorType error
    message = @_getErrorMessage errorType, error
    title = @_getPopupTitle errorType, playingModel
    @_popupManager.showPopup
      title: title ? @locale 'Ошибка платформы'
      content: message
      buttons: [
        {caption: 'Продолжить'}
      ]

  ###*
  # Определение геттеров параметров статистики для ошибок по типам
  #
  # @private
  # @method _initStatParamsGetters
  ###
  _initStatParamsGetters: ->
    @statParamsGetters = {}
    @statParamsGetters[@errorTypes.CONTENT_PROVIDER] = (error) ->
      error?.statParams

  ###*
  # Определение геттеров сообшения ошибки для попапа
  #
  # @private
  # @method _initErrorMessageGetters
  ###
  _initErrorMessageGetters: ->
    @errorMessageGetters = {}
    @errorMessageGetters[@errorTypes.CONTENT_PROVIDER] = (error) -> error.code
    @errorMessageGetters[@errorTypes.PLAYER] = (error) -> "ERR.#{error.code}"
    @errorMessageGetters[@errorTypes.SERVER] = (error) -> error?.moreParameters?.nemoErrorCode
    @errorMessageGetters[@errorTypes.EXCEPTION] = -> 'Неизвестная ошибка'

  ###*
  # Определение геттеров заголовков ошибки для попапа
  #
  # @private
  # @method _initPopupTitleGetters
  ###
  _initPopupTitleGetters: ->
    @popupTitleGetters = {}
    @popupTitleGetters[@errorTypes.CONTENT_PROVIDER] = @_getPopupTitleForPlatform
    @popupTitleGetters[@errorTypes.PLAYER] = -> 'Ошибка проигрывателя'
    @popupTitleGetters[@errorTypes.SERVER] = @_getPopupTitleForPlatform

  ###*
  # Получение сообщения об ошибке через errorMessageGetter
  #
  # @private
  # @method _getErrorMessage
  # @param {Number} errorType тип ошибки
  # @param {Object} error - объект ошибки
  # @return {String} msg текст ошибки
  ###
  _getErrorMessage: (errorType, error) ->
    msg = @errorMessageGetters[errorType]?.call(@, error) ? 'Неизвестная ошибка'
    @locale msg

  ###*
  # Получение заголовка для попапа через popupTitleGetter
  #
  # @private
  # @method _getPopupTitle
  # @param {Number} errorType тип ошибки
  # @param {PlayingItemModel} playingModel playingItemModel
  # @return {String} title заголовок для попапа
  ###
  _getPopupTitle: (errorType, playingModel) ->
    title = @popupTitleGetters[errorType]?.call(@, playingModel) ? 'Ошибка приложения'
    @locale title

  ###*
  # Получение нелокализованного заголовка попапа в случае,
  # если ошибка относится к получению данных с сервера
  # (напрямую или через контент-провайдер)
  #
  # @private
  # @method _getPopupTitleForPlatform
  # @param {BackboneModel} playingModel playingItemModel or QueueModel
  # @return {String} нелокализованный заголовок попапа
  ###
  _getPopupTitleForPlatform: (playingModel) ->
    providerParams = playingModel.get 'providerParams'
    if !providerParams?
      model = playingModel.get 'playingItem'
      providerParams = model?.get 'providerParams'
    type = providerParams?.type
    if type is 'external_service'
    then 'Ошибка внешнего сервиса'
    else 'Ошибка платформы'

module.exports = PlayerErrorHandler