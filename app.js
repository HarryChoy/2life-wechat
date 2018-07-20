//app.js
const Towxml = require('/towxml/main')
const config = require('/config.js')
const hamcsha1 = require('/utils/hmacsha1/index.js')
const base64 = require('/utils/base64/base64.js').Base64

App({
  data: {
    domain: 'https://2life.api.ursb.me/',
    user: {},
    key: {},
    partner: {},
    notes: [],
    savedNote: {},
    location: {
      location: []
    },
    locationKey: config.locationKey,
    weatherKey: config.weatherKey,
    qiniu: config.qiniu,
    weather: {},
    showMatch: false,
    publish: true,
    shareMenu: {
      title: '遇见另一半的美好~',
      path: '/Pages/Home/Home/Home',
      imageUrl: '/Images/cover.png'
    },
    weatherSavedTime: 3600000,
    ld: -1
  },

  lodash: {
    groupBy: require('./utils/lodash.groupby/index.js'),
    orderBy: require('./utils/lodash.orderby/index.js'),
    find: require('./utils/lodash.find/index.js'),
    filter: require('./utils/lodash.filter/index.js'),
    forEach: require('./utils/lodash.foreach/index.js')
  },

  towxml: new Towxml(),

  qiniu: {
    upload: require('./utils/qiniuUploader.js')
  },

  getInputValue: function (event) {
    let type = event.currentTarget.dataset.type
    let temp = {}
    temp[type] = event.detail.value
    return temp
  },

  getInputValid: function(event) {
    let type = event.currentTarget.dataset.type
    let temp = {}
    temp[type] = event.detail.value
    temp[type + 'Valid'] = true
    temp[type + 'Warning'] = ''
    return temp
  },

  login: function (obj) {
    let _this = this
    return new Promise((resolve, reject) => {
      wx.request({
        url: _this.data.domain + 'users/login',
        method: 'POST',
        data: {
          account: obj.account,
          password: obj.password
        },
        success: function (res) {
          let data = res.data.data
          let code = res.data.code
          if (code === 0) {
            _this.data.key = data.key
            _this.data.user = data.user
            _this.data.partner = data.partner
            resolve({
              key: data.key,
              user: data.user,
              partner: data.partner
            })
          } else {
            reject(code)
          }
        },
        fail: function (err) {
          console.log(err)
          reject(err)
        },
        complete: function () {
          wx.hideLoading()
        }
      })
    })
  },

  wxLogin: function (agree) {
    let _this = this
    let ld = wx.getStorageSync('ld')
    return new Promise((resolve, reject) => {
      if (ld || agree) {
        let handle = function () {
          wx.getUserInfo({
            success: function (userInfo) {
              wx.login({
                success: function (res) {
                  if (res.code) {
                    wx.request({
                      url: _this.data.domain + 'users/wxp_login',
                      method: 'POST',
                      data: {
                        code: res.code,
                        userInfo: userInfo.userInfo
                      },
                      success: function (response) {
                        console.log(response)
                        if (response.data.code === 0) {
                          let data = response.data.data
                          _this.data.user = data.user
                          _this.data.partner = data.partner
                          _this.data.key = data.key
                          _this.data.showMatch = response.data.is_checking
                          wx.setStorage({
                            key: 'ld',
                            data: data.key.uid,
                          })
                          _this.data.ld = data.key.uid
                          if (data.partner.id) {
                            _this.getLocation({
                              longitude: res.partner.longitude,
                              latitude: res.partner.latitude
                            }).then(data => {
                              _this.getWeather(location, 'partnerWeather')
                            })
                          }
                          wx.getLocation({
                            success: function (location) {
                              _this.getLocation(location).then(data => {
                                _this.getWeather(data, 'userWeather')
                                _this.data.location = data
                              })
                            },
                            fail: function (err) {
                              let location = {
                                longitude: data.user.longitude,
                                latitude: data.user.latitude
                              }
                              _this.getLocation(location).then(data => {
                                _this.getWeather(data, 'userWeather')
                                _this.data.location = data
                              })
                            }
                          })
                          resolve(data)
                        } else {
                          reject(response.data.code)
                        }
                      },
                      fail: function (err) {
                        console.log(err)
                        reject(false)
                      }
                    })
                  }
                }
              })
            }
          })
        }
        if (ld) {
          wx.request({
            url: _this.data.domain + 'users/check_uid',
            data: {
              uid: ld
            },
            success(ldRes) {
              console.log(ldRes)
              if (ldRes.data.code !== 0) return
              handle()
            },
            fail(err) {
              wx.removeStorageSync('ld')
            }
          })
        }
        if (agree) {
          handle()
        }
      }
    })
  },

  getUser: function() {
    let _this = this
    let data = this.data
    return new Promise((resolve, reject) => {
      wx.request({
        url: data.domain + 'users/user',
        method: 'GET',
        data: {
          uid: data.key.uid,
          timestamp: data.key.timestamp,
          token: data.key.token,
          user_id: data.user.id
        },
        success: function (res) {
          if (res.data.code === 0) {
            _this.data.user = res.data.data
            _this.data.partner = res.data.partner
            resolve({
              user: _this.data.user,
              partner: _this.data.partner
            })
          } else {
            console.log(res.data)
            reject('err')
          }
        },
        fail: function (err) {
          reject(err)
        },
        complete: function () {
          wx.hideLoading()
        }
      })
    })
  },

  getMatchedUser: function (id) {
    let _this = this
    let data = this.data
    return new Promise((resolve, reject) => {
      wx.request({
        url: data.domain + 'users/user',
        method: 'GET',
        data: {
          uid: data.key.uid,
          timestamp: data.key.timestamp,
          token: data.key.token,
          user_id: id
        },
        success: function (res) {
          if (res.data.code === 0) {
            _this.partner = res.data.data.user
            _this.user = res.data.data.partner
            resolve(res.data.data.user)
          } else {
            console.log(res.data)
            reject('err')
          }
        },
        fail: function (err) {
          reject(err)
        },
        complete: function () {
          wx.hideLoading()
        }
      })
    })
  },

  updateUser: function (obj) {
    let _this = this
    let key = this.data.key
    let user = this.data.user
    let temp = {
      uid: key.uid,
      timestamp: key.timestamp,
      token: key.token,
      name: user.name,
      face: user.face,
      sex: user.sex,
      status: user.status,
      latitude: user.latitude || 0,
      longitude: user.longitude || 0,
      badge_id: -1
    }
    for (let key in obj) {
      temp[key] = obj[key]
    }
    console.log(temp)
    return new Promise((resolve, reject) => {
      wx.request({
        url: _this.data.domain + 'users/update',
        method: 'POST',
        data: temp,
        success: function (res) {
          if (res.data.code === 0) {
            resolve(true)
          } else {
            reject('err')
          }
        },
        fail: function (err) {
          console.log(err)
          reject(err)
        },
        complete: function () {
          wx.hideLoading()
        }
      })
    })
  },

  getLocation: function (location) {
    let _this = this
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://restapi.amap.com/v3/geocode/regeo',
        method: 'GET',
        data: {
          key: _this.data.locationKey,
          location: location.longitude + ',' + location.latitude
        },
        success: function (res) {
          if (res.data.status !== '1') return
          let data = res.data.regeocode.addressComponent
          let local = {
            longitude: location.longitude,
            latitude: location.latitude,
            location: [data.city, data.province, data.country],
            adcode: parseInt(data.adcode)
          }
          console.log('location', local)
          resolve(local)
        }
      })
    })
  },

  getWeather: function (location, name) {
    let value = wx.getStorageSync(name)
    let getTime = new Date().getTime()
    if (value && getTime - value.getTime <= this.data.weatherSavedTime) {
      this.data.weather[name] = value
      console.log(value)
      return
    }
    let _this = this
    wx.request({
      url: 'http://restapi.amap.com/v3/weather/weatherInfo',
      method: 'GET',
      data: {
        key: this.data.weatherKey,
        city: location.adcode
      },
      success: function (res) {
        if (res.data.status != '1') return
        let data = res.data.lives[0]
        if (!data) return
        data.getTime = getTime
        console.log(data)
        wx.setStorageSync(name, data)
        _this.data.weather[name] = data
      },
      fail: function (err) {
        console.log(err)
      }
    })
  },

  imageUpload: function (imgList) {
    let token, domain, key
    domain = this.data.domain
    key = this.data.key
    let qiniuUploader = this.qiniu.upload

    let upload = function (token, filename, file) {
      return new Promise((resolve, reject) => {
        qiniuUploader.upload(file, (res) => {
          resolve(res)
        }, (err) => {
          console.log(err)
        }, {
            region: 'ECN',
            domain: 'https://airing.ursb.me',
            key: filename,
            uptoken: token
        })
      })
      
    }

    let getToken = function (filename, file) {
      key.filename = filename
      return new Promise((resolve, reject) => {
        wx.request({
          url: domain + 'utils/qiniu_token',
          method: 'GET',
          data: key,
          success: function (res) {
            if (res.data.code === 0) {
              upload(res.data.data, filename, file).then(data => {
                resolve(data)
              })
            } else {
              console.log(res.data)
            }
          }
        })
      })
    }

    let imgArr = []
    return new Promise((resolve, reject) => {
      for (let i = 0; i < imgList.length; i++) {
        let filename = imgList[i].name
        let file = imgList[i].file
        getToken(filename, file).then(data => {
          imgArr.push(data.imageURL)
          if (imgArr.length === imgList.length) {
            resolve(imgArr)
          }
        })
      }
    })
    
  },

  getOcr (image) {
    let ocr = config.ocr
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.data.domain + 'utils/get_ocr_sign',
        data: {
          uid: this.data.key.uid,
          timestamp: this.data.key.timestamp,
          token: this.data.key.token
        },
        success(res) {
          if (res.data.code !== 0) {{
            reject(res.data.code)
            return
          }}
          wx.request({
            url: 'https://recognition.image.myqcloud.com/ocr/handwriting',
            method: 'POST',
            header: {
              'content-type': 'application/json',
              'authorization': res.data.data
            },
            data: {
              appid: ocr.appid,
              url: image
            },
            success(res) {
              console.log('getOcr')
              if (res.data.code !== 0) {
                reject(res.data)
              } else {
                resolve(res.data.data)
              }
            },
            fail(err) {
              reject(err)
            }
          })
        },
        fail(err) {
          console.log(err)
          reject(err)
        }
      })
    })
  },

  onLaunch: function () {

  }
})