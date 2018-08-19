'use strict'

const debug = require('debug')('core:utils')
const path = require('path')
const ABCC = require(path.join(__dirname, 'lib/abcc.js'))

class utils {
  constructor (config) {
    this.config = config
    debug(config)
    switch (config.name) {
      case 'abcc':
        this.xc = new ABCC(config)
        break
      default:
        throw new Error('core:utils.js: config.name not defined')
    }
  }

  getconfig () {
    // debug(this.config)
    return this.config
  }

  getUsername () {
    // debug(this.config.username)
    return this.config.username
  }

  getPassword () {
    // debug(this.config.password)
    return this.config.password
  }

  getSymbols (callback) {
    // debug('getSymbols is called')
    this.xc.getSymbols((data) => {
      debug(data)
      callback(data)
    })
  }

  getSymbolsAddr (symbols) {
    // debug('getSymbolsAddr is called')
    this.xc.getSymbolsAddr(symbols)
  }
}

module.exports = utils
