/**
 * مراقبة الأخطاء — Sentry يُحمَّل كسولاً (خارج الحزمة الرئيسية) فقط عند وجود:
 *   VITE_SENTRY_DSN · وليس في وضع mock
 * بدون DSN: الدوال لا تفعل شيئاً (لا تكلفة).
 * الخصوصية: sendDefaultPii=false، حذف الترويسات والكوكيز، إخفاء أرقام الجوال والتوكنات،
 * والمستخدم يُعرّف بالمعرّف الرقمي فقط.
 */
type Sentry = typeof import('./sentryClient')
type Context = Record<string, unknown>

const env = import.meta.env
const dsn = env.VITE_DATA_SOURCE === 'mock' ? undefined : (env.VITE_SENTRY_DSN as string | undefined)
let sentry: Sentry | null = null
const queue: Array<(s: Sentry) => void> = []

const PHONE = /(?:\+?97[02][\s-]?|\b0)5\d(?:[\s-]?\d){7}\b/g
const BEARER = /Bearer\s+[A-Za-z0-9|._-]+/gi

export function scrub(text: string): string {
  return text.replace(BEARER, 'Bearer [token]').replace(PHONE, '[phone]')
}

function scrubDeep<T>(value: T, depth = 0): T {
  if (depth > 6 || value == null) return value
  if (typeof value === 'string') return scrub(value) as T
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1)) as T
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = /^(phone|name|address|email|token|authorization|cookie|delivery_pin|otp|code)$/i.test(k) ? '[redacted]' : scrubDeep(v, depth + 1)
    }
    return out as T
  }
  return value
}

function withSentry(fn: (s: Sentry) => void) {
  if (!dsn) return
  if (sentry) fn(sentry)
  else if (queue.length < 30) queue.push(fn)
}

export function initMonitoring() {
  if (!dsn) return
  const start = () => import('./sentryClient').then((mod) => {
    mod.init({
      dsn,
      environment: (env.VITE_ENV_LABEL as string | undefined) ? 'staging' : env.MODE === 'production' ? 'production' : env.MODE,
      release: (env.VITE_APP_RELEASE as string | undefined) || undefined,
      sendDefaultPii: false,
      tracesSampleRate: Number(env.VITE_SENTRY_TRACES_RATE ?? 0),
      integrations: Number(env.VITE_SENTRY_TRACES_RATE ?? 0) > 0 ? [mod.browserTracingIntegration()] : [],
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        /^AbortError/,
        /Network Error/i, // انقطاع الشبكة شائع — لا نغرق اللوحة به
        /Load failed/i,
      ],
      denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
      beforeSend(event) {
        if (event.request) { delete event.request.headers; delete event.request.cookies; if (event.request.url) event.request.url = event.request.url.split('?')[0] }
        if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined
        if (event.message) event.message = scrub(event.message)
        event.exception?.values?.forEach((v) => { if (v.value) v.value = scrub(v.value) })
        if (event.extra) event.extra = scrubDeep(event.extra)
        if (event.contexts) event.contexts = scrubDeep(event.contexts)
        return event
      },
      beforeBreadcrumb(crumb) {
        if (crumb.category === 'console') return null
        if (crumb.data?.url) crumb.data.url = String(crumb.data.url).split('?')[0]
        if (crumb.message) crumb.message = scrub(crumb.message)
        return crumb
      },
    })
    sentry = mod
    queue.splice(0).forEach((fn) => fn(mod))
  }).catch(() => { /* فشل تحميل Sentry لا يؤثر على المتجر */ })
  // بعد تحميل الصفحة حتى لا ينافس المحتوى الأساسي
  if (document.readyState === 'complete') void start()
  else window.addEventListener('load', () => void start(), { once: true })
}

export function captureError(error: unknown, context?: Context) {
  if (env.DEV) console.error('[monitoring]', error, context)
  withSentry((s) => s.captureException(error, context ? { extra: scrubDeep(context) } : undefined))
}

export function captureMessage(message: string, context?: Context & { level?: 'warning' | 'error' | 'info' }) {
  const { level = 'warning', ...rest } = context ?? {}
  withSentry((s) => s.captureMessage(scrub(message), { level, extra: scrubDeep(rest) }))
}

export function setMonitoringUser(id: number | string | null | undefined) {
  withSentry((s) => s.setUser(id != null ? { id: String(id) } : null))
}

/**
 * بعد كل نشر تتغير أسماء chunks؛ مستخدمة فاتحة الصفحة القديمة تحصل على خطأ تحميل.
 * نعيد التحميل مرة واحدة تلقائياً بدل شاشة الخطأ.
 */
export function installChunkReloadGuard() {
  window.addEventListener('vite:preloadError', (event) => {
    const key = 'gz_chunk_reload_at'
    let last = 0
    try { last = Number(sessionStorage.getItem(key)) || 0 } catch { /* ignore */ }
    if (Date.now() - last < 60_000) return // حصل قبل دقيقة — اترك ErrorBoundary يعرض الرسالة
    try { sessionStorage.setItem(key, String(Date.now())) } catch { /* ignore */ }
    event.preventDefault()
    window.location.reload()
  })
}
