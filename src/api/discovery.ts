/**
 * المرحلة 3 — الاكتشاف (عقد API: Docs/API_CONTRACT_PHASE3_AR.md).
 */
import { gazabellaApi, isMockMode } from './gazabella'
import { apiClient } from '../lib/apiClient'
import { demoFixtures, isMissingEndpoint, type Sourced } from '../lib/demo'
import { DEMO_BRANDS, isDemoBrand } from '../fixtures/discovery'
import type { ApiList, Brand, Category, ProductBrief } from '../types/api'

/** الماركات الحقيقية، وفي وضع العرض تُكمَّل بماركات توضيحية حتى يظهر الشكل الكامل */
export async function getBrandsList(): Promise<Sourced<Brand[]>> {
  const real = await gazabellaApi.getBrands().catch((e) => { if (demoFixtures()) return [] as Brand[]; throw e })
  if (!demoFixtures() || real.length >= 6) return { data: real, demo: false }
  return { data: [...real, ...DEMO_BRANDS.filter((d) => !real.some((r) => r.slug === d.slug))].slice(0, 8), demo: true }
}

export async function getBrand(slug: string): Promise<Sourced<Brand>> {
  if (isDemoBrand(slug)) {
    const b = DEMO_BRANDS.find((x) => x.slug === slug)
    if (b && demoFixtures()) return { data: b, demo: true }
    throw Object.assign(new Error('not found'), { response: { status: 404 } })
  }
  if (isMockMode()) {
    const b = (await gazabellaApi.getBrands()).find((x) => x.slug === slug)
    if (!b) throw Object.assign(new Error('not found'), { response: { status: 404 } })
    return { data: b, demo: false }
  }
  return { data: (await apiClient.get<{ data: Brand }>(`/brands/${encodeURIComponent(slug)}`)).data.data, demo: false }
}

/**
 * منتجات الماركة: فلتر brand_id في الخادم. في وضع العرض فقط: إن لم تُربط المنتجات بماركات بعد
 * نعرض منتجات مميّزة كمثال موسوم «عرض تجريبي».
 */
export async function getBrandProducts(brand: Brand, page = 1): Promise<Sourced<ApiList<ProductBrief>>> {
  if (!isDemoBrand(brand.slug)) {
    const res = await gazabellaApi.getProducts({ brand_id: brand.id, page, per_page: 24 })
    if (res.data.length || !demoFixtures()) return { data: res, demo: false }
  }
  return { data: await gazabellaApi.getProducts({ featured: true, page, per_page: 12 }), demo: true }
}

/**
 * P3-3 عمليات البحث الشائعة: من الخادم، وإن لم يوجد المسار نقترح أسماء الأقسام الحقيقية (ليست بيانات تجريبية).
 */
export async function getPopularSearches(categories: Category[]): Promise<string[]> {
  if (!isMockMode()) {
    try {
      const terms = (await apiClient.get<{ data: string[] }>('/search/popular', { params: { limit: 8 } })).data.data ?? []
      return terms.filter((s) => typeof s === 'string' && s.trim()).slice(0, 8)
    } catch (error) {
      if (!isMissingEndpoint(error)) return []
    }
  }
  return categories.map((c) => c.name).filter(Boolean).slice(0, 6)
}
