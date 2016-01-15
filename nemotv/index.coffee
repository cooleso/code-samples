Q = require 'q'
BaseImplementor = require '../Base'
providerTypes = require '../../providerTypes'
HandleErrorMixin = require './mixins/HandleErrorMixin'
ComputeBitratesMixin = require './mixins/ComputeBitratesMixin'
ParseInfoXmlMixin = require './mixins/ParseInfoXmlMixin'
ParseManifestMixin = require './mixins/ParseManifestMixin'
ParseContentUrlMixin = require './mixins/ParseContentUrlMixin'
UpdateSessionMixin = require './mixins/UpdateSessionMixin'

###*
TvZavr provider

@class TvZavrImplementor
@extends BaseImplementor
###
class TvZavrImplementor extends BaseImplementor
  @providerName: providerTypes.TVZAVR

  @contentSourceTypes: [
    'tvzavr'
  ]

  streamSettings:
    hd:
      title: 'FullHD'
      priority: 0
    hi:
      title: 'HD'
      priority: 1
    nr:
      title: 'Среднее'
      priority: 2
    lw:
      title: 'Низкое'
      priority: 3

  qualityPreferences:
    low: ['nr','lw']
    middle: ['hi']
    high: ['hd']

  platform: 'ntv'


  constructor: ->
    super
    @tvZavrInfo =
      providerName: @providerName
      platform: @platform

  getParams: ->
    # тип провайдера - наша платформа или внешний сервис
    type: 'external_service'
    name: @providerName,
    movieId: @tvZavrInfo?.movieId

  ###*
  # Получаем параметры для воспроизведения видео с Backbone Model на входе
  #
  # @method getStreamParamsFromModel
  # @param {Backbone.Model} model
  # @return {Object} параметры для воспроизведения видео
  ###
  getStreamParamsFromModel: (model, options) ->
    contentSource = TvZavrImplementor._findContentSource model.get('contentSource'), @providerName
    @tvZavrInfo.movieId = contentSource?.id
    if contentSource?
      contentUrl = contentSource.stream_address_new ? contentSource.stream_address
      contentUrl = contentUrl?.replace '/apl/',"/#{@platform}/"
    if !contentUrl?
      @logger.log "ERROR in #{@constructor.name}:  can`t get tvZavr stream url"
      return Q.fcall =>
        throw @_getErrorData 'Failed to get content source', contentSource
    @tvZavrInfo.contentUrl = contentUrl
    @_parseContentUrl contentUrl
    .then => @_updateSession()
    .then => @_parseInfoXml()
    .then => @_parseManifest()
    .then => @_computeBitrates options?.bitrateIndex
    .then =>
      @tvZavrInfo.videoUrl = @tvZavrInfo.manifestUrl
      # если нет битрейта, будем запрашивать просто манифест с параметром av (не выдавать аудио без видео в плейлисте)
      replaceStr = if @currentBitrate then @currentBitrate.urlPart else 'av-mnf.m3u8'
      @tvZavrInfo.videoUrl = @tvZavrInfo.videoUrl.replace 'mnf.m3u8', replaceStr
      urlFn = (cb) =>
        @_updateSession()
        .then =>
          link = @_makeUrl()
          cb(null, link)
        .catch (e) ->
          cb e
        .done()
      url = @_makeUrl()
      options =  @_getAdditionalOptions
        streamAddress: url
        model: model
      # передаем функцию получения нового токена в плеер. Ф-я будет вызываться при возобновлении показа видео
      options.urlFn = urlFn
      result =
        streamAddress: url
        options: options
      result

  _makeUrl: ->
    @_addParamsToUrl @tvZavrInfo.videoUrl

  _addParamsToUrl: (url) ->
    "#{url}?usessionid=#{encodeURIComponent(@tvZavrInfo.sessionId)}&token=#{encodeURIComponent(@tvZavrInfo.token)}&pageurl=null&platform=#{@tvZavrInfo.platform}"

  _getAdditionalOptions: ({streamAddress, model}) ->
    params =
      url: streamAddress
      id: model.get 'id'
      live: false
      start: 0
      end: model.get 'duration'
    if @_isMp4Url streamAddress
      params.type = 'mp4'
      params.mimeType = 'video/mpeg4'
    else
      params.type = 'hls'
      params.mimeType = 'application/vnd.apple.mpegurl'
    params

  _getErrorData: (msg, data, external = no) ->
    type: 'content-provider'
    code: 'ERROR_NO_STREAM'
    statParams:
      event_type: if external then 'external_service_error' else 'content_error'
      event_level: 3
      params:
        message: msg
        error_code: 'ERROR_NO_STREAM'
        data: data

  getVodWatermark: ->
    @providerName

  @getRuleForSelect: (data) ->
    contentSource = @_findContentSource data.content_source, @providerName
    return contentSource?.stream_address_new? or contentSource?.stream_address?

HandleErrorMixin TvZavrImplementor::
ComputeBitratesMixin TvZavrImplementor::
ParseContentUrlMixin TvZavrImplementor::
ParseInfoXmlMixin TvZavrImplementor::
ParseManifestMixin TvZavrImplementor::
UpdateSessionMixin TvZavrImplementor::

module.exports = exports = TvZavrImplementor
