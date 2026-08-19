// frontend/src/api/nurture.js

import api from './index'

export default {
  // 创建任务 - POST /nurture/tasks/create
  createTask: (data) => api.post('/nurture/tasks/create', data),
  
  // 获取任务列表 - GET /nurture/tasks
  getTasks: (params) => api.get('/nurture/tasks', { params }),
  
  // 获取任务详情 - GET /nurture/tasks/:id
  getTaskDetail: (id) => api.get(`/nurture/tasks/${id}`),
  
  // 获取会话列表 - GET /nurture/tasks/:id/sessions
  getSessions: (id) => api.get(`/nurture/tasks/${id}/sessions`),
  
  // 启动任务 - POST /nurture/tasks/:id/start
  startTask: (id) => api.post(`/nurture/tasks/${id}/start`),
  
  // 暂停任务 - POST /nurture/tasks/:id/pause
  pauseTask: (id) => api.post(`/nurture/tasks/${id}/pause`),
  
  // 恢复任务 - POST /nurture/tasks/:id/resume
  resumeTask: (id) => api.post(`/nurture/tasks/${id}/resume`),
  
  // 删除任务 - DELETE /nurture/tasks/:id
  deleteTask: (id) => api.delete(`/nurture/tasks/${id}`),
}