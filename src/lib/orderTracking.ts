import type { Order } from '../types/api'

/** ما يراه الضيف في صفحة التتبع — عرض محدود بلا عنوان ولا اسم ولا رمز استلام */
export interface TrackedOrder {
  order_number: string
  status: string
  payment_method?: string | null
  payment_status?: string | null
  created_at: string
  zone?: string | null
  eta_minutes?: number | null
  items: Array<{ product_name: string; quantity: number; subtotal: string; image_url: string | null }>
  items_count: number
  subtotal: string
  delivery_fee: string
  total: string
  tracking: Array<{ status: string; label?: string | null; note: string | null; created_at: string }>
  /** true = لقطة محفوظة على هذا الجهاز وليست رداً حياً من الخادم */
  local?: boolean
}

/** gz 261005 f98n4t → GZ-261005-F98N4T (نقبل المسافات والأحرف الصغيرة والأرقام الهندية) */
export function cleanOrderNumber(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim().toUpperCase().replace(/[\s_]+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/-{2,}/g, '-')
}

export function phoneDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '')
}

/** آخر 9 أرقام — تجعل 0598…/970598…/+970598… متساوية */
export function samePhone(a: string, b: string): boolean {
  const x = phoneDigits(a).slice(-9)
  return x.length === 9 && x === phoneDigits(b).slice(-9)
}

export function isTrackablePhone(value: string): boolean {
  const d = phoneDigits(value)
  return d.length >= 9 && d.length <= 14
}

export function trackedFromOrder(order: Order, local = false): TrackedOrder {
  return {
    order_number: order.order_number,
    status: order.status,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    created_at: order.created_at,
    items: order.items.map((i) => ({ product_name: i.product_name, quantity: i.quantity, subtotal: i.subtotal, image_url: i.image_url })),
    items_count: order.items_count ?? order.items.length,
    subtotal: order.subtotal,
    delivery_fee: order.delivery_fee,
    total: order.total,
    tracking: order.tracking ?? [],
    local,
  }
}

type Raw = Record<string, unknown>
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : fallback)

/** رد POST /orders/track — متسامح مع الحقول الناقصة حتى لا تنهار الصفحة */
export function trackedFromResponse(raw: Raw): TrackedOrder {
  const items = Array.isArray(raw.items) ? (raw.items as Raw[]) : []
  const zone = (raw.delivery_zone ?? null) as Raw | null
  const tracking = Array.isArray(raw.tracking) ? (raw.tracking as Raw[]) : []
  return {
    order_number: str(raw.order_number),
    status: str(raw.status, 'pending'),
    payment_method: str(raw.payment_method) || null,
    payment_status: str(raw.payment_status) || null,
    created_at: str(raw.created_at),
    zone: zone ? str(zone.name) || null : null,
    eta_minutes: zone && typeof zone.eta_minutes === 'number' ? zone.eta_minutes : null,
    items: items.map((i) => {
      const product = (i.product ?? {}) as Raw
      return { product_name: str(i.product_name) || str(product.name), quantity: Number(i.quantity) || 1, subtotal: str(i.subtotal ?? i.line_total, '0'), image_url: str(i.image_url) || null }
    }),
    items_count: Number(raw.items_count) || items.length,
    subtotal: str(raw.subtotal, '0'),
    delivery_fee: str(raw.delivery_fee, '0'),
    total: str(raw.total, '0'),
    tracking: tracking.map((s) => ({ status: str(s.status), label: str(s.label) || null, note: str(s.note) || null, created_at: str(s.created_at) })),
  }
}

/**
 * آخر نتيجة تتبع ناجحة في هذا التبويب — حتى لا تختفي الحالة عند تحديث الصفحة
 * أو عند رفض الخادم مؤقتاً (حد المحاولات). sessionStorage: يُمسح بإغلاق التبويب.
 */
const TRACKED_KEY = 'gz_tracked'
const TRACKED_TTL_MS = 6 * 60 * 60 * 1000

export function saveTracked(order: TrackedOrder, phone: string) {
  try { sessionStorage.setItem(TRACKED_KEY, JSON.stringify({ order, phone, savedAt: Date.now() })) } catch { /* تخزين غير متاح */ }
}

export function loadTracked(orderNumber?: string): { order: TrackedOrder; phone: string } | null {
  try {
    const raw = sessionStorage.getItem(TRACKED_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { order: TrackedOrder; phone: string; savedAt: number }
    if (!data?.order?.order_number || !data.phone || Date.now() - data.savedAt > TRACKED_TTL_MS) return null
    if (orderNumber && data.order.order_number.toUpperCase() !== orderNumber.toUpperCase()) return null
    return { order: { ...data.order, local: true }, phone: data.phone }
  } catch {
    return null
  }
}
