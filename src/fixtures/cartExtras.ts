/**
 * بيانات العرض التجريبي للمرحلة 2 (R-1) — كوبونات ودفتر عناوين محليان، لا يُستخدمان إلا عند demoFixtures().
 * الخصم هنا للعرض فقط: الطلب الفعلي يُحسب على الخادم دائماً.
 */
import type { Cart, CustomerAddress, CustomerAddressInput } from '../types/api'

export const DEMO_FREE_DELIVERY_THRESHOLD = 150

export const DEMO_COUPONS: Record<string, { percent?: number; amount?: number; min?: number; description: string }> = {
  GAZA10: { percent: 10, description: 'خصم 10% على المنتجات' },
  WELCOME15: { amount: 15, min: 100, description: 'خصم 15 ₪ للطلبات من 100 ₪' },
}

const COUPON_KEY = 'gz_demo_coupon'
const read = (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } }

/** خطأ بشكل رد الخادم نفسه حتى تعرضه الواجهة بالمنطق ذاته */
export function demoCouponError(code: 'COUPON_INVALID' | 'COUPON_MIN_SUBTOTAL', min?: number) {
  return Object.assign(new Error(code), { response: { status: 422, data: { error: { code, message: code, ...(min ? { details: { min_subtotal: min } } : {}) } } } })
}

export function demoApplyCoupon(code: string, subtotal: number): void {
  const c = DEMO_COUPONS[code.trim().toUpperCase()]
  if (!c) throw demoCouponError('COUPON_INVALID')
  if (c.min && subtotal < c.min) throw demoCouponError('COUPON_MIN_SUBTOTAL', c.min)
  try { sessionStorage.setItem(COUPON_KEY, code.trim().toUpperCase()) } catch { /* ignore */ }
}

export function demoRemoveCoupon(): void {
  try { sessionStorage.removeItem(COUPON_KEY) } catch { /* ignore */ }
}

/** يضيف الكوبون التجريبي إلى سلة لا تحمل كوبوناً حقيقياً */
export function withDemoCoupon(cart: Cart): Cart {
  if (cart.coupon) return cart
  const code = read(COUPON_KEY)
  const c = code ? DEMO_COUPONS[code] : null
  const subtotal = Number(cart.subtotal) || 0
  if (!c || !cart.items.length || (c.min && subtotal < c.min)) return cart
  const discount = Math.min(subtotal, c.percent ? Math.round(subtotal * c.percent) / 100 : c.amount ?? 0)
  return { ...cart, coupon: { code: code!, discount: discount.toFixed(2), description: c.description, demo: true }, discount: discount.toFixed(2), total: (subtotal - discount).toFixed(2) }
}

// ── دفتر العناوين التجريبي (على الجهاز) ──
const BOOK_KEY = 'gz_demo_addresses'
export function demoAddresses(): CustomerAddress[] {
  try { return JSON.parse(localStorage.getItem(BOOK_KEY) || '[]') as CustomerAddress[] } catch { return [] }
}
function saveBook(list: CustomerAddress[]) { try { localStorage.setItem(BOOK_KEY, JSON.stringify(list)) } catch { /* ignore */ } }
export function demoSaveAddress(input: CustomerAddressInput, id?: number): CustomerAddress {
  let list = demoAddresses()
  const entry: CustomerAddress = { ...input, id: id ?? Math.max(0, ...list.map((a) => a.id)) + 1, is_default: input.is_default || list.length === 0 }
  if (entry.is_default) list = list.map((a) => ({ ...a, is_default: false }))
  list = id ? list.map((a) => (a.id === id ? entry : a)) : [...list, entry]
  saveBook(list)
  return entry
}
export function demoDeleteAddress(id: number): void {
  const list = demoAddresses().filter((a) => a.id !== id)
  if (list.length && !list.some((a) => a.is_default)) list[0].is_default = true
  saveBook(list)
}
