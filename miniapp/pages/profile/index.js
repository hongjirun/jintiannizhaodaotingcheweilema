Page({
  showAbout() {
    wx.showModal({
      title: '今天你找到停车位了吗',
      content: '全国停车场地图查询小程序，帮助您快速找到附近停车场并一键导航。',
      showCancel: false,
      confirmText: '知道了',
    })
  },

  goToReport() {
    wx.navigateTo({ url: '/pages/report/index' })
  }
})
