import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420',
  },
  timeout: 25000,
})

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const { token, user } = useAuthStore.getState()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (user?.id) {
      config.headers['x-user-id'] = user.id
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401 logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on login attempt failures
      if (!error.config?.url?.includes('/auth/login') && !error.config?.url?.includes('/auth/verify')) {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)

export default api
