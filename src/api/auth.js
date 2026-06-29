
import api from './index'

export default {
  login: (data) => api.post('/login', data),
  logout: () => api.post('/logout'),
  getCurrentUser: (userId) => api.get(`/user/${userId}`)
}
