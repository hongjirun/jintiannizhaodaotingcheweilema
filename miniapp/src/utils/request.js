// 线上服务器地址（HTTPS）
const BASE_URL = 'https://parking.xianshihuodong.xyz/api'

export function request(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header,
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          uni.showToast({ title: '网络错误', icon: 'none' })
          reject(res)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络连接失败', icon: 'none' })
        reject(err)
      },
    })
  })
}

export const parkingRequest = {
  getByBounds: (swLat, swLng, neLat, neLng) =>
    request({ url: `/parking/bounds?sw_lat=${swLat}&sw_lng=${swLng}&ne_lat=${neLat}&ne_lng=${neLng}` }),
  getNearby: (lat, lng, radius = 5000) =>
    request({ url: `/parking/nearby?lat=${lat}&lng=${lng}&radius=${radius}` }),
  search: (keyword, city = '') =>
    request({ url: `/parking/search?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}` }),
  getDetail: (id) =>
    request({ url: `/parking/${id}` }),

  // 免费停车点位上报
  createReport: (data) =>
    request({ url: '/free-parking/report', method: 'POST', data }),
  checkReportEnabled: () =>
    request({ url: '/free-parking/check-enabled' }),
  getApprovedFreeParking: (bounds) => {
    const params = bounds ? `?sw_lat=${bounds.sw_lat}&sw_lng=${bounds.sw_lng}&ne_lat=${bounds.ne_lat}&ne_lng=${bounds.ne_lng}` : ''
    return request({ url: `/free-parking/approved${params}` })
  },
}
