// frontend/src/api/groupChat.js

import api from './index'

export default {
  // 创建群聊任务
  createTask: (data) => api.post('/group-chat/tasks', data),
  
  // 获取任务列表
  getTasks: (params) => api.get('/group-chat/tasks', { params }),
  
  // 获取任务详情
  getTaskDetail: (id) => api.get(`/group-chat/tasks/${id}`),
  
  // 启动任务
  startTask: (id) => api.post(`/group-chat/tasks/${id}/start`),
  
  // 暂停任务
  pauseTask: (id) => api.post(`/group-chat/tasks/${id}/pause`),
  
  // 删除任务
  deleteTask: (id) => api.delete(`/group-chat/tasks/${id}`),
}