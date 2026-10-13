import axios, { AxiosError } from 'axios'
import type { AuthUser, CreateOrderPayload, Order, Product, ProductInput } from '../types'

export const AUTH_STORAGE_KEY = 'mystreet.auth'
export const UNAUTHORIZED_EVENT = 'mystreet:unauthorized'

const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5080'

export const http = axios.create({ baseURL, timeout: 15000 })

http.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (raw) {
      const { token } = JSON.parse(raw) as AuthUser
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    /* ignore corrupt storage */
  }
  return config
})

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const hadToken = !!error.config?.headers?.Authorization
    // An expired/invalid token on an authenticated call => sign the user out.
    if (error.response?.status === 401 && hadToken) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    return Promise.reject(error)
  },
)

/** Turns any thrown value into a friendly message. Never shows raw exception text. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the server. Please make sure the API is running.'
    }
    const data = error.response.data as { message?: unknown } | undefined
    if (error.response.status >= 500) return 'Something went wrong on our side. Please try again.'
    if (typeof data?.message === 'string' && data.message) return data.message
    if (error.response.status === 403) return 'You do not have permission to do that.'
    if (error.response.status === 404) return 'We could not find what you were looking for.'
  }
  return fallback
}

export const authApi = {
  login: async (email: string, password: string) =>
    (await http.post<AuthUser>('/api/auth/login', { email, password })).data,
  register: async (email: string, password: string) =>
    (await http.post<AuthUser>('/api/auth/register', { email, password })).data,
  logout: async () => { await http.post('/api/auth/logout') },
}

export const productApi = {
  list: async (filters: { brand?: string; size?: string } = {}) =>
    (await http.get<Product[]>('/api/products', { params: filters })).data,
  get: async (id: string) => (await http.get<Product>(`/api/products/${id}`)).data,
  create: async (input: ProductInput) => (await http.post<Product>('/api/products', input)).data,
  update: async (id: string, input: ProductInput) => (await http.put<Product>(`/api/products/${id}`, input)).data,
  remove: async (id: string) => { await http.delete(`/api/products/${id}`) },
}

export const orderApi = {
  create: async (payload: CreateOrderPayload) => (await http.post<Order>('/api/orders', payload)).data,
  mine: async () => (await http.get<Order[]>('/api/orders/mine')).data,
  get: async (id: string) => (await http.get<Order>(`/api/orders/${id}`)).data,
}
