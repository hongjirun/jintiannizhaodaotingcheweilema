const { parkingRequest } = require('../../utils/request.js')

Page({
  data: {
    formData: {
      name: '',
      address: '',
      location: null,
      freeType: 'night',
      hourlyPrice: '',
      remark: ''
    },
    freeTypes: [
      { label: '夜间免费', value: 'night' },
      { label: '周末免费', value: 'weekend' },
      { label: '全天免费', value: 'allday' },
      { label: '节假日免费', value: 'holiday' },
      { label: '不免费', value: 'not_free' }
    ],
    canSubmit: false
  },

  onLoad() {
    this.checkSubmit()
  },

  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value })
    this.checkSubmit()
  },

  onAddressInput(e) {
    this.setData({ 'formData.address': e.detail.value })
    this.checkSubmit()
  },

  onRemarkInput(e) {
    this.setData({ 'formData.remark': e.detail.value })
  },

  onPriceInput(e) {
    this.setData({ 'formData.hourlyPrice': e.detail.value })
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const update = {
          'formData.location': {
            latitude: res.latitude,
            longitude: res.longitude,
            address: res.address || res.name
          }
        }
        if (res.name && !this.data.formData.name) {
          update['formData.name'] = res.name
        }
        this.setData(update)
        this.checkSubmit()
      }
    })
  },

  selectType(e) {
    this.setData({ 'formData.freeType': e.currentTarget.dataset.value })
  },

  checkSubmit() {
    const { name, location } = this.data.formData
    const canSubmit = name.trim() && location
    this.setData({ canSubmit })
  },

  async submitReport() {
    if (!this.data.canSubmit) return
    
    const { formData } = this.data
    const data = {
      name: formData.name,
      address: formData.address,
      latitude: formData.location.latitude,
      longitude: formData.location.longitude,
      freeType: formData.freeType,
      remark: formData.remark
    }

    wx.showLoading({ title: '提交中...' })
    try {
      const res = await parkingRequest.createReport(data)
      wx.hideLoading()
      if (res.code === 0) {
        wx.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('提交失败:', err)
      const errorMsg = err.data?.message || err.message || '提交失败'
      wx.showToast({ title: errorMsg, icon: 'none' })
    }
  }
})
