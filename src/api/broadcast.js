import api from './index'

export default {
  // 创建群发任务
  createTask: (data) => api.post('/broadcast/tasks', data),
  
  // 获取任务列表
  getTasks: (params) => api.get('/broadcast/tasks', { params }),
  
  // 获取任务详情
  getTaskDetail: (id) => api.get(`/broadcast/tasks/${id}`),
  
  // 获取子任务列表
  getSubTasks: (id, params) => api.get(`/broadcast/tasks/${id}/subtasks`, { params }),
  
  // 启动任务
  startTask: (id) => api.post(`/broadcast/tasks/${id}/start`),
  
  // 暂停任务
  pauseTask: (id) => api.post(`/broadcast/tasks/${id}/pause`),
  
  // 删除任务
  deleteTask: (id) => api.delete(`/broadcast/tasks/${id}`),
}
