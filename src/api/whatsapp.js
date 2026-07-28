import api from "./index";

export default {
  // ==================== 账号管理 ====================
  getAccounts: () =>
    api.get("/whatsapp/accounts/list", {
      params: { page: 1, page_size: 1000 },
    }),
  addAccount: (data) => api.post("/whatsapp/accounts/add", data),
  deleteAccount: (account) => api.post(`/whatsapp/accounts/${account}/del`),
  online: (account) => api.post(`/whatsapp/accounts/${account}/online`),
  offline: (account) => api.post(`/whatsapp/accounts/${account}/offline`),

  // 二维码登录 - 转发到协议服
  getQRCodeLogin: (account, data) =>
    api.post(`/whatsapp/accounts/${account}/qrcode`, data),

  // 更新代理分组
  updateProxyGroup: (account, data) =>
    api.put(`/whatsapp/accounts/${account}/proxygroup`, data),

  // ==================== 消息管理 ====================
  sendMessage: (data) => api.post("/whatsapp/messages/send", data),
  getMessages: (params) => api.get("/whatsapp/messages/get", { params }),
  sendLinkMessage: (data) => api.post("/whatsapp/link/send", data),

  // ==================== 消息删除 ====================
  deleteMessage: (id) => api.delete(`/whatsapp/messages/${id}/delete`),
  batchDeleteMessages: (data) =>
    api.post("/whatsapp/messages/batch/delete", data),

  // ==================== 联系人 ====================
  getContacts: (params) => api.get("/whatsapp/contacts", { params }),

  // ==================== 代理管理 ====================
  getProxies: (params) => api.get("/proxies/list", { params }),
  addProxy: (data) => api.post("/proxies/add", data),
  batchAddProxies: (data) => api.post("/proxies/batch/add", data),
  deleteProxy: (id) => api.delete(`/proxies/${id}/delete`),
  batchDeleteProxies: (data) => api.post("/proxies/batch/delete", data),
  toggleProxyStatus: (id, data) => api.put(`/proxies/${id}/status`, data),

  // 联系人管理
  getContacts: (params) => api.get("/whatsapp/contacts/list", { params }),
  addContact: (data) => api.post("/whatsapp/contacts/add", data),
  batchAddContacts: (data) => api.post("/whatsapp/contacts/batch/add", data),
  // ==================== 导出凭证 ====================
  exportCreds: (account) => api.get(`/whatsapp/accounts/${account}/export`),
  batchImportAccount: (data) =>
    api.post("/whatsapp/accounts/batch/import", data),

  requestPairingCode: (data) =>
    api.post(`/whatsapp/accounts/${data.account}/request-pairing`, {
      proxy: data.proxy,
    }),
};
