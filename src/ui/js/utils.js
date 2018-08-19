'use strict'

const debug = require('debug')('ui:js:utils')
const ipc = require('electron').ipcRenderer
const fs = require('fs')
const path = require('path')
const config = require('../../core/config.js')
const Crypto = require('../../core/crypto.js')
const Register = require('../../core/register.js')
const jsonFilePath = path.resolve(process.cwd(), './config.json')
const CoreUtils = require('../../core/utils.js')
const abcc = new CoreUtils(config.abcc)
const abccScript = require('../../core/script/abcc.default.js')
const argvName = (process.argv.indexOf('--username') >= 0)
const argvPassword = (process.argv.indexOf('--password') >= 0)
const username = argvName > 0 ? process.argv[process.argv.indexOf('--username') + 1] : abcc.getUsername()
const password = argvPassword > 0 ? process.argv[process.argv.indexOf('--password') + 1] : abcc.getPassword()

var browser
var intervalExchage = 0
var intervalRevoke = 0
var stop = true
var reset = true

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

async function stopxCoin () {
  debug('stopxCoin is called')
  stop = !stop
  if (stop) {
    log('正在暂停刷币程序...')
  } else {
    log('正在继续刷币程序...')
  }
  if (stop) {
    document.getElementsByName('stop')[0].value = '继  续'
  } else {
    document.getElementsByName('stop')[0].value = '暂  停'
  }
}

async function resetxCoin () {
  debug('resetxCoin is called')
  log('正在重置刷币程序...')
  await clearInterval(intervalRevoke)
  await browser.close()
  intervalExchage = 0
  intervalRevoke = 0
  stop = true
  reset = true
  document.getElementsByName('stop')[0].value = '暂  停'
}

async function runxCoin (xsymbols, xrunPrice, xrunNum, xrunEpoch, xCoin, xconfig) {
  debug('runxCoin is called')
  log('设置完成，开始运行刷币程序...')
  const priceStr = new Array('市价买卖', '限价买卖(现价买卖)', '限价买卖(买一卖一价)', '限价买卖(买二卖二价)')
  const exchangeURL = await abcc.getSymbolsAddr(xsymbols)
  log('已选择交易对: ' + xsymbols)
  log('已选择交易价格: ' + priceStr[xrunPrice - 1])
  log('已选择交易数量: ' + xrunNum)
  log('已选择交易频率: ' + xrunEpoch)
  log('正在打开交易页面: ' + exchangeURL)
  log('提示: 正在进行自动交易, 请不要关闭窗口!')
  debug('username: ' + username)
  debug('password: ' + password)
  browser = await abccScript.init()
  const pageLogin = await abccScript.login(browser, username, password)
  const obj = await abccScript.beforeExchange(browser, exchangeURL)
  const pageExchange = obj.pageExchange
  const pageProperty = obj.pageProperty
  const pageRevoke = obj.pageRevoke
  // revoke part
  intervalRevoke = await setInterval(() => {
    abccScript.runRevoke(pageRevoke, log)
  }, 1000 * xrunEpoch * 15)
  // exchange Part
  intervalExchage = 1
  let stopCandy = false
  while (!reset) {
    debug('runXcoin loop is running...')
    if (!stop) {
      stopCandy = true
      if (intervalExchage) {
        let randNum = Math.round((Math.random() - 0.5) * 2 * 100) / 100 * 0.01 // 正负 0.05 精确到3位小数
        let randEpoch = (Math.random() - 0.5) * 2 * 2 // 正负2s
        debug('randNum is: ' + randNum)
        debug('randEpoch is: ' + randEpoch)
        await abccScript.runExchange(pageExchange, xrunPrice, xrunNum, xrunEpoch + randEpoch, log)
      }
    } else {
      if (stopCandy) {
        stopCandy = false
        await abccScript.runRevoke(pageRevoke, log)
      }
      await abccScript.sleep(5000, log)
    }
  }
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
          ipc.send('redirect', 'src/ui/index.html')
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
          ipc.send('redirect', 'src/ui/login.html')
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
    ipc.send('redirect', 'src/ui/signup.html')
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
    let runEpoch = document.getElementsByName('runEpoch')[0]
    // get selected value
    let xbourse = bourse.options[bourse.selectedIndex].value
    let xsymbols = symbols.options[symbols.selectedIndex].text
    let xrunPrice = parseFloat(runPrice.options[runPrice.selectedIndex].value)
    let xrunNum = runNum.value === '' ? 0 : parseFloat(runNum.value)
    let xrunEpoch = parseFloat(runEpoch.options[runEpoch.selectedIndex].value)
    debug('xbourse:' + xbourse)
    debug('xsymbols:' + xsymbols)
    debug('xrunPrice:' + xrunPrice)
    debug('xrunNum:' + xrunNum)
    debug('xrunEpoch:' + xrunEpoch)
    debug('stop:' + stop)
    debug('reset:' + reset)
    debug('intervalExchage:' + intervalExchage)
    debug('intervalRevoke:' + intervalRevoke)
    if (xbourse === '0' || xsymbols === '...' || xrunPrice === 0 || xrunNum <= 0 || xrunEpoch === 0) {
      debug('run inValide: not selceted all item')
      document.getElementsByName('check')[0].style.color = '#f00'
      document.getElementsByName('check')[0].value = '设置错误：请检查设置项'
      document.getElementsByName('bourse')[0].value = xbourse
    } else {
      if (intervalRevoke !== 0 || intervalExchage !== 0 || stop !== true || reset !== true) {
        document.getElementsByName('check')[0].style.color = '#f00'
        document.getElementsByName('check')[0].value = '正在运行，请重置后再运行'
        document.getElementsByName('bourse')[0].value = xbourse
      } else {
        stop = false
        reset = false
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
    stopxCoin()
    document.getElementsByName('check')[0].value = ''
  }

  resetIndex () {
    debug('resetIndex is called')
    resetxCoin()
    // debug(document.getElementsByName('logInfo')[0])
    document.getElementsByName('check')[0].value = ''
    document.getElementsByName('logInfo')[0].innerHTML = ''
    document.getElementsByName('bourse')[0].selectedIndex = 0
    document.getElementsByName('symbols')[0].options.length = 0
    document.getElementsByName('symbols')[0].options.add(new Option('...', 0, 'selected'))
    document.getElementsByName('runPrice')[0].selectedIndex = 0
    document.getElementsByName('runNum')[0].value = ''
    document.getElementsByName('runEpoch')[0].selectedIndex = 0
  }
}

module.exports = utils
