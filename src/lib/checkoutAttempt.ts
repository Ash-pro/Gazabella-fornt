/**
 * BE-04 — مفتاح منع تكرار الطلب (Idempotency-Key) لمسار POST /checkout (عقد legacy).
 *
 * القاعدة: مفتاح جديد لكل «نية شراء»، ونفس المفتاح عند إعادة إرسال نفس البيانات.
 * يُحفظ المفتاح مع بصمة الحمولة في sessionStorage حتى ينجو من تحديث الصفحة بعد انقطاع:
 *  - نفس الحمولة ← نفس المفتاح ← الخادم يعيد الطلب الأول بدل إنشاء طلب ثانٍ
 *  - حمولة مختلفة (عدّلت العنوان أو السلة) ← مفتاح جديد ← لا نصطدم بـ 409
 * يُمسح عند النجاح أو عند رفض نهائي من الخادم. صلاحيته عند الخادم 24 ساعة؛ نحن نكتفي بـ 12.
 */
const KEY = `gz_checkout_attempt:${import.meta.env.VITE_API_BASE_URL || '/api/v1'}`
const TTL_MS = 12 * 60 * 60 * 1000

interface Attempt { key: string; fingerprint: string; savedAt: number }

/** JSON بمفاتيح مرتبة — نفس البيانات تعطي نفس البصمة بغض النظر عن ترتيب الحقول */
export function fingerprintOf(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v as Record<string, unknown>).sort()
        .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
        .map((k) => [k, sort((v as Record<string, unknown>)[k])]))
    }
    return v
  }
  return JSON.stringify(sort(value))
}

function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // احتياط للمتصفحات القديمة (randomUUID يتطلب سياقاً آمناً)
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function load(): Attempt | null {
  try {
    const a = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Attempt | null
    return a?.key && Date.now() - a.savedAt < TTL_MS ? a : null
  } catch { return null }
}

/** يعيد المفتاح المحفوظ إن تطابقت الحمولة، وإلا يولّد مفتاحاً جديداً ويحفظه قبل الإرسال */
export function idempotencyKeyFor(payload: unknown): string {
  const fingerprint = fingerprintOf(payload)
  const current = load()
  if (current && current.fingerprint === fingerprint) return current.key
  const next: Attempt = { key: newKey(), fingerprint, savedAt: Date.now() }
  try { sessionStorage.setItem(KEY, JSON.stringify(next)) } catch { /* تخزين غير متاح — المفتاح يبقى صالحاً لهذه المحاولة */ }
  return next.key
}

export function clearCheckoutAttempt(): void {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}

/** رمز الخطأ من جسم الرد — يدعم { error: { code } } و { code } */
export function apiErrorCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { code?: unknown; error?: { code?: unknown } } } })?.response?.data
  const code = data?.error?.code ?? data?.code
  return typeof code === 'string' ? code : undefined
}

export type CheckoutFailure =
  /** لا نعرف إن وصل الطلب: انقطاع · مهلة · 5xx · الطلب الأول ما زال قيد التنفيذ — إعادة المحاولة بنفس المفتاح آمنة */
  | 'uncertain'
  /** المفتاح استُخدم لبيانات مختلفة — نمسحه، والمحاولة التالية تأخذ مفتاحاً جديداً */
  | 'key_reused'
  /** رفض نهائي (تحقق · مخزون · سعر …) — نمسح المفتاح ونعرض الرسالة */
  | 'rejected'
  /** جلسة منتهية أو تجاوز حد الطلبات — نحتفظ بالمفتاح */
  | 'transient'

export function classifyCheckoutError(error: unknown): CheckoutFailure {
  const status = (error as { response?: { status?: number } })?.response?.status
  const code = apiErrorCode(error)?.toUpperCase()
  if (!status || status >= 500 || status === 408) return 'uncertain'
  if (status === 401 || status === 429) return 'transient'
  if (status === 409 && code && /IN_PROGRESS|PROCESSING|CONCURRENT/.test(code)) return 'uncertain'
  if (status === 409 && code && /IDEMPOTENCY|KEY_REUSED|KEY_MISMATCH/.test(code)) return 'key_reused'
  return 'rejected'
}
