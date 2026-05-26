const { parkingRequest } = require('../../utils/request.js')

Page({
  data: {
    keyword: '',
    list: [],
    loading: false,
    searched: false
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  clearKeyword() {
    this.setData({ keyword: '', list: [], searched: false })
  },

  goBack() {
    wx.switchTab({ url: '/pages/map/index' })
  },

  async doSearch() {
    const kw = this.data.keyword.trim()
    if (!kw) return
    this.setData({ loading: true, searched: false, list: [] })
    try {
      const res = await parkingRequest.search(kw)
      if (res.code === 0) {
        this.setData({ list: res.data, searched: true })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  goMap(e) {
    const item = e.currentTarget.dataset.item
    wx.switchTab({
      url: '/pages/map/index',
      success: () => {
        // 通过全局数据传递
        const pages = getCurrentPages()
        const mapPage = pages[0]
        if (mapPage) {
          const lat = parseFloat(item.latitude)
          const lng = parseFloat(item.longitude)
          if (!isNaN(lat) && !isNaN(lng)) {
            mapPage.setData({
              center: { lat, lng },
              scale: 18,
              selectedLot: item
            })
          }
        }
      }
    })
  },

  navi(e) {
    const item = e.currentTarget.dataset.item
    wx.openLocation({
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      name: item.name,
      address: item.address || '',
    })
  }
})
