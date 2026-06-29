import api from './index'

export const whatsapp = {
  // 账号管理
  getAccounts: () => api.get('/whatsapp/accounts'),
  addAccount: (data) => api.post('/whatsapp/accounts', data),
  deleteAccount: (account) => api.delete(`/whatsapp/accounts/${account}`),
  online: (account) => api.post(`/whatsapp/accounts/${account}/online`),
  offline: (account) => api.post(`/whatsapp/accounts/${account}/offline`),
  getQRCode: (params) => api.get('/whatsapp/qrcode', { params }),
  
  // 消息
  sendMessage: (data) => api.post('/whatsapp/messages', data),
  getMessages: (params) => api.get('/whatsapp/messages', { params }),
  
  // 联系人
  getContacts: (params) => api.get('/whatsapp/contacts', { params })
}
