/**
 * @name ABCC-Default
 * @desc  signup and auto trading for abcc init mining
 */
'use strict'

const debug = require('debug')('core:script:abcc')
const puppeteer = require('puppeteer')
const math = require('mathjs')

const viewWidth = 1024
const viewHeight = 768

const loginURL = 'https://abcc.com/signin'
const loginUsernameSelector = '#form > div.input-wrap > div:nth-child(3) > input[type="email"]'
const loginPasswordSelector = '#form > div.input-wrap > div:nth-child(4) > input[type="password"]'
const loginButtonSelector = '#submit > button'
const loginConfirmSelector = 'body > div.profile-page > div.content-section > div.content_menu > div > div > div.new-tabs-item.active'

// const exchangeURL = 'https://abcc.com/markets/'
const exchangeMarketSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.tab-title > div > div:nth-child(2) > span'
const exhangeMarketBuyNumSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form-market > div:nth-child(1) > div.input-label.input-item.input-total > input'
const exchangeMaketSellNumSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form-market > div:nth-child(2) > div.input-label.input-item.input-total > input'
const exchangeMarketBuyButtonSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form-market > div:nth-child(1) > button'
const exchangeMarketSellButtonSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form-market > div:nth-child(2) > button'
const exchangeMarketBuyErroSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form-market > div:nth-child(1) > div.input-label.input-item.input-total > span.error.label'
const exchangeMarketSellErroSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form-market > div:nth-child(2) > div.input-label.input-item.input-total > span.error.label'

const exchangeLimitSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.tab-title > div > div:nth-child(1) > span'
const exchangePriceSelector = 'body > div.exchange-page.body > div.content > div.item.left > div > div.depth-table-ct > div > div > p > span:nth-child(1)'
const exchangeAskSelector = 'body > div.exchange-page.body > div.content > div.item.left > div > div.depth-table-ct > div > table:nth-child(1) > tbody' // sell
const exchangeBitSelector = 'body > div.exchange-page.body > div.content > div.item.left > div > div.depth-table-ct > div > table:nth-child(3) > tbody' // buy
const exchangeBuyPriceSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form > div:nth-child(1) > div:nth-child(2) > input'
const exchangeBuyNumSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form > div:nth-child(1) > div.input-label.input-item.input-amout > input'
const exchangeBuyButtonSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form > div:nth-child(1) > button'
const exchangeBuyErroSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form > div:nth-child(1) > div.input-label.input-item.input-amout > span.error.label'
const exchangeSellPriceSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form > div:nth-child(2) > div:nth-child(2) > input'
const exchangeSellNumSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form > div:nth-child(2) > div.input-label.input-item.input-amout > input'
const exchangeSellButtonSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form > div:nth-child(2) > button > span'
const exchangeSellErroSelector = 'body > div.exchange-page.body > div.content > div.item.center > div.center-bottom > div.order-submit.order-form > div:nth-child(2) > div.input-label.input-item.input-amout > span.error.label'

const revokeURL = 'https://abcc.com/history/orders/#/open-orders'
const revokeButtonSelector = 'body > div.order-page > div.content-section.clearfix > div.history-order_page > div > table > thead > tr > th:nth-child(10) > div > span > span'
const revokeButtonConfirmSelector = '.btn.ok'

const propertyURL = 'https://abcc.com/funds#/'

function sleep (millis, log) {
  console.log('sleep is called')
  log('刷币暂停，正在等待...')
  return new Promise((resolve) => setTimeout(resolve, millis))
}

async function init () {
  debug('init function is called')
  // const browser = await puppeteer.launch()
  let browser = await puppeteer.launch({
    headless: false,
    slowMo: 5,
    executablePath: './chrome-win32/chrome.exe',
    args: [
      // '--auto-open-devtools-for-tabs',
      '--disable-infobars'
    ]
  })
  debug('init function is done')
  return browser
}

async function login (browser, username, password) {
  debug('login function is called')
  let pageLogin = await browser.newPage()
  await pageLogin.setViewport({
    width: viewWidth,
    height: viewHeight
  })
  // get login by user first
  try {
    await pageLogin.goto(loginURL, {
      timeout: 5000,
      waitUntil: 'load'
    })
  } catch (err) {
    debug('// WARNING: login page load timeout')
  }
  await pageLogin.waitForSelector(loginButtonSelector, {
    timeout: 0
  })
  try {
    await pageLogin.type(loginUsernameSelector, username)
    await pageLogin.type(loginPasswordSelector, password)
    await pageLogin.click(loginButtonSelector)
  } catch (err) {
    debug('// WARNING: type in login page failed')
  }
  await pageLogin.waitForSelector(loginConfirmSelector, {
    timeout: 0
  })
  debug('login function is done')
  return pageLogin
}

async function beforeExchange (browser, exchangeURL) {
  debug('beforeExchange function is called')
  // before auto trade
  const pageProperty = await browser.newPage()
  await pageProperty.setViewport({
    width: viewWidth,
    height: viewHeight
  })
  try {
    await pageProperty.goto(propertyURL, {
      timeout: 3000,
      waitUntil: 'load'
    })
  } catch (err) {
    debug('// WARNING: property page load timeout')
  }

  const pageRevoke = await browser.newPage()
  await pageRevoke.setViewport({
    width: viewWidth,
    height: viewHeight
  })
  try {
    await pageRevoke.goto(revokeURL, {
      timeout: 3000,
      waitUntil: 'load'
    })
  } catch (err) {
    debug('// WARNING: revoke page load timeout')
  }

  const pageExchange = await browser.newPage()
  await pageExchange.setViewport({
    width: viewWidth,
    height: viewHeight
  })
  try {
    await pageExchange.goto(exchangeURL, {
      timeout: 3000,
      waitUntil: 'load'
    })
  } catch (err) {
    debug('// WARNING: exchange page load timeout')
  }

  // return
  await pageExchange.waitForSelector(exchangeMarketSelector, {
    timeout: 0
  })
  debug('beforeExchange function is done')
  return {
    pageExchange: pageExchange,
    pageProperty: pageProperty,
    pageRevoke: pageRevoke
  }
}

async function runExchange (pageExchange, runPrice, runNum, runEpoch, log) {
  debug('runExchange function is called')
  let elementHandle
  let elementHandle1
  let typePrice
  let typeNum
  let candy
  if (runPrice <= 1) { // 市价买卖
    debug('市价买卖')
    await log('正在按照市价模式买卖...')
    await log('当前交易数量：' + runNum.toString())
    await pageExchange.click(exchangeMarketSelector)
    await pageExchange.waitForSelector(exhangeMarketBuyNumSelector, {
      timeout: 0
    })
    try {
      candy = 0
      do {
        candy = candy + 1
        elementHandle = await pageExchange.$(exhangeMarketBuyNumSelector)
        await elementHandle.click()
        await elementHandle.focus()
        // click three times to select all
        await elementHandle.click({
          clickCount: 3
        })
        await elementHandle.press('Backspace')
        await elementHandle.type(runNum.toString())
        typeNum = await pageExchange.$(exhangeMarketBuyNumSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
          debug('current sell input value:' + value)
          return parseFloat(value)
        })
      } while (runNum !== typeNum && candy < 10)
      if (runNum === typeNum) {
        await pageExchange.click(exchangeMarketBuyButtonSelector)
        await pageExchange.waitFor(1000 * runEpoch)
      } else {
        throw Error('当前交易买入数量写入错误')
      }
      try {
        let isOK = await pageExchange.$(exchangeMarketBuyErroSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('textContent')).jsonValue()
          debug('current sell input value:' + value)
          return value === '持仓不足' ? 0 : 1
        })
        debug('isOK is: ' + isOK)
        if (isOK > 0) {
          await log('当前交易买进成功')
        } else {
          throw Error('持仓不足')
        }
      } catch (err) {
        debug('未获取到交易状态')
      // throw Error('未获取到交易状态')
      }
      debug('runExchange market buy succeed')
    } catch (err) {
      debug('// WARNING: runExchange market buy failed')
      await log('当前交易买进失败: ' + err, true)
    }

    try {
      candy = 0
      do {
        candy = candy + 1
        elementHandle = await pageExchange.$(exchangeMaketSellNumSelector)
        await elementHandle.click()
        await elementHandle.focus()
      // click three times to select all
        await elementHandle.click({
          clickCount: 3
        })
        await elementHandle.press('Backspace')
        await elementHandle.type(runNum.toString())
        typeNum = await pageExchange.$(exchangeMaketSellNumSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
          debug('current sell input value:' + value)
          return parseFloat(value)
        })
      } while (runNum !== typeNum && candy < 10)

      if (runNum === typeNum) {
        await pageExchange.click(exchangeMarketSellButtonSelector)
        await pageExchange.waitFor(1000 * runEpoch)
      } else {
        throw Error('当前交易卖出数量写入错误')
      }
      try {
        let isOK = await pageExchange.$(exchangeMarketSellErroSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('textContent')).jsonValue()
          debug('current sell input value:' + value)
          return value === '持仓不足' ? 0 : 1
        })
        debug('isOK is: ' + isOK)
        if (isOK > 0) {
          await log('当前交易卖出成功')
        } else {
          throw Error('持仓不足')
        }
      } catch (err) {
        debug('未获取到交易状态')
// throw Error('未获取到交易状态')
      }
      debug('runExchange market sell succeed')
    } catch (err) {
      debug('// WARNING: runExchange market sell failed')
      await log('当前交易卖出失败: ' + err, true)
    }
  } else if (runPrice <= 2) { // 限价买卖
    debug('限价买卖')
    await log('正在按照限价模式买卖...')
    await pageExchange.click(exchangeLimitSelector)
    await pageExchange.waitForSelector(exchangeBuyNumSelector, {
      timeout: 0
    })
    let nowPrice = await pageExchange.$eval(exchangePriceSelector, (heading) => {
      return parseFloat(heading.textContent)
    })
    debug('nowPrice: ' + nowPrice) // should be num
    await log('当前交易价格：' + nowPrice)
    await log('当前交易数量：' + runNum.toString())
    try {
      candy = 0
      do {
        candy = candy + 1
        elementHandle = await pageExchange.$(exchangeBuyPriceSelector)
        await elementHandle.click()
        await elementHandle.focus()
      // click three times to select all
        await elementHandle.click({
          clickCount: 3
        })
        await elementHandle.press('Backspace')
        elementHandle1 = await pageExchange.$(exchangeBuyNumSelector)
        await elementHandle1.click()
        await elementHandle1.focus()
      // click three times to select all
        await elementHandle1.click({
          clickCount: 3
        })
        await elementHandle1.press('Backspace')
        await elementHandle.type(nowPrice.toString())
        await elementHandle1.type(runNum.toString())
        typePrice = await pageExchange.$(exchangeBuyPriceSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
          debug('current sell input value:' + value)
          return parseFloat(value)
        })
        typeNum = await pageExchange.$(exchangeBuyNumSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
          debug('current sell input value:' + value)
          return parseFloat(value)
        })
      } while ((nowPrice !== typePrice || runNum !== typeNum) && candy < 10)
      if (nowPrice === typePrice && runNum === typeNum) {
        await pageExchange.click(exchangeBuyButtonSelector)
        await pageExchange.waitFor(1000 * runEpoch)
      } else {
        throw Error('当前交易买入价格或数量写入错误')
      }
      try {
        let isOK = await pageExchange.$(exchangeBuyErroSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('textContent')).jsonValue()
          debug('current sell input value:' + value)
          return value === '持仓不足' ? 0 : 1
        })
        debug('isOK is: ' + isOK)
        if (isOK > 0) {
          await log('当前交易买进成功')
        } else {
          throw Error('持仓不足')
        }
      } catch (err) {
        debug('未获取到交易状态')
// throw Error('未获取到交易状态')
      }
      debug('runExchange limit buy succeed')
    } catch (err) {
      debug('// WARNING: runExchange limit buy failed')
      await log('当前交易买进失败: ' + err, true)
    }
    try {
      candy = 0
      do {
        candy = candy + 1
        elementHandle = await pageExchange.$(exchangeSellPriceSelector)
        await elementHandle.click()
        await elementHandle.focus()
      // click three times to select all
        await elementHandle.click({
          clickCount: 3
        })
        await elementHandle.press('Backspace')
        elementHandle1 = await pageExchange.$(exchangeSellNumSelector)
        await elementHandle1.click()
        await elementHandle1.focus()
      // click three times to select all
        await elementHandle1.click({
          clickCount: 3
        })
        await elementHandle1.press('Backspace')
        await elementHandle.type(nowPrice.toString())
        await elementHandle1.type(runNum.toString())
        typePrice = await pageExchange.$(exchangeSellPriceSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
          debug('current sell input value:' + value)
          return parseFloat(value)
        })
        typeNum = await pageExchange.$(exchangeSellNumSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
          debug('current sell input value:' + value)
          return parseFloat(value)
        })
      } while ((nowPrice !== typePrice || runNum !== typeNum) && candy < 10)
      if (nowPrice === typePrice && runNum === typeNum) {
        await pageExchange.click(exchangeSellButtonSelector)
        await pageExchange.waitFor(1000 * runEpoch)
      } else {
        throw Error('当前交易卖出价格或数量写入错误')
      }
      try {
        let isOK = await pageExchange.$(exchangeSellErroSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('textContent')).jsonValue()
          debug('current sell input value:' + value)
          return value === '持仓不足' ? 0 : 1
        })
        debug('isOK is: ' + isOK)
        if (isOK > 0) {
          await log('当前交易卖出成功')
        } else {
          throw Error('持仓不足')
        }
      } catch (err) {
        debug('未获取到交易状态')
// throw Error('未获取到交易状态')
      }
      debug('runExchange limit sell succeed')
    } catch (err) {
      debug('// WARNING: runExchange limit sell failed')
      await log('当前交易卖出失败: ' + err, true)
    }
  } else { // 限价买卖 买一卖一
    debug('限价买卖')
    await log('正在按照限价模式买卖...')
    await pageExchange.click(exchangeLimitSelector)
    await pageExchange.waitForSelector(exchangeBuyNumSelector, {
      timeout: 0
    })
    let iPrice = runPrice - 3
    try {
      let priceBoxHandle = await pageExchange.$eval(exchangeAskSelector, (heading) => {
        return heading.textContent
      }).then((value) => {
        debug(value)
        return value.split(' ')
      })
      debug('priceBoxHandle ( type: ' + typeof (priceBoxHandle) + '，length: ' + priceBoxHandle.length + ' ) value: \n' + priceBoxHandle)
      let boxLength = math.floor((priceBoxHandle.length - 1) / 3)
      let boxPrice = []
      let boxNum = []
      let boxMonny = []
      for (let i = 0; i < boxLength; i++) {
        boxPrice[boxLength - 1 - i] = parseFloat(priceBoxHandle[i * 3]) > 0 ? parseFloat(priceBoxHandle[i * 3]) : 0
        boxNum[boxLength - 1 - i] = parseFloat(priceBoxHandle[i * 3 + 1]) > 0 ? parseFloat(priceBoxHandle[i * 3 + 1]) : 0
        boxMonny[boxLength - 1 - i] = parseFloat(priceBoxHandle[i * 3 + 2]) > 0 ? parseFloat(priceBoxHandle[i * 3 + 2]) : 0
      }
      await log('当前交易价格：' + boxPrice[iPrice])
      await log('当前交易数量：' + runNum.toString())
      candy = 0
      do {
        candy = candy + 1
        elementHandle = await pageExchange.$(exchangeBuyPriceSelector)
        await elementHandle.click()
        await elementHandle.focus()
      // click three times to select all
        await elementHandle.click({
          clickCount: 3
        })
        await elementHandle.press('Backspace')
        elementHandle1 = await pageExchange.$(exchangeBuyNumSelector)
        await elementHandle1.click()
        await elementHandle1.focus()
      // click three times to select all
        await elementHandle1.click({
          clickCount: 3
        })
        await elementHandle1.press('Backspace')
        await elementHandle.type(boxPrice[iPrice].toString())
        await elementHandle1.type(runNum.toString())
        typePrice = await pageExchange.$(exchangeBuyPriceSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
          debug('current sell input value:' + value)
          return parseFloat(value)
        })
        typeNum = await pageExchange.$(exchangeBuyNumSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
          debug('current sell input value:' + value)
          return parseFloat(value)
        })
      } while ((boxPrice[iPrice] !== typePrice || runNum !== typeNum) && candy < 10)
      if (boxPrice[iPrice] === typePrice && runNum === typeNum) {
        await pageExchange.click(exchangeBuyButtonSelector)
        await pageExchange.waitFor(1000 * runEpoch)
      } else {
        throw Error('当前交易买入价格或数量写入错误')
      }
      try {
        let isOK = await pageExchange.$(exchangeBuyErroSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('textContent')).jsonValue()
          debug('current sell input value:' + value)
          return value === '持仓不足' ? 0 : 1
        })
        debug('isOK is: ' + isOK)
        if (isOK > 0) {
          await log('当前交易买进成功')
        } else {
          throw Error('持仓不足')
        }
      } catch (err) {
        debug('未获取到交易状态')
// throw Error('未获取到交易状态')
      }
      debug('runExchange limit buy succeed')
    } catch (err) {
      debug('// WARNING: runExchange limit buy failed')
      await log('当前交易买进失败', true)
    }
    try {
      let priceBoxHandle = await pageExchange.$eval(exchangeBitSelector, (heading) => {
        return heading.textContent
      }).then((value) => {
        debug(value)
        return value.split(' ')
      })
      debug('priceBoxHandle ( type: ' + typeof (priceBoxHandle) + '，length: ' + priceBoxHandle.length + ' ) value: \n' + priceBoxHandle)
      let boxLength = math.floor((priceBoxHandle.length - 1) / 3)
      let boxPrice = []
      let boxNum = []
      let boxMonny = []
      for (let i = 0; i < boxLength; i++) {
        boxPrice[i] = parseFloat(priceBoxHandle[i * 3]) > 0 ? parseFloat(priceBoxHandle[i * 3]) : 0
        boxNum[i] = parseFloat(priceBoxHandle[i * 3 + 1]) > 0 ? parseFloat(priceBoxHandle[i * 3 + 1]) : 0
        boxMonny[i] = parseFloat(priceBoxHandle[i * 3 + 2]) > 0 ? parseFloat(priceBoxHandle[i * 3 + 2]) : 0
      }
      await log('当前交易价格：' + boxPrice[iPrice])
      await log('当前交易数量：' + runNum.toString())
      candy = 0
      do {
        candy = candy + 1
        elementHandle = await pageExchange.$(exchangeSellPriceSelector)
        await elementHandle.click()
        await elementHandle.focus()
      // click three times to select all
        await elementHandle.click({
          clickCount: 3
        })
        await elementHandle.press('Backspace')
        elementHandle1 = await pageExchange.$(exchangeSellNumSelector)
        await elementHandle1.click()
        await elementHandle1.focus()
      // click three times to select all
        await elementHandle1.click({
          clickCount: 3
        })
        await elementHandle1.press('Backspace')
        await elementHandle.type(boxPrice[iPrice].toString())
        await elementHandle1.type(runNum.toString())
        typePrice = await pageExchange.$(exchangeSellPriceSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
        // debug('current sell input value:' + value)
          return parseFloat(value)
        })
        typeNum = await pageExchange.$(exchangeSellNumSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('value')).jsonValue()
        // debug('current sell input value:' + value)
          return parseFloat(value)
        })
      } while ((boxPrice[iPrice] !== typePrice || runNum !== typeNum) && candy < 10)
      if (boxPrice[iPrice] === typePrice && runNum === typeNum) {
        await pageExchange.click(exchangeSellButtonSelector)
        await pageExchange.waitFor(1000 * runEpoch)
      } else {
        throw Error('当前交易卖出价格或数量写入错误')
      }
      try {
        let isOK = await pageExchange.$(exchangeSellErroSelector).then(async (ElementHandle) => {
          let value = await (await ElementHandle.getProperty('textContent')).jsonValue()
          debug('current sell input value:' + value)
          return value === '持仓不足' ? 0 : 1
        })
        debug('isOK is: ' + isOK)
        if (isOK > 0) {
          await log('当前交易卖出成功')
        } else {
          throw Error('持仓不足')
        }
      } catch (err) {
        debug('未获取到交易状态')
// throw Error('未获取到交易状态')
      }
      debug('runExchange limit sell succeed')
    } catch (err) {
      debug('// WARNING: runExchange limit sell failed')
      await log('当前交易卖出失败: ' + err, true)
    }
  }
  debug('runExchange function is done')
  await log('当前交易结束')
}

async function runRevoke (pageRevoke, log) {
  debug('runRevoke function is called')
  await log('正在执行撤单程序...')
  try {
    // need balance after a while
    await pageRevoke.reload({
      timeout: 3000
    })
    // waiting for box data is loading
    await pageRevoke.waitForSelector(revokeButtonSelector, {
      timeout: 3000
    })
    await pageRevoke.click(revokeButtonSelector)
    debug('revoke button click succeed')
    await pageRevoke.waitForSelector(revokeButtonConfirmSelector, {
      timeout: 3000
    })
    await pageRevoke.click(revokeButtonConfirmSelector)
    debug('revoke confirm button click succeed')
    await log('撤单程序执行成功')
  } catch (err) {
    debug('// WARNING: revoke button click error')
    await log('撤单程序执行失败', true)
  }
  debug('runRevoke function is done')
  await log('撤单程序执行结束')
}

module.exports.init = init
module.exports.login = login
module.exports.beforeExchange = beforeExchange
module.exports.runExchange = runExchange
module.exports.runRevoke = runRevoke
module.exports.sleep = sleep
