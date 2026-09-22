import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import type { ApiErrorBody } from '../types/api'

// ── Cart Token (للمستخدم الضيف) ──────────────────────────────────────────
const CART_TOKEN_KEY = 'gz_cart_token'

export function getCartToken(): string | null {
  try { return localStorage.getItem(CART_TOKEN_KEY) } catch { return null }
}
export function setCartToken(token: string): void {
  try { localStorage.setItem(CART_TOKEN_KEY, token) } catch {}
}
export function clearCartToken(): void {
  try { localStorage.removeItem(CART_TOKEN_KEY) } catch {}
}

// ── Axios Instance ────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 12_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'ar',
  },
})

// ── Request Interceptor ───────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else {
    const cartToken = getCartToken()
    if (cartToken) config.headers.set('X-Cart-Token', cartToken)
  }
  return config
})

// ── Response Interceptor ──────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    const cartToken = response.headers['x-cart-token'] as string | undefined
    if (cartToken) setCartToken(cartToken)
    return response
  },
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession()
      clearCartToken()
    }
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? 'تعذر الاتصال بالخادم. حاول مرة أخرى.'
  }
  if (error instanceof Error) return error.message
  const mock = error as { response?: { data?: { message?: string } } }
  return mock?.response?.data?.message || 'حدث خطأ غير متوقع. حاول مرة أخرى.'
}
