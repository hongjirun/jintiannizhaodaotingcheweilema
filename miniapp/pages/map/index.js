const { parkingRequest } = require('../../utils/request.js')

Page({
  data: {
    center: { lat: 23.129, lng: 113.264 },
    scale: 15,
    markers: [],
    lots: [],
    selectedLot: null,
    loading: false,
    statusBarHeight: 20,
    distText: ''
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    this.locateMe()
  },

  onShow() {
    // 监听定位事件
  },

  calcDist(lat1, lng1, lat2, lng2) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  },

  goSearch() {
    wx.switchTab({ url: '/pages/search/index' })
  },

  locateMe() {
    wx.showToast({ title: '定位中...', icon: 'loading', duration: 3000 })
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        wx.hideToast()
        this.setData({
          center: { lat: res.latitude, lng: res.longitude },
          scale: 18
        })
        this.loadNearby(res.latitude, res.longitude)
      },
      fail: (err) => {
        wx.hideToast()
        wx.showToast({ title: '定位失败，请检查权限', icon: 'none', duration: 2000 })
        console.error('getLocation fail', err)
      },
    })
  },

  async loadNearby(lat, lng) {
    const delta = 0.3
    this.setData({ loading: true })
    try {
      const res = await parkingRequest.getByBounds(lat - delta, lng - delta, lat + delta, lng + delta)
      if (res.code === 0) this.renderMarkers(res.data)
    } finally {
      this.setData({ loading: false })
    }
  },

  renderMarkers(data) {
    const lots = data
    const markers = data
      .filter((item) => {
        const lat = parseFloat(item.latitude)
        const lng = parseFloat(item.longitude)
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
      })
      .map((item) => ({
        id: Number(item.id),
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude),
        title: item.name,
        iconPath: '/static/marker.png',
        width: 36,
        height: 36,
        callout: null,
      }))
    this.setData({ lots, markers })
  },

  onRegionChange(e) {
    if (e.type === 'end' || e.type === 'regionchange') {
      const mapCtx = wx.createMapContext('myMap')
      mapCtx.getCenterLocation({
        success: (res) => {
          this.loadNearby(res.latitude, res.longitude)
        }
      })
    }
  },

  onMarkerTap(e) {
    const lot = this.data.lots.find((l) => Number(l.id) === Number(e.detail.markerId))
    if (lot) {
      const dist = this.calcDist(
        this.data.center.lat, 
        this.data.center.lng, 
        Number(lot.latitude), 
        Number(lot.longitude)
      )
      const distText = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`
      this.setData({ 
        selectedLot: lot,
        distText
      })
    }
  },

  closeDetail() {
    this.setData({ selectedLot: null })
  },

  stopPropagation() {
    // 阻止冒泡
  },

  startNavi() {
    const lot = this.data.selectedLot
    if (!lot) return
    wx.openLocation({
      latitude: Number(lot.latitude),
      longitude: Number(lot.longitude),
      name: lot.name,
      address: lot.address || '',
    })
  },

  makeCall() {
    const lot = this.data.selectedLot
    if (!lot?.phone) return
    wx.setClipboardData({
      data: lot.phone,
      success: () => {
        wx.showToast({ title: '电话已复制', icon: 'success' })
      }
    })
  }
})
