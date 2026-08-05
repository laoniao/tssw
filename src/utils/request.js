import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 创建axios实例
// 生产/开发通过 .env.* 的 VITE_API_BASE_URL 切换；默认回退到 /api
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data

    // 如果返回的状态码不是200，说明接口请求失败
    if (res.code !== 200) {
      ElMessage({
        message: res.message || '请求失败',
        type: 'error',
        duration: 5 * 1000,
      })

      // 401: 未登录或token过期
      if (res.code === 401) {
        ElMessage({
          message: '登录已过期，请重新登录',
          type: 'error',
          duration: 5 * 1000,
        })
        // 清除token并跳转登录页
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        router.push('/login')
      }

      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res
  },
  (error) => {
    console.error('响应错误:', error)
    ElMessage({
      message: error.message || '网络错误',
      type: 'error',
      duration: 5 * 1000,
    })
    return Promise.reject(error)
  }
)

export default service
