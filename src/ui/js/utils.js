/* global Option */
/* eslint no-undef: "error" */
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
'use strict'

const debug = require('debug')('ui:utils')
const ipc = require('electron').ipcRenderer
const fs = require('fs')
const path = require('path')
const config = require(path.join(__dirname, '../../core/config.js'))
const Crypto = require(path.join(__dirname, '../../core/crypto.js'))
const Register = require(path.join(__dirname, '../../core/register.js'))
const jsonFilePath = path.join(__dirname, '../../config.json')
const CoreUtils = require(path.join(__dirname, '../../core/utils.js'))
var timer = 0
var interval = 0
var stop = false

function log (str, isErr) {
  debug('log is called')
  isErr = isErr || false// 设置参数b的默认值为 false
  const now = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  let logStr = now + ' : ' + str + '\n'
  let logFont = document.createElement('FONT')
  let logText = document.createTextNode(logStr)
  logFont.appendChild(logText)
  debug(isErr)
  debug(logStr)
  if (isErr) {
    logFont.style.color = '#ff3322'
    document.getElementsByName('logInfo')[0].appendChild(logFont)
  } else {
    logFont.style.color = '#00ee00'
    document.getElementsByName('logInfo')[0].appendChild(logFont)
  }
  document.getElementsByName('logInfo')[0].scrollTop = document.getElementsByName('logInfo')[0].scrollHeight
}

function stopxCoin (stop) {
  debug('stopxCoin is called')
  log('正在停止刷币程序...')
}

function runxCoin (xsymbols, xrunPrice, runNum, xrunEpoch, xCoin, xconfig) {
  debug('runxCoin is called')
  log('设置完成，开始运行刷币程序...')
}

class utils {
  login () {
    debug('login is called')
    // get relate input
    let user = document.getElementsByName('user')[0].value
    let pwd = document.getElementsByName('pwd')[0].value
    // check value not null
    if (user === '' || pwd === '') {
      return false
    }
    // check series
    let cry = new Crypto(config.crypto)
    let register = new Register(config.register)
    let promise = register.getMac()
    promise.then((macAddr) => {
      debug('macValue: ' + macAddr)
      let hash = cry.getHash('sha256', user + '@' + macAddr)
      let ecPub = cry.encrypter('aes-256-cfb', config.crypto.publicKey, hash) // as series
      let jsonConfig = JSON.parse(fs.readFileSync(jsonFilePath))
      let vrf = cry.verifyer('RSA-SHA256', config.crypto.publicKey, jsonConfig.register.regCode, jsonConfig.register.series)
      if (jsonConfig.register.series === ecPub && vrf) {
        debug('valide series and regCode')
        // check user pwd
        let hash = cry.getHash('sha256', user + '@' + pwd)
        if (jsonConfig.register.pwd === hash) {
          debug('valide user and pwd')
          // redirect index.html
          ipc.send('redirect', path.join(__dirname, '../index.html'))
        } else {
          debug('inValide user or pwd')
          document.getElementsByName('check')[0].style.color = '#f00'
          document.getElementsByName('check')[0].value = '用户名或密码不正确'
          document.getElementsByName('pwd')[0].value = pwd
        }
      } else {
        debug('inValide series or regCode')
        // check regCode
        document.getElementsByName('check')[0].style.color = '#f00'
        document.getElementsByName('check')[0].value = '注册码不正确，请确保该用户已注册，激活失败'
        document.getElementsByName('pwd')[0].value = pwd
      }
    })
  }

  signup () {
    debug('signup is called')
    // get all the input
    let user = document.getElementsByName('user')[0].value
    let email = document.getElementsByName('email')[0].value
    let phone = document.getElementsByName('phone')[0].value
    let pwd = document.getElementsByName('pwd')[0].value
    let pwdr = document.getElementsByName('pwdr')[0].value
    let series = document.getElementsByName('series')[0].value
    let regCode = document.getElementsByName('regCode')[0].value
    // check not null
    if (user === '' || pwd === '' || pwdr === '' || pwd !== pwdr || series === '' || regCode === '') {
      return false
    }
    // check series
    let cry = new Crypto(config.crypto)
    let register = new Register(config.register)
    let promise = register.getMac()
    promise.then((macAddr) => {
      debug('macValue: ' + macAddr)
      let hash = cry.getHash('sha256', user + '@' + macAddr)
      let ecPub = cry.encrypter('aes-256-cfb', config.crypto.publicKey, hash) // as series
      if (series === ecPub) {
        debug('valide series')
        // check regCode
        debug('hash value:' + hash)
        debug('series value:' + series)
        let vrf = cry.verifyer('RSA-SHA256', config.crypto.publicKey, regCode, series)
        if (vrf) {
          debug('valide vrf')
          document.getElementsByName('regCodeCheck')[0].style.color = '#0f0'
          document.getElementsByName('regCodeCheck')[0].value = '已激活'
          document.getElementsByName('regCode')[0].value = regCode
          let jsonConfig = JSON.parse(fs.readFileSync(jsonFilePath))
          jsonConfig.register.user = user
          jsonConfig.register.email = email
          jsonConfig.register.phone = phone
          jsonConfig.register.pwd = cry.getHash('sha256', user + '@' + pwd)
          jsonConfig.register.series = series
          jsonConfig.register.regCode = regCode
          register.setconfig(jsonFilePath, jsonConfig.register)
          // redirect login.html
          ipc.send('redirect', path.join(__dirname, '../login.html'))
        } else {
          debug('inValide vrf')
          document.getElementsByName('regCodeCheck')[0].style.color = '#f00'
          document.getElementsByName('regCodeCheck')[0].value = '激活码无效'
          document.getElementsByName('regCode')[0].value = regCode
          // ipc.send('exit')
        }
      } else {
        debug('inValide series')
        series = ecPub
        document.getElementsByName('series')[0].value = ecPub
      }
    })
  }

  updateSeries () {
    // get relate input
    let user = document.getElementsByName('user')[0].value
    let series = document.getElementsByName('series')[0].value
    // check series
    let cry = new Crypto(config.crypto)
    let register = new Register(config.register)
    let promise = register.getMac()
    promise.then((macAddr) => {
      let hash = cry.getHash('sha256', user + '@' + macAddr)
      let ecPub = cry.encrypter('aes-256-cfb', config.crypto.publicKey, hash) // as series
      if (series === ecPub) {
        debug('valide series')
        //
      } else {
        debug('inValide series')
        document.getElementsByName('series')[0].value = ecPub
      }
    })
  }

  pwdrVerify () {
  // get relate input
    let pwd = document.getElementsByName('pwd')[0].value
    let pwdr = document.getElementsByName('pwdr')[0].value
    if (pwd === pwdr) {
      debug('valide pwdr')
      document.getElementsByName('pwdrCheck')[0].style.color = '#0f0'
      document.getElementsByName('pwdrCheck')[0].value = '密码一致'
      document.getElementsByName('pwdr')[0].value = pwdr
    } else {
      debug('inValide pwdr')
      document.getElementsByName('pwdrCheck')[0].style.color = '#f00'
      document.getElementsByName('pwdrCheck')[0].value = '密码不一致'
      document.getElementsByName('pwdr')[0].value = pwdr
    }
  }

  getSignup () {
    debug('getSignup is called')
    ipc.send('redirect', path.join(__dirname, '../signup.html'))
  }

  updateIndex () {
    debug('updateIndex is called')
    let bourse = document.getElementsByName('bourse')[0]
    debug(bourse)
    let selectedValue = bourse.options[bourse.selectedIndex].value
    switch (selectedValue) {
      case '1': { // abcc
        document.getElementsByName('symbols')[0].options.length = 0
        debug(config.abcc)
        let abcc = new CoreUtils(config.abcc)
        abcc.getSymbols((symbols) => {
          let length = Object.keys(symbols).length
          document.getElementsByName('symbols')[0].options.add(new Option('...', 0, 'selected'))
          for (let i = 0; i < length; i++) {
            let key = Object.keys(symbols)[i]
            debug(key)
            document.getElementsByName('symbols')[0].options.add(new Option(symbols[key], i + 1))
          }
        })
        break
      }
      case '2': { // others if any
        document.getElementsByName('symbols')[0].options.length = 0
        break
      }
      default: {
        throw new Error('ui:utils.js: bourse value is not defined')
      }
    }
  }

  runIndex () {
    debug('runIndex is called')
    let bourse = document.getElementsByName('bourse')[0]
    let symbols = document.getElementsByName('symbols')[0]
    let runPrice = document.getElementsByName('runPrice')[0]
    let runNum = document.getElementsByName('runNum')[0]
    let runLong = document.getElementsByName('runLong')[0]
    // get selected value
    let xbourse = bourse.options[bourse.selectedIndex].value
    let xsymbols = symbols.options[symbols.selectedIndex].text
    let xrunPrice = runPrice.options[runPrice.selectedIndex].value
    let xrunNum = runNum.value === '' ? 1 : runNum.value
    let xrunEpoch = runLong.options[runLong.selectedIndex].value
    debug('xbourse:' + xbourse)
    debug('xsymbols:' + xsymbols)
    debug('xrunPrice:' + xrunPrice)
    debug('xrunNum:' + xrunNum)
    debug('xrunEpoch:' + xrunEpoch)
    debug('stop:' + stop)
    debug('timer:' + timer)
    debug('interval:' + interval)
    if (xbourse === '0' || xsymbols === '...' || xrunPrice === '0' || xrunEpoch === '0') {
      debug('run inValide: not selceted all item')
      document.getElementsByName('check')[0].style.color = '#f00'
      document.getElementsByName('check')[0].value = '设置错误：未选择必选项'
      document.getElementsByName('bourse')[0].value = xbourse
    } else {
      if (timer !== 0 || interval !== 0 || stop !== false) {
        document.getElementsByName('check')[0].style.color = '#f00'
        document.getElementsByName('check')[0].value = '正在运行，请停止后再运行'
        document.getElementsByName('bourse')[0].value = xbourse
      } else {
        document.getElementsByName('check')[0].value = ''
        document.getElementsByName('bourse')[0].value = xbourse
        debug('run valide: selceted all item')
        switch (xbourse) {
          case '1': { // abcc
            let abcc = new CoreUtils(config.abcc)
            runxCoin(xsymbols, xrunPrice, xrunNum, xrunEpoch, abcc, config.abcc)
            break
          }
          case '2': { // abcc
            break
          }
          default: {
            throw new Error('ui:utils.js: bourse value is not defined')
          }
        }
      }
    }
  }

  stopIndex () {
    debug('stopIndex is called')
    debug(stop)
    stop = stopxCoin(true)
  }

  resetIndex () {
    debug('resetIndex is called')
    document.getElementsByName('check')[0].value = ''
    document.getElementsByName('logInfo')[0].value = ''
    document.getElementsByName('bourse')[0].selectedIndex = 0
    document.getElementsByName('symbols')[0].options.length = 0
    document.getElementsByName('symbols')[0].options.add(new Option('...', 0, 'selected'))
    document.getElementsByName('runPrice')[0].selectedIndex = 0
    document.getElementsByName('runNum')[0].value = ''
    document.getElementsByName('runLong')[0].selectedIndex = 0
  }
}

module.exports = utils
