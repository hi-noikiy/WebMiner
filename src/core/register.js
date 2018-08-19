'use strict'

const debug = require('debug')('core:register')
const gm = require('getmac')
const q = require('q')
const fs = require('fs')
const path = require('path')
const reRequire = require('re-require-module').reRequire

class register {
  constructor (config) {
    this.config = config
  }

  getconfig () {
    debug(this.config)
    return this.config
  }

  getMac (callback) {
    let defer = q.defer()
    gm.getMac((err, macAddr) => {
      if (err) defer.reject(err)
      defer.resolve(macAddr)
    })
    return defer.promise.nodeify(callback)
  }

  setconfig (jsonFilePath, regConfig) {
    debug('setconfig is called')
    let config = JSON.parse(fs.readFileSync(jsonFilePath))
    config.register.user = regConfig.user
    config.register.email = regConfig.email
    config.register.phone = regConfig.phone
    config.register.pwd = regConfig.pwd
    config.register.series = regConfig.series
    config.register.regCode = regConfig.regCode
    debug(config)
    fs.writeFile(jsonFilePath, JSON.stringify(config), 'utf8', (err) => {
      if (err) {
        debug('writeFile Error:' + err)
      } else {
        debug('writeFile Success')
        reRequire(path.join(__dirname, 'config.js'))
        debug('re-Require config.js')
      }
    })
  }
}

module.exports = register
