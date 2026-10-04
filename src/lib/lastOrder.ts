import type { Order } from '../types/api'

/**
 * آخر طلب أُنشئ في هذه الجلسة — حتى تبقى صفحة الشكر تعمل بعد التحديث أو الرجوع،
 * وحتى نعبّئ رقم الجوال تلقائياً عند تسجيل الدخول لمتابعة الطلب.
 * sessionStorage: يُمسح بإغلاق التبويب، ولا يُرسل لأي خادم.
 */
const KEY = 'gz_last_order'
const TTL_MS = 6 * 60 * 60 * 1000

export interface LastOrder {
  order: Order
  phone: string
  savedAt: number
}

export function saveLastOrder(order: Order, phone: string) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ order, phone, savedAt: Date.now() } satisfies LastOrder)) } catch { /* تخزين غير متاح */ }
}

export function loadLastOrder(): LastOrder | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as LastOrder
    if (!data?.order?.order_number || Date.now() - data.savedAt > TTL_MS) return null
    return data
  } catch {
    return null
  }
}

export function updateLastOrder(order: Order) {
  const current = loadLastOrder()
  if (current && current.order.order_number === order.order_number) saveLastOrder(order, current.phone)
}

/** 0599123456 → 059•••3456 */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  return d.length >= 7 ? `${d.slice(0, 3)}•••${d.slice(-4)}` : phone
}
