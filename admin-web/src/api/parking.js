import http from './request'

export const parkingApi = {
  list: (params) => http.get('/admin/parking/list', { params }),
  stats: () => http.get('/admin/parking/stats'),
  create: (data) => http.post('/admin/parking', data),
  update: (id, data) => http.put(`/admin/parking/${id}`, data),
  remove: (id) => http.delete(`/admin/parking/${id}`),
  batchRemove: (ids) => http.delete('/admin/parking/batch', { data: { ids } }),
  importPoi: (city) => http.post('/admin/parking/import/poi', { city }),
  importExcel: (list) => http.post('/admin/parking/import/excel', { list }),
  exportExcel: (params) => http.get('/admin/parking/export', { params, responseType: 'blob' }),
}

export const authApi = {
  login: (data) => http.post('/admin/login', data),
}
