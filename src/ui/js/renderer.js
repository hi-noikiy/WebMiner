// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
'use strict'

// const debug = require('debug')('ui:renderer')
const path = require('path')
const Utils = require(path.join(__dirname, 'js/utils.js'))

function login () {
  let ut = new Utils()
  ut.login()
}

function signup () {
  let ut = new Utils()
  ut.signup()
}

function getSignup () {
  let ut = new Utils()
  ut.getSignup()
}

function updateSeries () {
  let ut = new Utils()
  ut.updateSeries()
}

function pwdrVerify () {
  let ut = new Utils()
  ut.pwdrVerify()
}

function runIndex () {
  let ut = new Utils()
  ut.runIndex()
}

function stopIndex () {
  let ut = new Utils()
  ut.stopIndex()
}

function updateIndex () {
  let ut = new Utils()
  ut.updateIndex()
}

function resetIndex () {
  let ut = new Utils()
  ut.resetIndex()
}

module.exports.login = login
module.exports.signup = signup
module.exports.getSignup = getSignup
module.exports.updateSeries = updateSeries
module.exports.pwdrVerify = pwdrVerify
module.exports.updateIndex = updateIndex
module.exports.resetIndex = resetIndex
module.exports.runIndex = runIndex
module.exports.stopIndex = stopIndex
