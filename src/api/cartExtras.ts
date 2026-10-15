/**
 * المرحلة 2 — السلة والدفع (عقد API: Docs/API_CONTRACT_PHASE2_AR.md).
 */
import { gazabellaApi, normalizeCart, isMockMode } from './gazabella'
import { apiClient } from '../lib/apiClient'
import { demoFixtures, isMissingEndpoint, withDemo, type Sourced } from '../lib/demo'
import { demoAddresses, demoApplyCoupon, demoDeleteAddress, demoRemoveCoupon, demoSaveAddress } from '../fixtures/cartExtras'
import type { Cart, CustomerAddress, CustomerAddressInput, ProductBrief } from '../types/api'

type RawCartResponse = Parameters<typeof normalizeCart>[0]

/** P2-2 تطبيق كوبون: الخادم يتحقق ويعيد السلة بالخصم */
export function applyCoupon(code: string, subtotal: number): Promise<Sourced<Cart>> {
  return withDemo(
    () => apiClient.post<{ data: RawCartResponse }>('/cart/coupon', { code: code.trim() }).then((r) => normalizeCart(r.data.data)),
    async () => { demoApplyCoupon(code, subtotal); return gazabellaApi.getCart() },
  )
}

export function removeCoupon(): Promise<Sourced<Cart>> {
  return withDemo(
    () => apiClient.delete<{ data: RawCartResponse }>('/cart/coupon').then((r) => normalizeCart(r.data.data)),
    async () => { demoRemoveCoupon(); return gazabellaApi.getCart() },
  )
}

/**
 * P2-3 «أضيفي معه»: توصيات الخادم أولاً؛ إن لم يوجد المسار نعرض منتجات مميّزة متوفرة غير موجودة في السلة
 * — منتجات حقيقية وليست بيانات تجريبية، لذا تعمل على الإنتاج أيضاً.
 */
export async function getCartSuggestions(cart: Cart, limit = 6): Promise<ProductBrief[]> {
  const inCart = new Set(cart.items.map((i) => i.product_id))
  const keep = (list: ProductBrief[]) => list.filter((p) => !inCart.has(p.id) && p.in_stock !== false).slice(0, limit)
  if (!isMockMode()) {
    try {
      return keep((await apiClient.get<{ data: ProductBrief[] }>('/cart/suggestions', { params: { limit } })).data.data ?? [])
    } catch (error) {
      if (!isMissingEndpoint(error)) throw error
    }
  }
  return keep((await gazabellaApi.getProducts({ featured: true, in_stock: true, per_page: limit + cart.items.length })).data)
}

// ── P2-4 دفتر العناوين (يتطلب تسجيل الدخول) ──
export function listAddresses(): Promise<Sourced<CustomerAddress[]>> {
  return withDemo(() => apiClient.get<{ data: CustomerAddress[] }>('/addresses').then((r) => r.data.data ?? []), () => demoAddresses())
}

export function saveAddress(input: CustomerAddressInput, id?: number): Promise<Sourced<CustomerAddress>> {
  return withDemo(
    () => (id ? apiClient.patch<{ data: CustomerAddress }>(`/addresses/${id}`, input) : apiClient.post<{ data: CustomerAddress }>('/addresses', input)).then((r) => r.data.data),
    () => demoSaveAddress(input, id),
  )
}

export function deleteAddress(id: number): Promise<Sourced<null>> {
  return withDemo(() => apiClient.delete(`/addresses/${id}`).then(() => null), () => { demoDeleteAddress(id); return null })
}

/** هل نعرض دفتر العناوين؟ (مسار موجود أو وضع العرض) */
export const addressBookEnabled = (): boolean => demoFixtures() || import.meta.env.VITE_ADDRESS_BOOK === 'true'

/** الكوبونات متاحة؟ (مسار جاهز في الخادم أو وضع العرض) */
export const couponsEnabled = (): boolean => demoFixtures() || import.meta.env.VITE_COUPONS === 'true'
