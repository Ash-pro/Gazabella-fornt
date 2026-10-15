import type { ProductBrief, ProductDetail } from '../types/api'

/**
 * N-05 «شاهدتِ مؤخراً» — على الجهاز فقط (لا يُرسل للخادم)، آخر 12 منتجاً، ويُمسح عند تسجيل الخروج.
 * نحفظ نسخة مختصرة تكفي لبطاقة المنتج؛ الأسعار تُعرض كما كانت وقت المشاهدة وتتحدث عند فتح المنتج.
 */
const KEY = `gz_recent_v1:${import.meta.env.VITE_API_BASE_URL || '/api/v1'}`
const MAX = 12
const TTL_MS = 30 * 24 * 60 * 60 * 1000

type Entry = { at: number; product: ProductBrief }

function read(): Entry[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]') as Entry[]
    const now = Date.now()
    return Array.isArray(list) ? list.filter((e) => e?.product?.slug && now - e.at < TTL_MS) : []
  } catch { return [] }
}

export function recordViewed(product: ProductDetail): void {
  const brief: ProductBrief = {
    id: product.id, name: product.name, slug: product.slug, price: product.price, discount_price: product.discount_price,
    in_stock: product.in_stock, stock: product.stock, images: (product.images ?? []).slice(0, 1),
    category: { id: product.category?.id ?? 0, name: product.category?.name ?? '' },
  }
  const next = [{ at: Date.now(), product: brief }, ...read().filter((e) => e.product.id !== product.id)].slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* تخزين غير متاح */ }
}

/** المنتجات بالأحدث أولاً، مع استثناء منتج (الصفحة الحالية) */
export function readViewed(exceptId?: number): ProductBrief[] {
  return read().map((e) => e.product).filter((p) => p.id !== exceptId)
}

export function clearViewed(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
