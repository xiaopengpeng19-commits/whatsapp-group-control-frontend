// frontend/src/api/nurture.js

import api from './index'

export default {
  // 创建任务 - POST /nurture/tasks/create
  createTask: (data) => api.post('/nurture/tasks/create', data),
  
  // 获取任务列表 - GET /nurture/tasks/list
  getTasks: (params) => api.get('/nurture/tasks/list', { params }),
  
  // 获取任务详情 - GET /nurture/tasks/detail/:id
  getTaskDetail: (id) => api.get(`/nurture/tasks/detail/${id}`),
  
  // 获取会话列表 - GET /nurture/tasks/sessions/:id
  getSessions: (id) => api.get(`/nurture/tasks/sessions/${id}`),
  
  // 启动任务 - POST /nurture/tasks/start/:id
  startTask: (id) => api.post(`/nurture/tasks/start/${id}`),
  
  // 暂停任务 - POST /nurture/tasks/pause/:id
  pauseTask: (id) => api.post(`/nurture/tasks/pause/${id}`),
  
  // 恢复任务 - POST /nurture/tasks/resume/:id
  resumeTask: (id) => api.post(`/nurture/tasks/resume/${id}`),
  
  // 删除任务 - DELETE /nurture/tasks/delete/:id
  deleteTask: (id) => api.delete(`/nurture/tasks/delete/${id}`),
}