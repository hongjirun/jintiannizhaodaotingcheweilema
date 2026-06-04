// 线上服务器地址（HTTPS）
const BASE_URL = 'https://parking.xianshihuodong.xyz/api'

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          wx.showToast({ title: '网络错误', icon: 'none' })
          reject(res)
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络连接失败', icon: 'none' })
        reject(err)
      },
    })
  })
}

const parkingRequest = {
  getByBounds: (swLat, swLng, neLat, neLng) =>
    request({ url: `/parking/bounds?sw_lat=${swLat}&sw_lng=${swLng}&ne_lat=${neLat}&ne_lng=${neLng}` }),
  getNearby: (lat, lng, radius = 5000) =>
    request({ url: `/parking/nearby?lat=${lat}&lng=${lng}&radius=${radius}` }),
  search: (keyword, city = '') =>
    request({ url: `/parking/search?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}` }),
  getDetail: (id) =>
    request({ url: `/parking/${id}` }),
  getAllLite: () =>
    request({ url: '/parking/all' }),
}

module.exports = {
  request,
  parkingRequest
}
