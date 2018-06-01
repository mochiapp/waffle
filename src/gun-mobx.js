const Gun = require('gun')
require('gun/sea')
// require('gun/lib/time')
const { extendObservable } = require('mobx')

class GunStore {
  subscriptions = []

  /*
  --------------------------------------------------------------------------
  */

  constructor (options) {
    this.gun = options.gun || Gun(options.peers)
    this.user = options.user || this.gun.user()
  }

  /*
  --------------------------------------------------------------------------
  */

  setSubStore (name, subStore) {
    extendObservable(this, {
      [name]: subStore
    })
  }

  /*
  --------------------------------------------------------------------------
  */

  getUserNode (gunPath) {
    return this.user.get(gunPath)
  }

  /*
  --------------------------------------------------------------------------
  */

  getUserNodeByPub (pub) {
    return this.gun.user(pub)
  }

  /*
  --------------------------------------------------------------------------
  */

  getGunUserByPub (pub, pdat) {
    this.getUserNodeByPub(pub).then(dat => {
      let fn = pdat.fn
      let data = dat
      if (typeof dat === 'object' && dat !== null) {
        data = {...dat}
      }
      fn({data, ky: data && data.pub, pdat})
    })
  }

  /*
  --------------------------------------------------------------------------
  */

  subscribeData (node, subscribeKey, options) {
    if (this.subscriptions.indexOf(subscribeKey) < 0) {
      this.subscriptions.push(subscribeKey)

      node.map().on(function (dat, ky) {
        let data = dat
        if (typeof dat === 'object' && dat !== null) {
          data = {...dat}
          if (options.addmeta) {
            data['_'] = {...data['_'], ...{meta: options.addmeta}}
          }
        }
        options.fn && options.fn({data, ky, options})
      })
    }
  }

  /*
  --------------------------------------------------------------------------
  */

  addToSet (node, obj) {
    node.set(obj)
  }

  /*
  --------------------------------------------------------------------------
  */

  upsertArray (arr, data) {
    var ix = arr.findIndex(obj => obj['_']['#'] === data['_']['#'])
    if (ix < 0) {
      arr.push(data)
    } else {
      arr[ix] = {...arr[ix], ...data}
    }
  }

  /*
  --------------------------------------------------------------------------
  */

  register (alias, pass) {
    let that = this
    return new Promise(function (resolve, reject) {
      that.user.create(alias, pass, function (ack) {
        if (ack.err) {
          reject(ack.err)
        }
        if (ack.pub) {
          resolve({pub: ack.pub, ack})
        }
      })
    })
  }

  /*
  --------------------------------------------------------------------------
  */

  login (alias, pass) {
    let that = this
    return new Promise(function (resolve, reject) {
      that.user.auth(alias, pass, function (ack) {
        that.user.recall({sessionStorage: true}) // Todo This should not be needed.
        if (ack.err) {
          reject(ack.err)
        }
        if (ack.pub) {
          resolve({pub: ack.pub, ack})
        }
      })
    })
  }

  /*
  --------------------------------------------------------------------------
  */

  logout () {
    let that = this
    return new Promise(function (resolve, reject) {
      window.sessionStorage.removeItem('alias') // Todo This should not be needed.
      window.sessionStorage.removeItem('tmp')
      that.user.leave(function (ack) { // Todo This has no callback?
        resolve()
      }).then(() => {
        resolve()
      }) // todo Catch fail?
    })
  }

  /*
  --------------------------------------------------------------------------
  */

  checkSession () {
    let that = this
    return new Promise(function (resolve, reject) {
      that.login(window.sessionStorage.alias, window.sessionStorage.tmp).then(function (props) { // Todo This should be changed to NOT use sessionStorage.
      // user.recall(12 * 60) .then(function (props) {
      // user.recall({sessionStorage:true}).then(function (props) {
        // const { ok, err = ''} = props
        const {err = ''} = props
        if (err) {
          reject(err)
        } else if (props.pub) {
          resolve({pub: props.pub, alias: props.ack.alias, props})
        }
      })
    })
  }
}

module.exports = GunStore
