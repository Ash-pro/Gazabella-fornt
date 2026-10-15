import type { Order } from '../types/api'

/** منتجات قيّمتها المستخدمة من هذا الجهاز — لإخفاء طلب التقييم فوراً حتى يرسل الخادم reviewed=true */
const KEY = 'gz_reviewed_v1'
export function markReviewed(slug: string): void {
  try { const s = new Set(readReviewed()); s.add(slug); localStorage.setItem(KEY, JSON.stringify([...s].slice(-200))) } catch { /* ignore */ }
}
export function readReviewed(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] }
}

type Item = Order['items'][number]

/** عناصر الطلبات المُسلَّمة التي لم تُقيَّم بعد (لها slug) — بدون تكرار نفس المنتج */
export function pendingReviews(orders: Order[], limit = 6): Item[] {
  const done = new Set(readReviewed())
  const seen = new Set<string>()
  const out: Item[] = []
  for (const o of orders) {
    if (o.status !== 'delivered') continue
    for (const i of o.items) {
      if (!i.product_slug || i.reviewed || done.has(i.product_slug) || seen.has(i.product_slug)) continue
      seen.add(i.product_slug); out.push(i)
      if (out.length >= limit) return out
    }
  }
  return out
}
