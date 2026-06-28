// frontend/src/api/whatsapp.js
import api from './index'

export const whatsapp = {
  getAccounts: () => api.get('/whatsapp/accounts'),
  addAccount: (data) => api.post('/whatsapp/accounts', data),
  deleteAccount: (account) => api.delete(`/whatsapp/accounts/${account}`),
  online: (account) => api.post(`/whatsapp/accounts/${account}/online`),
  offline: (account) => api.post(`/whatsapp/accounts/${account}/offline`),
  sendMessage: (data) => api.post('/whatsapp/messages', data),
  getMessages: (params) => api.get('/whatsapp/messages', { params }),
  getContacts: (params) => api.get('/whatsapp/contacts', { params }),
  getQRCode: (params) => api.get('/whatsapp/qrcode', { params })
}