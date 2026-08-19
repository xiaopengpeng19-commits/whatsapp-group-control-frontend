
import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api',
  timeout: 30000
})

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code !== 0) {
      return Promise.reject(data)
    }
    return data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 导入各个模块
import auth from './auth'
import whatsapp from './whatsapp'
import user from './user'

// 导出 api 实例（默认导出）
export default api

// 命名导出各个模块
export { auth, whatsapp, user }
// 新增群发任务API
export { default as broadcast } from './broadcast'
export { default as chat } from './chat'
export { default as nurture } from './nurture'