// frontend/src/api/nurture.js

import api from './index'

export default {
  createTask: (data) => api.post('/nurture/tasks/create', data),
  getTasks: (params) => api.get('/nurture/tasks/list', { params }),
  getTaskDetail: (id) => api.get(`/nurture/tasks/detail/${id}`),
  getSessions: (id) => api.get(`/nurture/tasks/sessions/${id}`),
  startTask: (id) => api.post(`/nurture/tasks/start/${id}`),
  pauseTask: (id) => api.post(`/nurture/tasks/pause/${id}`),
  resumeTask: (id) => api.post(`/nurture/tasks/resume/${id}`),
  deleteTask: (id) => api.delete(`/nurture/tasks/delete/${id}`),
}