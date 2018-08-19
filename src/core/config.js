'use strict'

const debug = require('debug')('core:config')
const fs = require('fs')
const path = require('path')
const configFile = path.resolve(process.cwd(), './config.json')
const config = JSON.parse(fs.readFileSync(configFile))

debug(config)

module.exports = {
  // xcoin: {
  //   name: 'xcoin',
  //   key: 'xxx',
  //   script: 'xxx'
  // },
  abcc: {
    name: config.abcc.name,
    username: config.abcc.username,
    password: config.abcc.password,
    script: config.abcc.script,
    symbolOption: config.abcc.symbolOption,
    symbolAddr: config.abcc.symbolAddr
  },
  register: {
    user: config.register.user,
    email: config.register.email,
    phone: config.register.phone,
    pwd: config.register.pwd,
    series: config.register.series,
    regCode: config.register.regCode
  },
  crypto: {
    privateKey: '',
    publicKey: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDFWnl8fChyKI/Tgo1ILB+IlGr8
ZECKnnO8XRDwttBbf5EmG0qV8gs0aGkh649rb75I+tMu2JSNuVj61CncL/7Ct2kA
Z6CZZo1vYgtzhlFnxd4V7Ra+aIwLZaXT/h3eE+/cFsL4VAJI5wXh4Mq4Vtu7uEje
ogAOgXACaIqiFyrk3wIDAQAB
-----END PUBLIC KEY-----`
  }

}
