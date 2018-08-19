/**
 * @name ABCC-Arbitrage
 * @desc  signup and auto trading for abcc arbitrage trading
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

const exchangeURL = 'https://abcc.com/markets/'
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
  debug('sleep is called')
  log('刷币暂停，正在等待...')
  return new Promise((resolve) => setTimeout(resolve, millis))
}

async function init () {
  debug('init function is called')
  let browser = await puppeteer.launch({
    headless: false,
    slowMo: 5,
    // executablePath: './chrome-win32/chrome.exe',
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
