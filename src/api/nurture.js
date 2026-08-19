// frontend/src/api/nurture.js

import api from './index'

export default {
  // 创建任务
  createTask: (data) => api.post('/nurture/tasks', data),
  
  // 获取任务列表
  getTasks: (params) => api.get('/nurture/tasks', { params }),
  
  // 获取任务详情
  getTaskDetail: (id) => api.get(`/nurture/tasks/${id}`),
  
  // 获取会话列表
  getSessions: (id) => api.get(`/nurture/tasks/${id}/sessions`),
  
  // 启动任务
  startTask: (id) => api.post(`/nurture/tasks/${id}/start`),
  
  // 暂停任务
  pauseTask: (id) => api.post(`/nurture/tasks/${id}/pause`),
  
  // 恢复任务
  resumeTask: (id) => api.post(`/nurture/tasks/${id}/resume`),
  
  // 删除任务
  deleteTask: (id) => api.delete(`/nurture/tasks/${id}`),
}