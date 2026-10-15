/**
 * المرحلة 1 — واجهات صفحة المنتج الجديدة (عقد API: Docs/API_CONTRACT_PHASE1_AR.md).
 * كل دالة تعيد { data, demo } عبر withDemo: الـ API أولاً، والبيانات التجريبية فقط في وضع العرض.
 */
import { apiClient } from '../lib/apiClient'
import { withDemo, type Sourced } from '../lib/demo'
import { demoReviews } from '../fixtures/productExtras'
import type { ReviewsPage } from '../types/api'

export interface ReviewQuery { page?: number; rating?: number }

export function getReviews(product: { id: number; slug: string; image: string | null }, query: ReviewQuery = {}): Promise<Sourced<ReviewsPage>> {
  return withDemo(
    () => apiClient.get<ReviewsPage>(`/products/${encodeURIComponent(product.slug)}/reviews`, { params: { page: query.page ?? 1, per_page: 6, ...(query.rating ? { rating: query.rating } : {}) } }).then((r) => r.data),
    () => demoReviews(product.id, product.image, query.page ?? 1, query.rating),
  )
}

export interface NewReview { rating: number; title?: string; body: string; photos: Blob[]; variant_id?: number }

/** يتطلب تسجيل الدخول وشراءً مُسلَّماً للمنتج (403 NOT_PURCHASED)، ومراجعة واحدة لكل منتج (409 ALREADY_REVIEWED) */
export function createReview(slug: string, review: NewReview): Promise<Sourced<{ status: 'pending' | 'published' }>> {
  return withDemo(
    () => {
      const form = new FormData()
      form.append('rating', String(review.rating))
      if (review.title) form.append('title', review.title)
      form.append('body', review.body)
      if (review.variant_id) form.append('variant_id', String(review.variant_id))
      review.photos.forEach((p, i) => form.append('photos[]', p, `photo-${i + 1}.jpg`))
      return apiClient.post<{ data: { status: 'pending' | 'published' } }>(`/products/${encodeURIComponent(slug)}/reviews`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30_000 }).then((r) => r.data.data)
    },
    () => new Promise((resolve) => setTimeout(() => resolve({ status: 'pending' as const }), 600)),
  )
}

/** P1-4 «نبّهيني لما يتوفر» — مرة واحدة لكل رقم ومنتج؛ الإشعار عبر واتساب/SMS عند عودة المخزون */
export function createStockAlert(slug: string, body: { phone: string; variant_id?: number }): Promise<Sourced<{ subscribed: true }>> {
  return withDemo(
    () => apiClient.post<{ data: { subscribed: true } }>(`/products/${encodeURIComponent(slug)}/stock-alerts`, body).then((r) => r.data.data),
    () => new Promise((resolve) => setTimeout(() => resolve({ subscribed: true as const }), 500)),
  )
}
