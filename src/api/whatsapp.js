// frontend/src/api/whatsapp.js
export default {
  // 账号管理
  getAccounts: () => api.get('/whatsapp/accounts/list'),      // 改
  addAccount: (data) => api.post('/whatsapp/accounts/add'),  // 改
  deleteAccount: (account) => api.post(`/whatsapp/accounts/${account}/del`),  // 改
  online: (account) => api.post(`/whatsapp/accounts/${account}/online`),
  offline: (account) => api.post(`/whatsapp/accounts/${account}/offline`),
  getQRCode: (params) => api.get('/whatsapp/qrcode', { params }),
  
  // 消息
  sendMessage: (data) => api.post('/whatsapp/messages/send'),  // 改
  getMessages: (params) => api.get('/whatsapp/messages/get'),  // 改
  
  // 联系人
  getContacts: (params) => api.get('/whatsapp/contacts', { params })
}