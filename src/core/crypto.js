'use strict'

const debug = require('debug')('core:crypto')
const cry = require('crypto')

class crypto {
  constructor (config) {
    this.config = config
  }

  getconfig () {
    debug(this.config)
    return this.config
  }

  getHash (alg, str) {
    let sha = cry.createHash(alg)
    let hs = sha.update(str).digest('hex')
    return hs
  }

  encrypter (alg, key, str) {
    let cp = cry.createCipher(alg, key)
    let ec = cp.update(str, 'utf8', 'hex')
    ec += cp.final('hex')
    return ec
  }

  decrypter (alg, key, str) {
    let dp = cry.createDecipher(alg, key)
    let dc = dp.update(str, 'hex', 'utf8')
    dc += dp.final('utf8')
    return dc
  }

  signer (alg, priKey, str) {
    let sign = cry.createSign(alg)
    sign.update(str)
    let sig = sign.sign(priKey, 'hex')
    return sig
  }

  verifyer (alg, pubKey, sig, str) {
    let verify = cry.createVerify(alg)
    verify.update(str)
    let vrf = verify.verify(pubKey, sig, 'hex')
    return vrf
  }
}

module.exports = crypto
