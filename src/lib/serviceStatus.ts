/**
 * حالة توفّر الخادم — مصدر واحد لشريط «الخدمة متوقفة مؤقتاً».
 * تُحدَّث من apiClient: أي رد ناجح = الخدمة تعمل؛ انقطاع الشبكة أو 502/503/504 = متوقفة.
 */
type Listener = () => void
let down = false
const listeners = new Set<Listener>()

export const serviceStatus = {
  isDown: () => down,
  subscribe(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
  set(next: boolean) {
    if (next === down) return
    down = next
    listeners.forEach((l) => l())
  },
}

/** هل الخطأ يدل على أن الخادم نفسه غير متاح؟ (المهلة وحدها لا تكفي — قد يكون الطلب ثقيلاً) */
export function isOutage(error: { response?: { status?: number }; code?: string }): boolean {
  const status = error.response?.status
  if (status) return status === 502 || status === 503 || status === 504
  return error.code === 'ERR_NETWORK'
}

/** رابط فحص الصحة: /api/status على نفس أصل الـ API (خارج /api/v1) */
export function statusUrl(apiBase: string | undefined, pageOrigin: string): string {
  try { return new URL('/api/status?ping=true', new URL(apiBase || '/api/v1', pageOrigin)).toString() } catch { return '/api/status?ping=true' }
}
