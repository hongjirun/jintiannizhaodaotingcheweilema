import request from './request'

// Mock测试数据（本地开发用）
const mockReports = [
  {
    id: 1,
    name: '测试停车场-天河城',
    address: '广州市天河区天河路208号天河城',
    latitude: 23.1324,
    longitude: 113.3245,
    freeType: 'allday',
    freeTimeStart: '00:00',
    freeTimeEnd: '24:00',
    reporterName: '测试用户',
    reporterPhone: '13800138000',
    status: 0,
    images: [],
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: '北京路步行街停车场',
    address: '广州市越秀区北京路步行街',
    latitude: 23.1242,
    longitude: 113.2665,
    freeType: 'weekend',
    freeTimeStart: '00:00',
    freeTimeEnd: '24:00',
    reporterName: '张三',
    reporterPhone: '13900139000',
    status: 1,
    images: [],
    createdAt: new Date().toISOString()
  }
]

const isMock = import.meta.env.DEV

export const freeParkingApi = {
  // 获取上报列表
  getReports(params) {
    if (isMock) {
      // 本地mock模式
      let list = [...mockReports]
      if (params.keyword) {
        list = list.filter(item => item.name.includes(params.keyword) || item.address.includes(params.keyword))
      }
      if (params.status !== undefined) {
        list = list.filter(item => item.status === params.status)
      }
      return Promise.resolve({
        code: 0,
        data: {
          list,
          total: list.length
        }
      })
    }
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
    if (isMock) {
      return Promise.resolve({ code: 0, data: { enabled: true } })
    }
    return request.get('/free-parking/admin/enabled-status')
  },

  // 切换开关状态
  toggleEnabled(enabled) {
    return request.post('/free-parking/admin/toggle-enabled', { enabled })
  }
}
