import axios, { AxiosError } from 'axios'
import { getGuestUuid } from './guest'
import { useAuthStore } from '../stores/authStore'
import type { ApiErrorBody } from '../types/api'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 12_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else config.headers.set('X-Guest-UUID', getGuestUuid())

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) useAuthStore.getState().clearSession()
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? 'تعذر الاتصال بالخادم. حاولي مرة أخرى.'
  }
  if (error instanceof Error) return error.message
  const mock = error as { response?: { data?: { message?: string } } }
  return mock?.response?.data?.message || 'حدث خطأ غير متوقع. حاولي مرة أخرى.'
}
