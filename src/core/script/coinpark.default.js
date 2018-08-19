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

const dowhileTimeout = 1000 * 60 * 5 // maxmum 5 min
const waitOrderTime = 1000 * 5 // rest for 5s
const checkTimeout = 1000 * 60 * 1 // wait maxmum 1 min
const exchangePageDataLoadingWaitingTime = 1000 * 2 // wait for 4s

const miningMaxNum = 100 // max 100 cp 1 hour
const runInitBalanceEpoch = 1000 * 60 * 60 // 1 hour 初始化一次
const runBalanceEpoch = 1000 * 60 * 5 // 5-10 min 平衡一次
const runExchangeEpoch = 1000 * 0.5
const runRevokeEpoch = 1000 * 60
const runPropertyEpoch = 1000 * 60 * 10 // 10 min check 一次
const slowMo = 5 // slow down by 5ms

var symbols = 'BIX_USDT' // default
var runExchangeIntervalIndex
var runBanlanceIntervalIndex
var runRevokeIntervalIndex

var isFinished

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function init () {
  debug('init function is called')
  // const browser = await puppeteer.launch()
  let browser = await puppeteer.launch({
    headless: false,
    slowMo: slowMo,
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
  // return
  debug('beforeExchang function is done')
  return {
    pageExchange: pageExchange,
    pageProperty: pageProperty,
    pageMandatory: pageMandatory
  }
}

async function runInitBalance (pageExchange) {
  debug('runInitBalance function is called')
  const symbols = {
    'bixusdt': 'BIX_USDT',
    'btcusdt': 'BTC_USDT',
    'ethusdt': 'ETH_USDT',
    'etcusdt': 'ETC_USDT',
    'bchusdt': 'BCH_USDT',
    'ltcusdt': 'LTC_USDT'
  }
  debug('symbols length: ' + Object.keys(symbols).length)
  for (let i = 0; i < Object.keys(symbols).length; i++) {
    let key = Object.keys(symbols)[i]
    await pageExchange.goto('https://www.coinpark.cc/fullExchange?coinPair=' + symbols[key], {
      timeout: 0,
      waitUntil: 'networkidle0'
    })
    // waiting for box data is loading
    await pageExchange.waitFor(exchangePageDataLoadingWaitingTime)
    let priceBoxHandle = await pageExchange.$eval('#app > div.full-main > div:nth-child(2) > div.depth-main.h-transition.ts-12.ex-tc-primary.exchange-content-bg.full-border-left.full-border-right > div.pd-t8.pd-b8', (heading) => {
      return heading.textContent
    }).then((value) => {
      // debug(value)
      return value.replace(/\,/g, '').split('\n')  // eslint-disable-line
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

    // let sellPrice = nowPrice.toString()
    let sellPrice = buyBoxPrice[1].toString()
    await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(2) > div > div.box-input-box > input', sellPrice)
    await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(4)') // buy 100%
    let num = await pageExchange.$('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(3) > div > div.box-input-box > input').then(async (ElementHandle) => {
      let value = await (await ElementHandle.getProperty('value')).jsonValue()
      // debug('current sell input value:' + value)
      return parseFloat(value) > 0 ? parseFloat(value) : 0
    })
    if (num > 0) {
      await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(6) > button')
    }
    debug('sell price : ' + sellPrice)
    debug('sell num : ' + num)
    debug('runInitBalance of symbols ( ' + symbols[key] + ' ) is done')
  }
  debug('runInitBalance function is done')
}

async function runBalance (pageExchange) {
  debug('runBalance function is called')
  const symbols = {
    'bixusdt': 'BIX_USDT',
    'etcusdt': 'ETC_USDT',
    'ltcusdt': 'LTC_USDT'
  }
  debug('symbols length: ' + Object.keys(symbols).length)
  let symbolsMoneyAmount = []
  for (let i = 0; i < Object.keys(symbols).length; i++) {
    let key = Object.keys(symbols)[i]
    debug('processing balance of symbols ( ' + symbols[key] + ' )')
    await pageExchange.goto('https://www.coinpark.cc/fullExchange?coinPair=' + symbols[key], {
      timeout: 0,
      waitUntil: 'networkidle0'
    })
    // waiting for box data is loading
    await pageExchange.waitFor(exchangePageDataLoadingWaitingTime)
    let priceBoxHandle = await pageExchange.$eval('#app > div.full-main > div:nth-child(2) > div.depth-main.h-transition.ts-12.ex-tc-primary.exchange-content-bg.full-border-left.full-border-right > div.pd-t8.pd-b8', (heading) => {
      return heading.textContent
    }).then((value) => {
      // debug(value)
      return value.replace(/\,/g, '').split('\n')  // eslint-disable-line
    })
    // debug('priceBoxHandle ( type: ' + typeof (priceBoxHandle) + '，length: ' + priceBoxHandle.length + ' ) value: \n' + priceBoxHandle)

    let nowPrice = parseFloat(priceBoxHandle[1].split('≈')[0]) > 0 ? parseFloat(priceBoxHandle[1].split('≈')[0]) : 0
    debug('nowPrice: ' + nowPrice) // should be num

    let priceBoxHandleSell = priceBoxHandle[0].substring(priceBoxHandle[0].lastIndexOf(')') + 5, priceBoxHandle[0].length - 2).split(' ')
    let priceBoxHandleBuy = priceBoxHandle[2].substring(8, priceBoxHandle[2].length - 1).split(' ')
    // debug('priceBoxHandleSell:' + priceBoxHandleSell)
    // debug('priceBoxHandleBuy:' + priceBoxHandleBuy)

    let boxLength = priceBoxHandleSell.length === priceBoxHandleBuy.length ? math.floor(priceBoxHandleSell.length / 3) : 0 // should not be 0
    debug('boxLength:' + boxLength)

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

    symbolsMoneyAmount[i] = math.sum(sellBoxMonny) + math.sum(buyBoxMonny)
    debug('symbolsMoneyAmount of symbols ( ' + symbols[key] + ' ) is: ' + symbolsMoneyAmount[i])
  }
  let maxIndex = symbolsMoneyAmount.indexOf(math.max(symbolsMoneyAmount))
  let key = Object.keys(symbols)[maxIndex]
  debug('symbolsMoneyAmount is: ' + symbolsMoneyAmount)
  // debug(maxIndex)
  // debug(key)
  debug('banlance selected the max money amount symbols ( ' + symbols[key] + ' ) to run banlance')
  await pageExchange.goto('https://www.coinpark.cc/fullExchange?coinPair=' + symbols[key], {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  // waiting for box data is loading
  await pageExchange.waitFor(exchangePageDataLoadingWaitingTime)
  let priceBoxHandle = await pageExchange.$eval('#app > div.full-main > div:nth-child(2) > div.depth-main.h-transition.ts-12.ex-tc-primary.exchange-content-bg.full-border-left.full-border-right > div.pd-t8.pd-b8', (heading) => {
    return heading.textContent
  }).then((value) => {
    // debug(value)
    return value.replace(/\,/g, '').split('\n')  // eslint-disable-line
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

  // auto buy box
  let buyPrice = nowPrice.toString()
  // let buyPrice = sellBoxPrice[1].toString()
  await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(2) > div > div.box-input-box > input', buyPrice)
  await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(4)') // buy 100%
  let buyNum = await pageExchange.$('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(3) > div > div.box-input-box > input').then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('value')).jsonValue()
    debug('current buy input value:' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  // auto sell box
  let sellPrice = nowPrice.toString()
  // let sellPrice = buyBoxPrice[1].toString()
  await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(3) > div > div.box-input-box > input', sellPrice)
  await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(4)') // buy 100%
  let sellNum = await pageExchange.$('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(3) > div > div.box-input-box > input').then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('value')).jsonValue()
    debug('current sell input value:' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })
  debug(buyNum)
  debug(sellNum)
  if (buyNum !== sellNum) {
    if (buyNum > sellNum) { // buy
      debug('blance to buy')
      let buyPrice = sellBoxPrice[1].toString()
      await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(2) > div > div.box-input-box > input', buyPrice)
      await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(3) > div > div.box-input-box > input', (buyNum - sellNum).toString())
      await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(6) > button') // buy
    } else { // sell
      debug('blance to sell')
      let sellPrice = buyBoxPrice[1].toString()
      await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(2) > div > div.box-input-box > input', sellPrice)
      await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(3) > div > div.box-input-box > input', (sellNum - buyNum).toString())
      await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(6) > button') // sell
    }
  }
  debug('runBalance function is done')
  return (symbols[key])
}

async function runExchange (pageExchange, symbols) {
  debug('runExchange function is called')
  // need balance after a while
  await pageExchange.goto('https://www.coinpark.cc/fullExchange?coinPair=' + symbols, {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  // waiting for box data is loading
  await pageExchange.waitFor(exchangePageDataLoadingWaitingTime)
  let priceBoxHandle = await pageExchange.$eval('#app > div.full-main > div:nth-child(2) > div.depth-main.h-transition.ts-12.ex-tc-primary.exchange-content-bg.full-border-left.full-border-right > div.pd-t8.pd-b8', (heading) => {
    return heading.textContent
  }).then((value) => {
    // debug(value)
    return value.replace(/\,/g, '').split('\n')  // eslint-disable-line
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
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(2)') // buy 50%
  await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(1)') // buy 25%
  let buyNum = await pageExchange.$('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(3) > div > div.box-input-box > input').then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('value')).jsonValue()
    debug('current buy input value:' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  // atuo sell
  let sellPrice = nowPrice.toString()
  // let sellPrice = buyBoxPrice[3].toString()
  await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(2) > div > div.box-input-box > input', sellPrice)
  // let sellNum = '0.04'
  // await pageExchange.type('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(3) > div > div.box-input-box > input', sellNum)
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(4)') // sell 100%
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(3)') // sell 75%
  // await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(2)') // sell 50%
  await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li.flex-box.space-between.color-grey.ts-12.trader-box_percentage_Dark > div:nth-child(1)') // sell 25%
  let sellNum = await pageExchange.$('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(3) > div > div.box-input-box > input').then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('value')).jsonValue()
    debug('current sell input value:' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  if (buyNum * buyPrice > 5) {
    debug('buyPrice: ' + buyPrice)
    debug('buyNum: ' + buyNum)
    await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div.pd-r20 > ul > li:nth-child(6) > button') // buy
    debug('exchange click buy button done')
  }
  if (sellNum * sellPrice > 5) {
    debug('sellPrice: ' + sellPrice)
    debug('sellNum: ' + sellNum)
    await pageExchange.click('#js_trade > div.flex-box.pd-lr16 > div:nth-child(2) > ul > li:nth-child(6) > button') // sell
    debug('exchange click sell button done')
    debug('runExchange function is done')
  }
}

async function runRevoke (pageMandatory) {
  debug('runRevoke function is called')
  // waiting for box data is loading
  await pageMandatory.waitFor(exchangePageDataLoadingWaitingTime)
  //
  const buttonNextSelector = '#app > div:nth-child(2) > div > div > div > div.pd-t16 > div > div.box-table-template-default.box-table-theme_Light > div.el-pagination.is-background.text-right.mg-t24 > button.btn-next > i'
  const buttonBeforeSelector = '#app > div:nth-child(2) > div > div > div > div.pd-t16 > div > div.box-table-template-default.box-table-theme_Light > div.el-pagination.is-background.text-right.mg-t24 > button.btn-prev > i'
  const currentSelector = '#app > div:nth-child(2) > div > div > div > div.pd-t16 > div > div.box-table-template-default.box-table-theme_Light > div.el-pagination.is-background.text-right.mg-t24 > ul > li.number.active'
  const revokeButtonsSelector = '.box-button.color-theme.box-btn-s_small.box-btn-t_normal' // need to change tomorrow

  // get pageNum
  let lastPage = 0
  let currentPage = 1
  let beginTime = await new Date().getTime()
  do {
    try {
      lastPage = currentPage
      await pageMandatory.click(buttonNextSelector)
      await pageMandatory.waitFor(500)
      await debug('current get pageNum input click next succeed')
      currentPage = await pageMandatory.$(currentSelector).then(async (ElementHandle) => {
        let value = await (await ElementHandle.getProperty('textContent')).jsonValue()
        await debug('current get pageNum input value:' + value)
        return parseFloat(value) > lastPage ? parseFloat(value) : lastPage
      })
    } catch (err) {
      await debug('// WARNING: getPageNum Can not find more button')
    }
  } while (lastPage !== currentPage && new Date().getTime() < beginTime + dowhileTimeout)

  // revoke all but 1 first page
  beginTime = await new Date().getTime()
  do {
    try {
      lastPage = currentPage
      await pageMandatory.click(buttonBeforeSelector)
      await pageMandatory.waitFor(500)
      await debug('current revoke all input click before succeed')
      currentPage = await pageMandatory.$(currentSelector).then(async (ElementHandle) => {
        let value = await (await ElementHandle.getProperty('textContent')).jsonValue()
        await debug('current revoke all input value:' + value)
        return parseFloat(value) < lastPage ? parseFloat(value) : lastPage
      })
      await pageMandatory.$$(revokeButtonsSelector).then(async (ElementHandle) => {
        let length = ElementHandle.length
        for (let i = 0; i < length; i++) {
          let value = await (await ElementHandle[i].getProperty('textContent')).jsonValue()
          await debug('current revoke all input value:' + value)
          if (value === '<!----> 撤单') {
            try {
              // pageMandatory.click('revokeButtonsSelector')
              ElementHandle[i].click()
              await debug('Revoke Current Page ( ' + i + ' ) succeed')
            } catch (err) {
              await debug('// WARNING: Revoke Current Page ( ' + i + ' ) failed, error:\n')
              await debug(err)
            }
          }
        }
      })
    } catch (err) {
      await debug('// WARNING: Revoke AllPages Can not find more button')
    }
  } while (currentPage > 1 && lastPage !== currentPage && new Date().getTime() < beginTime + dowhileTimeout)
  debug('runRevoke function is done')
}

async function runProperty (pageProperty) {
  debug('runProperty function is called')
  const ETHTotalSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(1) > td:nth-child(4) > div'
  const ETHFrozenSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(1) > td:nth-child(5) > div'
  const BIXTotalSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(4) > td:nth-child(4) > div'
  const BIXFrozenSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(4) > td:nth-child(5) > div'
  const ETCTotalSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(2) > td:nth-child(4) > div'
  const ETCFrozenSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(2) > td:nth-child(5) > div'
  const LTCTotalSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(8) > td:nth-child(4) > div'
  const LTCFrozenSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(8) > td:nth-child(5) > div'
  const USDTTotalSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(3) > td:nth-child(4) > div'
  const USDTFrozenSelector = '#app > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div.pd-t16.text-right.ts-14 > div.box-table-template-default.box-table-theme_Light > div > div > div > table > tbody > tr:nth-child(3) > td:nth-child(5) > div'

  let ETHTotalValues = await pageProperty.$(ETHTotalSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })
  let ETHFrozenValues = await pageProperty.$(ETHFrozenSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  let BIXTotalValues = await pageProperty.$(BIXTotalSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })
  let BIXFrozenValues = await pageProperty.$(BIXFrozenSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  let ETCTotalValues = await pageProperty.$(ETCTotalSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })
  let ETCFrozenValues = await pageProperty.$(ETCFrozenSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  let LTCTotalValues = await pageProperty.$(LTCTotalSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })
  let LTCFrozenValues = await pageProperty.$(LTCFrozenSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  let USDTTotalValues = await pageProperty.$(USDTTotalSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })
  let USDTFrozenValues = await pageProperty.$(USDTFrozenSelector).then(async (ElementHandle) => {
    let value = await (await ElementHandle.getProperty('innerText')).jsonValue()
    // debug('current xcoint value: ' + value)
    return parseFloat(value) > 0 ? parseFloat(value) : 0
  })

  debug('ETHTotalValues is: ' + ETHTotalValues)
  debug('ETHFrozenValues is: ' + ETHFrozenValues)
  debug('BIXTotalValues is: ' + BIXTotalValues)
  debug('BIXFrozenValues is: ' + BIXFrozenValues)
  debug('ETCTotalValues is: ' + ETCTotalValues)
  debug('ETCFrozenValues is: ' + ETCFrozenValues)
  debug('LTCTotalValues is: ' + LTCTotalValues)
  debug('LTCFrozenValues is: ' + LTCFrozenValues)
  debug('USDTTotalValues is: ' + USDTTotalValues)
  debug('USDTFrozenValues is: ' + USDTFrozenValues)

  let obj = await {
    ETHTotalValues: ETHTotalValues,
    ETHFrozenValues: ETHFrozenValues,
    BIXTotalValues: BIXTotalValues,
    BIXFrozenValues: BIXFrozenValues,
    ETCTotalValues: ETCTotalValues,
    ETCFrozenValues: ETCFrozenValues,
    LTCTotalValues: LTCTotalValues,
    LTCFrozenValues: LTCFrozenValues,
    USDTTotalValues: USDTTotalValues,
    USDTFrozenValues: USDTFrozenValues
  }
  debug('runProperty function is done')
  return (obj)
}

async function checkAllOder (propertyObj, timeout) {
  debug('checkAllOder function is called')
  // let ETHTotalValues = await propertyObj.ETHTotalValues
  let ETHFrozenValues = await propertyObj.ETHFrozenValues
  // let BIXTotalValues = await propertyObj.BIXTotalValues
  let BIXFrozenValues = await propertyObj.BIXFrozenValues
  // let ETCTotalValues = await propertyObj.ETCTotalValues
  let ETCFrozenValues = await propertyObj.ETCFrozenValues
  // let LTCTotalValues = await propertyObj.LTCTotalValues
  let LTCFrozenValues = await propertyObj.LTCFrozenValues
  // let USDTTotalValues = await propertyObj.USDTTotalValues
  let USDTFrozenValues = await propertyObj.USDTFrozenValues
  let beginTime = await new Date().getTime()
  do {
    if (ETHFrozenValues === 0 && BIXFrozenValues === 0 && ETCFrozenValues === 0 && LTCFrozenValues === 0 && USDTFrozenValues === 0) {
      await debug('Check All Order Finished Pass')
      return true
    } else {
      await debug('// WARNING: Check All Order Finised Failed, Wait for 2s...')
      await sleep(2000) // 2s check once
    }
  } while (new Date().getTime() < beginTime + timeout)
  debug('checkAllOder function is done')
  return false
}

async function checkHourAmount (propertyObj, timeout) {
  debug('checkAllOder function is called')
  let ETHTotalValues = await propertyObj.ETHTotalValues
  let ETHFrozenValues = await propertyObj.ETHFrozenValues
  let BIXTotalValues = await propertyObj.BIXTotalValues
  let BIXFrozenValues = await propertyObj.BIXFrozenValues
  let ETCTotalValues = await propertyObj.ETCTotalValues
  let ETCFrozenValues = await propertyObj.ETCFrozenValues
  let LTCTotalValues = await propertyObj.LTCTotalValues
  let LTCFrozenValues = await propertyObj.LTCFrozenValues
  let USDTTotalValues = await propertyObj.USDTTotalValues
  let USDTFrozenValues = await propertyObj.USDTFrozenValues
  let beginTime = await new Date().getTime()
  do {
    if (ETHFrozenValues === 0 && BIXFrozenValues === 0 && ETCFrozenValues === 0 && LTCFrozenValues === 0 && USDTFrozenValues === 0) {
      await debug('Check All Order Finished Pass')
      return true
    } else {
      await debug('// WARNING: Check All Order Finised Failed, Wait for 2s...')
      await sleep(2000) // 2s check once
    }
  } while (new Date().getTime() < beginTime + timeout)
  debug('checkAllOder function is done')
  return false
}

(async () => {
  debug('coinpark.default.js is running')
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
  const pageProperty = await pageObj.pageProperty
  const pageMandatory = await pageObj.pageMandatory
  // ******************************************************************************
  // * Auto Trade Begins here
  // * Part 0. Init script
  // ******************************************************************************
  debug('Part 0. Init script start')
  global.symbols = symbols
  debug(global.symbols)
  let beginTime = await new Date().getTime()
  do {
    await runInitBalance(pageExchange)
    await sleep(waitOrderTime)
    let propertyObj = await runProperty(pageProperty)
    isFinished = await checkAllOder(propertyObj, checkTimeout)
    if (isFinished) {
      await debug('InitBalance is Finised on Marked, will run banlance')
      global.symbols = await runBalance(pageExchange)
      await sleep(waitOrderTime)
      break
    } else {
      await debug('// WARNING: InitBalance NOT Finised, WILL RUN ROVOKE and Try Again')
      await runRevoke(pageMandatory)
      await sleep(waitOrderTime)
    }
  } while (!isFinished && new Date().getTime() < beginTime + dowhileTimeout)
  debug('Part 0. Init script end')
  debug(global.symbols)
  await setExhange(pageExchange, runExchangeEpoch)
  // ******************************************************************************
  // * Part 0. run auto Exchange
  // ******************************************************************************
  // setTimeout(async () => {
  //   setInit(pageProperty, pageExchange, pageMandatory, runBalanceEpoch)
  // }, 0)
  // setInterval(async () => {
  //   setInit(pageProperty, pageExchange, pageMandatory, runBalanceEpoch)
  // }, runInitBalanceEpoch)
})()

async function setInit (pageProperty, pageExchange, pageMandatory, runBalanceEpoch) {
  debug('setInit is called')
  await clearInterval(global.runExchangeIntervalIndex)
  await clearInterval(global.runBanlanceIntervalIndex)
  await clearInterval(global.runRevokeIntervalIndex)
  let beginTime = await new Date().getTime()
  do {
    await runInitBalance(pageExchange)
    await sleep(waitOrderTime)
    let propertyObj = await runProperty(pageProperty)
    isFinished = await checkAllOder(propertyObj, checkTimeout)
    if (isFinished) {
      await debug('InitBalance is Finised on Marked, will run banlance')
      global.symbols = await runBalance(pageExchange)
      await sleep(waitOrderTime)
      break
    } else {
      await debug('// WARNING: InitBalance NOT Finised, WILL RUN ROVOKE and Try Again')
      await runRevoke(pageMandatory)
      await sleep(waitOrderTime)
    }
  } while (!isFinished && new Date().getTime() < beginTime + dowhileTimeout)
  setExhange(pageExchange, global.symbols, runExchangeEpoch)
  setBalance(pageProperty, pageExchange, global.symbols, runBalanceEpoch)
  setRevoke(pageProperty, pageExchange, global.symbols, pageMandatory)
}

async function setExhange (pageExchange, runExchangeEpoch) {
  debug('setExhange is called')
  global.runExchangeIntervalIndex = await setInterval(async () => {
    await runExchange(pageExchange, global.symbols)
  }, runExchangeEpoch)
}

async function setBalance (pageProperty, pageExchange, runBalanceEpoch) {
  debug('setBalance is called')
  await clearInterval(global.runExchangeIntervalIndex)
  global.runBanlanceIntervalIndex = await setInterval(async () => {
    let propertyObj = await runProperty(pageProperty)
    isFinished = await checkAllOder(propertyObj, checkTimeout)
    if (isFinished) {
      await runBalance(pageExchange)
    }
  }, runBalanceEpoch)
  setExhange(pageExchange, global.symbols, runExchangeEpoch)
}

async function setRevoke (pageProperty, pageExchange, pageMandatory) {
  debug('setRevoke is called')
  await clearInterval(global.runExchangeIntervalIndex)
  global.runRevokeIntervalIndex = await setInterval(async () => {
    let propertyObj = await runProperty(pageProperty)
    isFinished = await checkAllOder(propertyObj, checkTimeout)
    if (!isFinished) {
      await runRevoke(pageMandatory)
    }
  }, runRevokeEpoch)
  setExhange(pageExchange, global.symbols, runExchangeEpoch)
}
