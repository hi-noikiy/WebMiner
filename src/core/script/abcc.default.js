/**
 * @name ABCC-Default
 * @desc  signup and auto trading for abcc init mining
 */
'use strict'

const debug = require('debug')('core:script:abcc')
const puppeteer = require('puppeteer')
const path = require('path')
const CoreUtils = require(path.join(__dirname, '../utils.js'))
const config = require(path.join(__dirname, '../config.js'))
const abcc = new CoreUtils(config.abcc)
const math = require('mathjs')
const argvName = (process.argv.indexOf('--username') >= 0)
const argvPassword = (process.argv.indexOf('--password') >= 0)

const username = argvName > 0 ? process.argv[process.argv.indexOf('--username') + 1] : abcc.getUsername()
const password = argvPassword > 0 ? process.argv[process.argv.indexOf('--password') + 1] : abcc.getPassword()

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
  await pageLogin.goto('https://abcc.com/login', {
    timeout: 0,
    waitUntil: 'networkidle0'
  })
  try {
    await pageLogin.click('')
  } catch (err) {
    debug('// WARNING: login first confirm button is gone...')
    // throw (err)
  }
}

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


module.exports.resetIndex = resetIndex
module.exports.runIndex = runIndex
module.exports.stopIndex = stopIndex