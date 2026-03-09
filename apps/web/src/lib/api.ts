import axios from 'axios'

// In Docker, NEXT_PUBLIC_API_URL is not set, so relative '/api/v1' is used —
// Next.js rewrites proxy it to the internal API container (see next.config.ts).
// In local dev, NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 from .env.local.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        window.location.href = '/login'
        return Promise.reject(error)
      }
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefresh } = data.data.tokens
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefresh)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)
