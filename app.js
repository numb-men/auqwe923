//app.js
App({
  onLaunch: function () {
    this.globalData.urls = require('/config') //载入接口
    this.get_screen_size()
    this.update_token(null, null, null, this.get_user_info)
  },

  login: function (url_, data_, that_, callback_) {
    console.log('login')
    var app = this
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        console.log('res', res)
        if (res.code) {
          var code = -1
          var msg = ''
          var url = app.globalData.urls['login']
          var data = { code: res.code }
          wx.request({
            url: url,
            dataType: 'JSON',
            method: 'POST',
            data: data,
            // header: {
            //   'content-type': 'application/x-www-form-urlencoded', // 默认值
            // },

            success: res => {
              //解析服务器返回的数据，获取状态码
              var json = JSON.parse(res.data)
              code = json.code
              msg = json.msg
              console.log(url, code, msg, json)
              //如果无误，获取服务器返回的数据
              if (code == 200) {
                app.globalData.token = json.data.token
                app.globalData.user = json.data.user
                console.log('token', app.globalData.token)
                if (typeof callback_ == 'function' && url_) {
                  // 执行逻辑:访问
                  app.request_(url_, data_, that_, callback_)
                } else if (typeof callback_ == 'function') {
                  // 非访问
                  callback_()
                }
              } else {
                app.show_fail(code, msg)
              }
            },
            error: res => {
              app.show_fail(code)
            }
          })
        } else {
          console.log('login-fail')
        }
      }
    })
  },

  show_fail: function(code, msg){
    if (code == -1){
      console.log("服务器错误")
    } else{
      console.log(code, msg)
    }
  },

  //校验状态码是否已经过期|是否拥有， 并对校验码自动进行更新，同时执行操作（可选）
  update_token: function (url, data, that, callback, method) {
      var app = this
      if (app.globalData.token) {
        // 检测
        wx.checkSession({
          success: res => {
            console.log('update-session-in-use')
            if (typeof callback == 'function') {
              // 执行逻辑
              app.request_(url, data, that, callback, method)
            }
          },

          fail: res => {
            //登录码过期，再次登录
            console.log('update-session-overdue')
            app.login(url, data, that, callback)
          }
        })
      }
      else {
        // app加载的初次登录
        console.log('update-session-no-session')
        app.login(url, data, that, callback)
      }
  },

  //request_封装update_token
  //that: this引用
  //url: 访问的url（string）
  //data:发送的数据
  //callback(that, json, code): 操作的函数
  get_request(url, data, that, callback) {
    this.update_token(url, data, that, callback, 'GET')  //先验证登录凭证是否过期
  },
  post_request(url, data, that, callback) {
    this.update_token(url, data, that, callback, 'POST')  //先验证登录凭证是否过期
  },

  //一个通用的执行访问服务器post数据之后再执行相关操作的函数，支持setData等事件
  request_: function (url, data, that, callback, method) {
    wx.showLoading({
      title: '加载中',
      mask: true,
    })
    var app = this
    var code = -1  //code=-1为fail
    var header = {}
    console.log(url, data, that, callback)
    if (app.globalData.token) {
      header.token = app.globalData.token //token为登录凭证
    } else {
      console.log('Not token!')
    }
    wx.request({
      url: app.globalData.urls[url],
      header: header,
      data: data,
      dataType: 'JSON',
      method: method,

      success: res => {
        //解析服务器返回的数据，获取状态码
        console.log(res)
        var json = JSON.parse(res.data)
        code = json.code
        console.log(app.globalData.urls[url], code)
        //如果无误，获取服务器返回的数据
        if (code == 200) {
          console.log(app.globalData.urls[url], 'json', json)
          if (typeof callback == 'function') {
            if (that) {
              callback(that, code, json) //执行业务逻辑
            } else {
               console.log('Not that!')
            }
          } else {
             console.log('Not function!')
          }
        }
      },

      fail: res => {
        console.log('request to ', url, ' fail')
      },

      complete: res => {
        wx.hideLoading()
      }
    })
  },

  get_user_info: function() {
    var app = this
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          console.log("已经授权-获取信息")
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              app.save_user_info(res.userInfo)

              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        } else {
          console.log("未授权-获取信息")
        }
      }
    })
  },

  //在每次登陆的时候都保存一下userInfo，防止用户更换头像、昵称
  save_user_info: function (userInfo) {
    if (userInfo) {
      this.globalData.userInfo = userInfo
      console.log(userInfo)
      var url = 'save_user',
          data = {
            id: this.globalData.user.id,
            wxName: userInfo.nickName
          },
          that = this

      // data.user = userInfo
      that.post_request(url, data, that, function() {})
    }
  },

  //获取屏幕长宽
  get_screen_size: function(){
    var that = this
    wx.getSystemInfo({
      success(res) {
        that.globalData.screenWidth = res.screenWidth
        that.globalData.screenHeight = res.screenHeight
        that.globalData.rpx_to_px = res.screenWidth / 750
      }
    })
    //console.log(this.globalData.rpx_to_px)
  },

  globalData: {
    userInfo: null
  },
})