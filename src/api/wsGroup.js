import api from "./index";

export default {
  // 导入群组
  import: (data) => api.post("/ws-groups/import", data),
  // 获取列表
  list: (params) => api.get("/ws-groups/list", { params }),
  // 批量入群
  batchJoin: (data) => api.post("/ws-groups/batch-join", data),
  // 更新
  update: (id, data) => api.put(`/ws-groups/${id}`, data),
  // 批量更新
  batchUpdate: (data) => api.post("/ws-groups/batch-update", data),
  // 删除
  delete: (id) => api.delete(`/ws-groups/${id}`),
  // 批量删除
  batchDelete: (data) => api.post("/ws-groups/batch-delete", data),
  // 获取详情
  getInfo: (id) => api.get(`/ws-groups/${id}/info`),
};
