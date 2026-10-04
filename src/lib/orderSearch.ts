import type { Order } from '../types/api'

/** مجموعات الفلترة في صفحة «طلباتي» — 4 مجموعات واضحة بدل 7 حالات تقنية */
export type OrderGroup = 'all' | 'active' | 'delivered' | 'cancelled'

export const ORDER_GROUPS: ReadonlyArray<{ key: OrderGroup; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'جارية' },
  { key: 'delivered', label: 'تم التسليم' },
  { key: 'cancelled', label: 'ملغاة' },
]

export function isOrderGroup(value: string | null): value is OrderGroup {
  return ORDER_GROUPS.some((g) => g.key === value)
}

export function orderGroup(status?: string | null): Exclude<OrderGroup, 'all'> {
  if (status === 'delivered') return 'delivered'
  if (status === 'cancelled' || status === 'refunded') return 'cancelled'
  return 'active'
}

/** مراحل الطلب كما يراها العميل (D-21) */
export const ORDER_STEPS = [
  { status: 'pending', label: 'استلمنا الطلب' },
  { status: 'confirmed', label: 'تم التأكيد' },
  { status: 'processing', label: 'قيد التجهيز' },
  { status: 'shipped', label: 'خرج للتوصيل' },
  { status: 'delivered', label: 'تم التسليم' },
] as const

/** رقم المرحلة الحالية (0..4)، أو -1 للطلبات الملغاة/المستردة */
export function orderStepIndex(status?: string | null): number {
  if (orderGroup(status) === 'cancelled') return -1
  const index = ORDER_STEPS.findIndex((s) => s.status === status)
  return index < 0 ? 0 : index
}

/** توحيد النص العربي للبحث: أرقام هندية، تشكيل، همزات، ى/ي، ة/ه، حالة الأحرف */
export function normalizeSearch(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function haystack(order: Order): string {
  const number = normalizeSearch(order.order_number)
  return [
    number,
    number.replace(/[^a-z0-9]/g, ''),
    ...order.items.flatMap((item) => [item.product_name, item.variant_name]),
  ].map(normalizeSearch).join(' | ')
}

/** يطابق رقم الطلب (مع أو بدون الشرطات) أو أي منتج فيه؛ كل كلمة في البحث يجب أن توجد */
export function orderMatches(order: Order, query: string): boolean {
  const tokens = normalizeSearch(query).split(' ').filter(Boolean)
  if (!tokens.length) return true
  const text = haystack(order)
  return tokens.every((token) => text.includes(token) || text.includes(token.replace(/[^a-z0-9]/g, '') || '\u0000'))
}

export interface OrdersSummary { count: number; active: number; delivered: number; spent: number }

export function summarizeOrders(orders: Order[]): OrdersSummary {
  return orders.reduce<OrdersSummary>((acc, order) => {
    const group = orderGroup(order.status)
    acc.count += 1
    if (group === 'active') acc.active += 1
    if (group === 'delivered') acc.delivered += 1
    if (group !== 'cancelled') acc.spent += Number(order.total) || 0
    return acc
  }, { count: 0, active: 0, delivered: 0, spent: 0 })
}

export function countByGroup(orders: Order[]): Record<OrderGroup, number> {
  const counts: Record<OrderGroup, number> = { all: orders.length, active: 0, delivered: 0, cancelled: 0 }
  for (const order of orders) counts[orderGroup(order.status)] += 1
  return counts
}
