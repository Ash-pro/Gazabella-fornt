import { gazabellaApi } from '../api/gazabella'
import { queryClient } from './queryClient'

/**
 * تحميل مسبق عند «نية» المستخدمة فقط (لمس/مرور/تركيز) — لا عند الظهور في الشاشة،
 * حتى لا نستهلك باقة الإنترنت على منتجات لن تُفتح. يُتجاهل عند تفعيل «توفير البيانات».
 */
const saveData = () => Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
const requested = new Set<string>()

let detailChunk: Promise<unknown> | null = null
let checkoutChunk: Promise<unknown> | null = null

export function prefetchProduct(slug: string | null | undefined): void {
  if (!slug || requested.has(slug) || saveData()) return
  requested.add(slug)
  detailChunk ??= import('../pages/ProductDetailPage').catch(() => { detailChunk = null })
  void queryClient.prefetchQuery({ queryKey: ['product', slug], queryFn: () => gazabellaApi.getProduct(slug), staleTime: 60_000 })
}

/** حزمة صفحة الدفع (أكبر حزمة بعد الأساسية) — تُجلب حين تفتح المستخدمة السلة */
export function prefetchCheckout(): void {
  if (saveData()) return
  checkoutChunk ??= import('../pages/CheckoutPage').catch(() => { checkoutChunk = null })
}
