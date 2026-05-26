import request from './request'

export const freeParkingApi = {
  // 获取上报列表
  getReports(params) {
    return request.get('/free-parking/admin/reports', { params })
  },

  // 审核上报
  review(id, data) {
    return request.post(`/free-parking/admin/review/${id}`, data)
  },

  // 删除上报
  delete(id) {
    return request.post(`/free-parking/admin/delete/${id}`)
  },

  // 获取开关状态
  getEnabledStatus() {
    return request.get('/free-parking/admin/enabled-status')
  },

  // 切换开关状态
  toggleEnabled(enabled) {
    return request.post('/free-parking/admin/toggle-enabled', { enabled })
  }
}
