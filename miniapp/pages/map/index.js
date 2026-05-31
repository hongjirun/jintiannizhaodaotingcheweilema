const { parkingRequest } = require('../../utils/request.js')

const MAX_MARKERS = 1000

Page({
  data: {
    center: { lat: 23.129, lng: 113.264 },
    scale: 12,
    markers: [],
    lots: [],
    selectedLot: null,
    loading: false,
    statusBarHeight: 20,
    distText: ''
  },

  _allLots: [],
  _loaded: false,
  _debounceTimer: null,
  _currentBounds: null,

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    this._preloadAll()
    this.locateMe()
  },

  onShow() {},

  async _preloadAll() {
    try {
      const res = await parkingRequest.getAllLite()
      if (res.code === 0 && res.data.length > 0) {
        this._allLots = res.data.filter(item => {
          const lat = parseFloat(item.latitude)
          const lng = parseFloat(item.longitude)
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
        })
        this._loaded = true
        if (this._currentBounds) {
          this._renderByBounds(this._currentBounds)
        }
      }
    } catch (e) {
      console.error('全量加载失败', e)
    }
  },

  _renderByBounds(bounds) {
    const { swLat, swLng, neLat, neLng } = bounds
    const visible = this._allLots.filter(item => {
      const lat = parseFloat(item.latitude)
      const lng = parseFloat(item.longitude)
      return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng
    })
    const markers = visible.slice(0, MAX_MARKERS).map(item => ({
      id: Number(item.id),
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      title: item.name,
      iconPath: '/static/marker.png',
      width: 36,
      height: 36,
      callout: null,
    }))
    this.setData({ lots: visible, markers })
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
      isHighAccuracy: false,
      success: (res) => {
        wx.hideToast()
        this.setData({
          center: { lat: res.latitude, lng: res.longitude },
          scale: 14
        })
        const delta = 0.15
        const bounds = {
          swLat: res.latitude - delta, swLng: res.longitude - delta,
          neLat: res.latitude + delta, neLng: res.longitude + delta
        }
        this._currentBounds = bounds
        if (this._loaded) this._renderByBounds(bounds)
      },
      fail: (err) => {
        wx.hideToast()
        wx.showToast({ title: '定位失败，请检查权限', icon: 'none', duration: 2000 })
        console.error('getLocation fail', err)
      },
    })
  },

  onRegionChange(e) {
    if (e.type === 'begin') return
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
    this._debounceTimer = setTimeout(() => {
      const mapCtx = wx.createMapContext('myMap')
      mapCtx.getRegion({
        success: (region) => {
          const bounds = {
            swLat: region.southwest.latitude,
            swLng: region.southwest.longitude,
            neLat: region.northeast.latitude,
            neLng: region.northeast.longitude,
          }
          this._currentBounds = bounds
          if (this._loaded) this._renderByBounds(bounds)
        }
      })
    }, 300)
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
      this.setData({ selectedLot: lot, distText })
    }
  },

  closeDetail() {
    this.setData({ selectedLot: null })
  },

  stopPropagation() {},

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
