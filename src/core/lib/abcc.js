'use strict'

const debug = require('debug')('core:lib:abcc')

class abcc {
  constructor (config) {
    debug('constructor is called')
    this.config = config
  }

  getconfig () {
    debug('getconfig is called')
    debug(this.config)
    return this.config
  }

  getUsername () {
    debug('getUsername is called')
    debug(this.config.username)
    return this.config.username
  }

  getPassword () {
    debug('getPassword is called')
    debug(this.config.password)
    return this.config.password
  }

  getSymbols (callback) {
    debug('getSymbols is called')
    callback(this.config.symbolOption)
  }

  getSymbolsAddr (symbols) {
    debug('getSymbolsAddr is called')
    try {
      return this.config.symbolAddr[symbols]
    } catch (err) {
      return this.config.symbolAddr['ltcbtc']
    }
  }
}

module.exports = abcc
