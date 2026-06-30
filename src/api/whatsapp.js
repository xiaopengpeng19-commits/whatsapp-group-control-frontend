import api from './index'

export default {
  // ==================== 代理管理 ====================
  // 获取代理列表
  getProxies: (params) => api.get('/proxies/list', { params }),
  // 添加代理
  addProxy: (data) => api.post('/proxies/add', data),
  // 批量添加代理
  batchAddProxies: (data) => api.post('/proxies/batch', data),
  // 删除代理
  deleteProxy: (id) => api.delete(`/proxies/${id}`),
  // 批量删除代理
  batchDeleteProxies: (data) => api.post('/proxies/batch/delete', data),
  // 切换代理状态
  toggleProxyStatus: (id, data) => api.put(`/proxies/${id}/status`, data),
  // 获取代理分组列表
  getProxyGroups: () => api.get('/proxies/groups'),

  // 二维码登录 - 转发到协议服
  getQRCodeLogin: (account, data) => api.post(`/whatsapp/accounts/${account}/qrcode`, data),

  // ==================== 账号管理 ====================
  // 获取账号列表 - GET，不需要传数据
  getAccounts: () => api.get('/whatsapp/accounts/list'),
  
  // 添加账号 - POST，需要传 data
  addAccount: (data) => api.post('/whatsapp/accounts/add', data),
  
  // 删除账号 - POST，URL 中带参数
  deleteAccount: (account) => api.post(`/whatsapp/accounts/${account}/del`),
  
  // 上线 - POST，URL 中带参数
  online: (account) => api.post(`/whatsapp/accounts/${account}/online`),
  
  // 下线 - POST，URL 中带参数
  offline: (account) => api.post(`/whatsapp/accounts/${account}/offline`),
  
  // 获取二维码 - GET，带查询参数
  getQRCode: (params) => api.get('/whatsapp/qrcode', { params }),
  
  // ==================== 消息管理 ====================
  // 发送消息 - POST，需要传 data
  sendMessage: (data) => api.post('/whatsapp/messages/send', data),

  // ==================== 链接消息 ====================
  // 发送链接消息 - POST，需要传 data
  sendLinkMessage: (data) => api.post('/whatsapp/link/send', data),
  
  // 获取消息列表 - GET，带查询参数
  getMessages: (params) => api.get('/whatsapp/messages/get', { params }),
  
  // ==================== 联系人 ====================
  // 获取联系人列表 - GET，带查询参数
  getContacts: (params) => api.get('/whatsapp/contacts', { params })

  
}
