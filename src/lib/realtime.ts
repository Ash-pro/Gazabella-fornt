/**
 * P1-FE-04 · G-03 · C-P1-03 — عقد البث الموحد (قناة + أحداث + مصادقة).
 * القناة: private-App.Models.User.{id}
 * الأحداث: .order.status.updated · .cart.reservation.updated
 * المصادقة: POST {API_ORIGIN}/broadcasting/auth بـ Bearer (Sanctum)
 */
export const userChannel = (userId: number | string) => `App.Models.User.${userId}`

export const REALTIME_EVENTS = {
  orderStatus: '.order.status.updated',
  cartReservation: '.cart.reservation.updated',
} as const

/** حمولة الحدث حسب C-P1-03 — أربعة حقول فقط، بلا أي بيانات متجر */
export type OrderStatusEvent = {
  order_number?: string
  status?: string
  status_label?: string
  updated_at?: string
}

/**
 * عنوان مصادقة القنوات الخاصة: خارج /api/v1 على نفس أصل الـ API.
 * يمكن تجاوزه بـ VITE_BROADCAST_AUTH_URL إن اختلف الخادم.
 */
export function broadcastAuthUrl(apiBase?: string, override?: string, fallbackOrigin?: string): string {
  if (override) return override
  const base = apiBase || '/api/v1'
  const origin = /^https?:\/\//.test(base) ? new URL(base).origin : (fallbackOrigin ?? '')
  return origin + '/broadcasting/auth'
}

/** مفاتيح React Query التي يجب تحديثها عند تغيّر حالة طلب */
export function orderEventQueryKeys(event: OrderStatusEvent | null | undefined): string[][] {
  const keys: string[][] = [['orders']]
  if (event?.order_number) keys.push(['order', event.order_number])
  else keys.push(['order'])
  return keys
}
