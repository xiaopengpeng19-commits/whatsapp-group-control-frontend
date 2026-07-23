import api from './index'

export default {
  // 创建互聊任务
  createTask: (data) => api.post('/chat/tasks', data),
  
  // 获取任务列表
  getTasks: (params) => api.get('/chat/tasks', { params }),
  
  // 获取任务详情
  getTaskDetail: (id) => api.get(`/chat/tasks/${id}`),
  
  // 启动任务
  startTask: (id) => api.post(`/chat/tasks/${id}/start`),
  
  // 暂停任务
  pauseTask: (id) => api.post(`/chat/tasks/${id}/pause`),
  
  // 恢复任务
  resumeTask: (id) => api.post(`/chat/tasks/${id}/resume`),
  
  // 停止任务
  stopTask: (id) => api.post(`/chat/tasks/${id}/stop`),
  
  // 删除任务
  deleteTask: (id) => api.delete(`/chat/tasks/${id}`),
}
