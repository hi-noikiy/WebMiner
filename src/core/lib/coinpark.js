'use strict'

const debug = require('debug')('core:lib:coinpark')

class coinpark {
  constructor (config) {
    this.config = config
  }

  getconfig () {
    debug(this.config)
    return this.config
  }

  getUsername () {
    debug(this.config.username)
    return this.config.username
  }

  getPassword () {
    debug(this.config.password)
    return this.config.password
  }

  getSymbols (callback) {
    debug('getSymbols is called')
    callback(this.config.symbolOption)
  }
}

module.exports = coinpark
