const app = getApp()

Page({
  data: {
    reportEnabled: false,
    groupChatEnabled: false
  },

  onLoad() {
    this.checkReportEnabled()
    this.checkGroupChatEnabled()
  },

  onShow() {
    this.checkReportEnabled()
    this.checkGroupChatEnabled()
  },

  // 获取群聊开关状态
  checkGroupChatEnabled() {
    const BASE_URL = 'https://parking.xianshihuodong.xyz/api'
    wx.request({
      url: BASE_URL + '/free-parking/group-chat-status',
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.code === 0) {
          this.setData({
            groupChatEnabled: res.data.data.value === 'true'
          })
          console.log('群聊开关状态:', res.data.data.value === 'true')
        }
      },
      fail: (err) => {
        console.error('获取群聊开关状态失败:', err)
        this.setData({ groupChatEnabled: false })
      }
    })
  },

  // 获取上报开关状态
  checkReportEnabled() {
    const BASE_URL = 'https://parking.xianshihuodong.xyz/api'
    wx.request({
      url: BASE_URL + '/free-parking/check-enabled',
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.code === 0) {
          this.setData({
            reportEnabled: res.data.data.enabled
          })
          console.log('上报开关状态:', res.data.data.enabled)
        }
      },
      fail: (err) => {
        console.error('获取开关状态失败:', err)
        this.setData({ reportEnabled: false })
      }
    })
  },

  goToReport() {
    wx.navigateTo({ url: '/pages/report/index' })
  },

  joinGroup() {
    wx.showModal({
      title: '加入停车交流群',
      content: '扫描群二维码加入停车技巧分享群，与更多车主交流经验。',
      confirmText: '查看二维码',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.previewImage({
            urls: ['/static/group-qrcode.png'],
            current: '/static/group-qrcode.png',
          })
        }
      }
    })
  }
})
