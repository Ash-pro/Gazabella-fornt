/**
 * المرحلة 4 — الولاء والمحتوى (عقد API: Docs/API_CONTRACT_PHASE4_AR.md).
 */
import { gazabellaApi } from './gazabella'
import { apiClient } from '../lib/apiClient'
import { demoFixtures, withDemo, type Sourced } from '../lib/demo'
import { DEMO_GUIDES } from '../fixtures/guides'
import type { Guide, GuideSummary, ProductBrief, SharedWishlist } from '../types/api'

const notFound = () => Object.assign(new Error('not found'), { response: { status: 404 } })

// ── P4-2 أدلة الجمال ──
export function getGuides(): Promise<Sourced<GuideSummary[]>> {
  return withDemo(() => apiClient.get<{ data: GuideSummary[] }>('/guides').then((r) => r.data.data ?? []), () => DEMO_GUIDES.map(({ blocks: _b, ...g }) => g))
}

export function getGuide(slug: string): Promise<Sourced<Guide>> {
  return withDemo(() => apiClient.get<{ data: Guide }>(`/guides/${encodeURIComponent(slug)}`).then((r) => r.data.data), () => {
    const g = DEMO_GUIDES.find((x) => x.slug === slug)
    if (!g) throw notFound()
    return g
  })
}

/** الأدلة متاحة؟ (مسار جاهز أو وضع العرض) */
export const guidesEnabled = (): boolean => demoFixtures() || import.meta.env.VITE_GUIDES === 'true'

// ── P4-3 مشاركة المفضلة ──
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

/** ينشئ رابط قراءة فقط لقائمة المفضلة. في وضع العرض: الرمز يحمل slugs المنتجات نفسها */
export function createWishlistShare(items: ProductBrief[]): Promise<Sourced<{ token: string; url: string }>> {
  const url = (token: string) => `${window.location.origin}/w/${token}`
  return withDemo(
    () => apiClient.post<{ data: { token: string } }>('/wishlist/share').then((r) => ({ token: r.data.data.token, url: url(r.data.data.token) })),
    () => { const token = `demo-${b64(items.slice(0, 12).map((p) => p.slug).join(','))}`; return { token, url: url(token) } },
  )
}

export async function getSharedWishlist(token: string): Promise<Sourced<SharedWishlist>> {
  if (token.startsWith('demo-')) {
    if (!demoFixtures()) throw notFound()
    const raw = token.slice(5)
    if (raw === 'sample') {
      const items = (await gazabellaApi.getProducts({ featured: true, per_page: 6 })).data
      return { data: { token, owner_name: 'سارة', items, created_at: new Date().toISOString() }, demo: true }
    }
    let slugs: string[] = []
    try { slugs = unb64(raw).split(',').filter(Boolean).slice(0, 12) } catch { throw notFound() }
    const items = (await Promise.all(slugs.map((s) => gazabellaApi.getProduct(s).catch(() => null)))).filter((p): p is NonNullable<typeof p> => !!p)
    return { data: { token, owner_name: 'صديقتكِ', items: items as unknown as ProductBrief[], created_at: new Date().toISOString() }, demo: true }
  }
  return { data: (await apiClient.get<{ data: SharedWishlist }>(`/wishlist/shared/${encodeURIComponent(token)}`)).data.data, demo: false }
}

export const wishlistShareEnabled = (): boolean => demoFixtures() || import.meta.env.VITE_WISHLIST_SHARE === 'true'
