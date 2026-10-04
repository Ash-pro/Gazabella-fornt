import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import type { ApiErrorBody } from '../types/api'
import { isMvp0Api } from './apiContract'
import { getGuestUuid } from './guest'
import { captureMessage } from './monitoring'
import { isOutage, serviceStatus } from './serviceStatus'

// ── Cart Token (للمستخدم الضيف) ──────────────────────────────────────────
const CART_TOKEN_KEY = `gz_cart_token:${import.meta.env.VITE_API_BASE_URL || '/api/v1'}`

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
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
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
  } else if (isMvp0Api()) {
    config.headers.set('X-Guest-UUID', getGuestUuid())
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
    serviceStatus.set(false)
    return response
  },
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status
    // أي رد من الخادم (حتى 4xx/500) يعني أنه يعمل؛ الانقطاع = لا رد أو 502/503/504
    if (isOutage(error)) serviceStatus.set(true)
    else if (status) serviceStatus.set(false)
    if (status && status >= 500) {
      // المسار بدون query، والأرقام تُستبدل بـ :id لتجميع نفس الخطأ في Sentry
      const path = (error.config?.url ?? '').split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id').replace(/\/(GZ|GAZ)-[\w-]+/gi, '/:order')
      captureMessage(`API ${status} ${(error.config?.method ?? 'get').toUpperCase()} ${path}`, { level: 'error', status, path })
    }
    if (error.response?.status === 401 && error.config?.headers.get('Authorization') === `Bearer ${useAuthStore.getState().token}`) {
      useAuthStore.getState().clearSession()

    }
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    // بدون رد: انتهت المهلة أو انقطع الاتصال — نميّز بينهما حتى يعرف المستخدم والفريق السبب
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'استغرق الخادم وقتاً أطول من المعتاد. قد يكون الطلب تم فعلاً — راجعي «طلباتي» قبل إعادة المحاولة.'
      return navigator.onLine === false ? 'لا يوجد اتصال بالإنترنت. تحققي من الشبكة ثم حاولي مجدداً.' : 'تعذّر الوصول إلى الخادم الآن. حاولي بعد قليل.'
    }
    const status = error.response.status
    const requestId = (error.response.headers?.['x-request-id'] as string | undefined)?.slice(0, 8)
    if (status >= 500) return `حدث خطأ في الخادم (رمز ${status}${requestId ? ` · ${requestId}` : ''}). حاولي بعد قليل، وإن تكرر تواصلي معنا.`
    if (status === 401) return 'انتهت الجلسة. يرجى تسجيل الدخول مجددًا.'
    if (status === 404) return 'لم نجد ما تبحثين عنه. ربما حُذف أو تغيّر الرابط.'
    if (error.response?.status === 403) return 'لا تملك صلاحية تنفيذ هذا الإجراء.'
    if (error.response?.status === 429) return 'طلبات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مجددًا.'
    const messages = Object.values(error.response?.data?.errors ?? {}).flat().filter((message) => typeof message === 'string')
    return messages.join(' — ') || error.response?.data?.message || 'تعذر الاتصال بالخادم. حاول مرة أخرى.'
  }
  if (error instanceof Error) return error.message
  const mock = error as { response?: { data?: { message?: string } } }
  return mock?.response?.data?.message || 'حدث خطأ غير متوقع. حاول مرة أخرى.'
}

// ── Image URL Helper ──────────────────────────────────────────────────────
// Laravel بيرجع الصور بـ APP_URL اللي ممكن يكون localhost —
// هنا بنستبدل أي prefix بـ VITE_STORAGE_URL لو موجود
const STORAGE_URL = (import.meta.env.VITE_STORAGE_URL as string | undefined)?.replace(/\/$/, '')

export function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // لو الـ URL كامل ومصدره نفس الـ storage — استخدمه مباشرة
  if (STORAGE_URL && (url.startsWith('http://') || url.startsWith('https://'))) {
    // استبدل أي origin مختلف بـ STORAGE_URL (يعالج حالة localhost vs cloudflare)
    try {
      const parsed = new URL(url)
      const storageOrigin = new URL(STORAGE_URL).origin
      if (parsed.origin !== storageOrigin && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
        return STORAGE_URL + parsed.pathname + parsed.search
      }
    } catch {
      // URL مش valid — رجّعه كما هو
    }
  }
  // لو مسار نسبي مثل /storage/... أضف STORAGE_URL
  if (STORAGE_URL && url.startsWith('/')) {
    return STORAGE_URL + url
  }
  return url
}
