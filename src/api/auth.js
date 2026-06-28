// frontend/src/api/auth.js
import api from './index'

export const auth = {
  login: (data) => api.post('/login', data),
  logout: () => api.post('/logout'),
  getCurrentUser: (userId) => api.get(`/user/${userId}`)
}