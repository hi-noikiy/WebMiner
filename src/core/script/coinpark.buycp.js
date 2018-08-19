/**
 * @name Coinpark-Default
 * @desc  signup and auto trading for coinpark init mining
 */
'use strict'

const debug = require('debug')('core:script:coinpark')
const puppeteer = require('puppeteer')
const path = require('path')
const CoreUtils = require(path.join(__dirname, '../utils.js'))
const config = require(path.join(__dirname, '../config.js'))
const coinpark = new CoreUtils(config.coinpark)
const math = require('mathjs')
const argvName = (process.argv.indexOf('--username') >= 0)
const argvPassword = (process.argv.indexOf('--password') >= 0)

const username = argvName > 0 ? process.argv[process.argv.indexOf('--username') + 1] : coinpark.getUsername()
const password = argvPassword > 0 ? process.argv[process.argv.indexOf('--password') + 1] : coinpark.getPassword()

var exchangePageDataLoadingWaitingTime = 1000 * 2 // wait for 5s
const runExchangeEpoch = 1000 * 5 // wait for 1s

var symbols = 'CP_USDT' // default

async function init () {
  debug('init function is called')
  // const browser = await puppeteer.launch()
  let browser = await puppeteer.launch({
    headless: false,
    slowMo: 5,
    args: [
      '--disable-infobars',
      // '--no-sandbox',
      // '--disable-setuid-sandbox',
      // '--auto-open-devtools-for-tabs',
      '--cast-initial-screen-width',
      '--cast-initial-screen-height'
    ]
  })
  debug('init function is done')
  return browser
}

async function login (browser) {
  debug('login function is called')
  let pageLogin = await browser.newPage()
  // get login by user first
  await pageLogin.goto('https://www.coinpark.cc/login', {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  try {
    await pageLogin.click('#app > div.login-common-boxs > div.el-dialog__wrapper > div > div.el-dialog__footer > span > button')
  } catch (err) {
    debug('// WARNING: login first confirm button is gone...')
    // throw (err)
  }
  debug('running with current username: ' + username)
  debug('runing with current password: ' + password)
  await pageLogin.type('#app > div.login-common-boxs > div.pd-tb24.pd-lr12 > div.logins-commons.pd-lr24.pd-tb24.mg-t32 > div.login-fish > form > div:nth-child(2) > div > div > input', username)
  await pageLogin.type('#app > div.login-common-boxs > div.pd-tb24.pd-lr12 > div.logins-commons.pd-lr24.pd-tb24.mg-t32 > div.login-fish > form > div:nth-child(3) > div > div > input', password)
  await pageLogin.click('#app > div.login-common-boxs > div.pd-tb24.pd-lr12 > div.logins-commons.pd-lr24.pd-tb24.mg-t32 > div.login-fish > form > button')
  // check is login
  await pageLogin.waitForSelector('#app > div:nth-child(2) > header > div > div.nav-right.ts-12.text-center > div.mg-l24 > div > span > div > span > svg > use', {
    timeout: 0
  })
  debug('login function is done')
  return pageLogin
}

async function beforeExchang (browser) {
  debug('beforeExchang function is called')
  // before auto trade
  const pageProperty = await browser.newPage()
  await pageProperty.goto('https://www.coinpark.cc/property', {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  const pageMandatory = await browser.newPage()
  await pageMandatory.goto('https://www.coinpark.cc/mandatory', {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  const pageExchange = await browser.newPage()
  await pageExchange.goto('https://www.coinpark.cc/fullExchange', {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  const pageExchange1 = await browser.newPage()
  await pageExchange1.goto('https://www.coinpark.cc/fullExchange', {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  // return
  debug('beforeExchang function is done')
  return {
    pageExchange: pageExchange,
    pageExchange1: pageExchange1,
    pageProperty: pageProperty,
    pageMandatory: pageMandatory
  }
}

async function runInitBalance (pageExchange) {
  debug('runInitBalance function is called')
  const symbols = {
    'bixusdt': 'BIX_USDT'
    // 'btcusdt': 'BTC_USDT',
    // 'ethusdt': 'ETH_USDT',
    // 'etcusdt': 'ETC_USDT',
    // 'bchusdt': 'BCH_USDT',
    // 'ltcusdt': 'LTC_USDT'
  }
  debug('symbols length: ' + Object.keys(symbols).length)
  for (let i = 0; i < Object.keys(symbols).length; i++) {
    let key = Object.keys(symbols)[i]
    await pageExchange.goto('https://www.coinpark.cc/fullExchange?coinPair=' + symbols[key], {
      timeout: 0,
      waitUntil: 'networkidle0'
    })
    // waiting for box data is loading
    await pageExchange.waitFor(global.exchangePageDataLoadingWaitingTime)
    debug('waiting for box data is loading')
    let priceBoxHandle = await pageExchange.$eval('#app > div.full-main > div:nth-child(2) > div.depth-main.h-transition.ts-12.ex-tc-primary.exchange-content-bg.full-border-left.full-border-right > div.pd-t8.pd-b8', (heading) => {
      return heading.textContent
    }).then((value) => {
      // debug(value)
      return value.replace(/\,/g, '').split('\n') // eslint-disable-line
    })
    debug('priceBoxHandle ( type: ' + typeof (priceBoxHandle) + '，length: ' + priceBoxHandle.length + ' ) value: \n' + priceBoxHandle)

    let nowPrice = parseFloat(priceBoxHandle[1].split('≈')[0]) > 0 ? parseFloat(priceBoxHandle[1].split('≈')[0]) : 0
    debug('nowPrice: ' + nowPrice) // should be num

    let priceBoxHandleSell = priceBoxHandle[0].substring(priceBoxHandle[0].lastIndexOf(')') + 5, priceBoxHandle[0].length - 2).split(' ')
    let priceBoxHandleBuy = priceBoxHandle[2].substring(8, priceBoxHandle[2].length - 1).split(' ')
    debug('priceBoxHandleSell:' + priceBoxHandleSell)
    debug('priceBoxHandleBuy:' + priceBoxHandleBuy)

    let boxLength = priceBoxHandleSell.length === priceBoxHandleBuy.length ? math.floor(priceBoxHandleSell.length / 3) : 0 // should not be 0
    // debug('boxLength:' + boxLength)

    let buyBoxPrice = []
    for (let i = 0; i < boxLength; i++) {
      buyBoxPrice[i] = parseFloat(priceBoxHandleBuy[i * 3]) > 0 ? parseFloat(priceBoxHandleBuy[i * 3]) : 0
    }
    // debug('buyBoxPrice ( type: ' + typeof (buyBoxPrice) + '，length: ' + buyBoxPrice.length + ' ) value: \n' + buyBoxPrice)

    let sellPrice = nowPrice.toString()
    // let sellPrice = buyBoxPrice[1].toString()
    await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(2) > div > div.box-input-box > input', sellPrice)
    await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(4)') // buy 100%
    let sellNum = await pageExchange.$('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(3) > div > div.box-input-box > input').then(async (ElementHandle) => {
      let value = await (await ElementHandle.getProperty('value')).jsonValue()
      // debug('current sell input value:' + value)
      return parseFloat(value) > 0 ? parseFloat(value) : 0
    })
    if (sellNum * sellPrice > 5) {
      debug('sell price : ' + sellPrice)
      debug('sell sellNum : ' + sellNum)
      await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(6) > button')
    }
    debug('runInitBalance of symbols ( ' + symbols[key] + ' ) is done')
  }
  debug('runInitBalance function is done')
}

async function runExchange (pageExchange, symbols) {
  debug('runExchange function is called')
  // need balance after a while
  await pageExchange.goto('https://www.coinpark.cc/fullExchange?coinPair=' + symbols, {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  // waiting for box data is loading
  await pageExchange.waitFor(global.exchangePageDataLoadingWaitingTime)
  debug('waiting for box data is loading')
  let priceBoxHandle = await pageExchange.$eval('#app > div.full-main > div:nth-child(2) > div.depth-main.h-transition.ts-12.ex-tc-primary.exchange-content-bg.full-border-left.full-border-right > div.pd-t8.pd-b8', (heading) => {
    return heading.textContent
  }).then((value) => {
    // debug(value)
    return value.replace(/\,/g, '').split('\n') // eslint-disable-line
  })
  // debug('priceBoxHandle ( type: ' + typeof (priceBoxHandle) + '，length: ' + priceBoxHandle.length + ' ) value: \n' + priceBoxHandle)

  let nowPrice = parseFloat(priceBoxHandle[1].split('≈')[0]) > 0 ? parseFloat(priceBoxHandle[1].split('≈')[0]) : 0
  debug('nowPrice: ' + nowPrice) // should be num

  let priceBoxHandleSell = priceBoxHandle[0].substring(priceBoxHandle[0].lastIndexOf(')') + 5, priceBoxHandle[0].length - 2).split(' ')
  let priceBoxHandleBuy = priceBoxHandle[2].substring(8, priceBoxHandle[2].length - 1).split(' ')
  // debug('priceBoxHandleSell:' + priceBoxHandleSell)
  // debug('priceBoxHandleBuy:' + priceBoxHandleBuy)

  let boxLength = priceBoxHandleSell.length === priceBoxHandleBuy.length ? math.floor(priceBoxHandleSell.length / 3) : 0 // should not be 0
  // debug('boxLength:' + boxLength)

  let sellBoxPrice = []
  let sellBoxNum = []
  let sellBoxMonny = []
  for (let i = 0; i < boxLength; i++) {
    sellBoxPrice[boxLength - 1 - i] = parseFloat(priceBoxHandleSell[i * 3]) > 0 ? parseFloat(priceBoxHandleSell[i * 3]) : 0
    sellBoxNum[boxLength - 1 - i] = parseFloat(priceBoxHandleSell[i * 3 + 1]) > 0 ? parseFloat(priceBoxHandleSell[i * 3 + 1]) : 0
    sellBoxMonny[boxLength - 1 - i] = parseFloat(priceBoxHandleSell[i * 3 + 2]) > 0 ? parseFloat(priceBoxHandleSell[i * 3 + 2]) : 0
  }
  debug('sellBoxPrice ( type: ' + typeof (sellBoxPrice) + '，length: ' + sellBoxPrice.length + ' ) value: \n' + sellBoxPrice)
  debug('sellBoxNum ( type: ' + typeof (sellBoxNum) + '，length: ' + sellBoxNum.length + ' ) value: \n' + sellBoxNum)
  debug('sellBoxMonny ( type: ' + typeof (sellBoxMonny) + '，length: ' + sellBoxMonny.length + ' ) value: \n' + sellBoxMonny)

  let buyBoxPrice = []
  let buyBoxNum = []
  let buyBoxMonny = []
  for (let i = 0; i < boxLength; i++) {
    buyBoxPrice[i] = parseFloat(priceBoxHandleBuy[i * 3]) > 0 ? parseFloat(priceBoxHandleBuy[i * 3]) : 0
    buyBoxNum[i] = parseFloat(priceBoxHandleBuy[i * 3 + 1]) > 0 ? parseFloat(priceBoxHandleBuy[i * 3 + 1]) : 0
    buyBoxMonny[i] = parseFloat(priceBoxHandleBuy[i * 3 + 2]) > 0 ? parseFloat(priceBoxHandleBuy[i * 3 + 2]) : 0
  }
  debug('buyBoxPrice ( type: ' + typeof (buyBoxPrice) + '，length: ' + buyBoxPrice.length + ' ) value: \n' + buyBoxPrice)
  debug('buyBoxNum ( type: ' + typeof (buyBoxNum) + '，length: ' + buyBoxNum.length + ' ) value: \n' + buyBoxNum)
  debug('buyBoxMonny ( type: ' + typeof (buyBoxMonny) + '，length: ' + buyBoxMonny.length + ' ) value: \n' + buyBoxMonny)

  // auto buy
  let buyPrice = nowPrice.toString()
  // let buyPrice = sellBoxPrice[3].toString()
  await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(2) > div > div.box-input-box > input', buyPrice)
  // let buyNum = '0.02'
  // await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(3) > div > div.box-input-box > input', buyNum)
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(4)') // buy 100%
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(3)') // buy 75%
  await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(2)') // buy 50%
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(1)') // buy 25%
  let buyNum = await pageExchange.$('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(3) > div > div.box-input-box > input').then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('value')).jsonValue()
    debug('current buy input value:' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  // atuo sell
  // let sellPrice = nowPrice.toString()
  // let sellPrice = buyBoxPrice[3].toString()
  // await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(2) > div > div.box-input-box > input', sellPrice)
  // let sellNum = '0.04'
  // await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(3) > div > div.box-input-box > input', sellNum)
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(4)') // sell 100%
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(3)') // sell 75%
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(2)') // sell 50%
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(1)') // sell 25%
  // let sellNum = await pageExchange.$('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(3) > div > div.box-input-box > input').then(async (ElementHandle) => {
  //   let value = await (await ElementHandle.getProperty('value')).jsonValue()
  //   debug('current sell input value:' + value)
  //   return parseFloat(value) > 0 ? parseFloat(value) : 0
  // })

  if (buyNum * buyPrice > 5 && buyPrice < 1) {
    debug('buyPrice: ' + buyPrice)
    debug('buyNum: ' + buyNum)
    await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(6) > button') // buy
    debug('exchange click buy button done')
  }

  // if (sellNum * sellPrice > 5) {
  //   debug('sellPrice: ' + sellPrice)
  //   debug('sellNum: ' + sellNum)
  //   await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(6) > button') // sell
  //   debug('exchange click sell button done')
  //   debug('runExchange function is done')
  // }
}

(async () => {
  debug('coinpark.buycp.js is running')
  // Init user
  debug('running with current username: ' + username)
  debug('runing with current password: ' + password)
  // Init the script
  const browser = await init()
  // get login
  await login(browser)
  // before exchange
  let pageObj = await beforeExchang(browser)
  const pageExchange = await pageObj.pageExchange
  const pageExchange1 = await pageObj.pageExchange1
  // const pageProperty = await pageObj.pageProperty
  // const pageMandatory = await pageObj.pageMandatory

  // ******************************************************************************
  // * Auto Trade Begins here
  // ******************************************************************************
  debug('Part 0. Auto Trade start')
  global.exchangePageDataLoadingWaitingTime = exchangePageDataLoadingWaitingTime
  global.symbols = symbols
  debug(global.exchangePageDataLoadingWaitingTime)
  debug(global.symbols)
  await runInitBalance(pageExchange)
  await setExhange(pageExchange1, runExchangeEpoch)
  debug('Part 0. Auto Trade end')
})()

async function setExhange (pageExchange, runExchangeEpoch) {
  debug('setExhange is called')
  global.runExchangeIntervalIndex = await setInterval(async () => {
    await runExchange(pageExchange, global.symbols)
  }, runExchangeEpoch)
}
