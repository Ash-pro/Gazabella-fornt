const isMockMode = (): boolean => import.meta.env.VITE_DATA_SOURCE === 'mock'

/**
 * R-1 وضع العرض التجريبي: يملأ الميزات التي لا API لها بعد ببيانات تجريبية واضحة الوسم.
 * يُفعَّل بـ VITE_DEMO_FIXTURES=true (Staging/المعاينات) أو تلقائياً في وضع mock. ممنوع في الإنتاج عند الإطلاق.
 */
export const demoFixtures = (): boolean => import.meta.env.VITE_DEMO_FIXTURES === 'true' || isMockMode()

/** المسار غير موجود بعد في الباك اند (أو غير مسموح بالطريقة) */
export function isMissingEndpoint(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status === 404 || status === 405 || status === 501
}

export interface Sourced<T> { data: T; demo: boolean }

/**
 * يجرب الـ API أولاً؛ في وضع العرض فقط: إن لم يوجد المسار (أو في وضع mock) يعيد البيانات التجريبية موسومة demo=true.
 * خارج وضع العرض: الخطأ يصعد كما هو والواجهة تخفي القسم.
 */
export async function withDemo<T>(call: () => Promise<T>, fixture: () => T | Promise<T>): Promise<Sourced<T>> {
  if (isMockMode()) return { data: await fixture(), demo: true }
  try {
    return { data: await call(), demo: false }
  } catch (error) {
    if (demoFixtures() && isMissingEndpoint(error)) return { data: await fixture(), demo: true }
    throw error
  }
}
