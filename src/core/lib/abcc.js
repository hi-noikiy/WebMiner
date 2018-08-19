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
    let url = this.config.symbolAddr['LTC/BTC']
    try {
      url = this.config.symbolAddr[symbols]
    } catch (err) {
      debug('// WARNING: can not find the symbols addr')
    }
    debug(url)
    return url
  }
}

module.exports = abcc
