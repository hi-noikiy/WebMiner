'use strict'

const debug = require('debug')('core:index')

const path = require('path')

debug('index.js is loading...')
require(path.join(__dirname, './script/coinpark.default.js'))
// require(path.join(__dirname, '../script/coinpark.arbitrage.js'))
// require()
