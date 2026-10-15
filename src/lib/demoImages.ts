import { demoFixtures } from './demo'

/**
 * صور العرض التجريبي — تظهر فقط لما VITE_DEMO_FIXTURES=true.
 * بتستبدل صور الـ placeholders اللي بيرجعها الـ API بصور حقيقية معبّرة (public/demo، رخصة Pexels).
 * لما يرفع عاصم الصور الحقيقية من Filament ونطفي الوضع التجريبي، هالطبقة بتوقف تلقائياً.
 * قبل الإطلاق: احذف public/demo (L-07).
 */
const PRODUCT_SLUGS = [
  'aurelia-brightening-serum', 'gaza-glow-eyeshadow-palette', 'velvet-rose-perfume-oil-50ml',
  'shea-butter-hand-nail-cream', 'rose-quartz-gua-sha-stone', 'bridal-veil-perfume-gift-set',
  'rosewater-facial-toner', 'silk-setting-powder', 'aurora-eau-de-parfum', 'bamboo-makeup-brush-set-12pc',
  'gazabella-bridal-gift-box', 'hyaluronic-acid-serum', 'volumizing-mascara-waterproof',
  'amber-musk-solid-perfume', 'precision-brow-definer-duo',
] as const
const CATEGORY_SLUGS = ['beauty-tools', 'natural-care', 'bride', 'makeup', 'perfumes', 'skincare'] as const
const BANNER_IMAGES: Record<string, string> = { hero: 'banners/hero', promo: 'banners/promo' }
const COLLECTION_IMAGES: Record<string, string> = { 'the-everyday-edit': 'collections/everyday-edit' }

const productSet = new Set<string>(PRODUCT_SLUGS)
const categorySet = new Set<string>(CATEGORY_SLUGS)

/** مسار نسبي من نفس الموقع — getImageUrl يتركه كما هو (لا يُلصق عليه STORAGE_URL) */
export const DEMO_ASSET_PREFIX = '/demo/'
export const demoAsset = (path: string): string => `${DEMO_ASSET_PREFIX}${path}.webp`

export const demoProductImages = (slug: string): string[] | null =>
  productSet.has(slug) ? [demoAsset(`products/${slug}-1`), demoAsset(`products/${slug}-2`)] : null

export const demoCategoryImage = (slug: string): string | null =>
  categorySet.has(slug) ? demoAsset(`categories/${slug}`) : null

export const demoGuideCover = (slug: string): string => demoAsset(`guides/${slug}`)

type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const has = (o: Json, k: string) => Object.prototype.hasOwnProperty.call(o, k)

function patchProduct(o: Json, urls: string[]): void {
  const prev = Array.isArray(o.images) ? (o.images as Json[]) : []
  if (has(o, 'images') || !has(o, 'thumbnail_url')) {
    o.images = urls.map((url, i) => ({
      ...(isObj(prev[i]) ? prev[i] : {}),
      url, thumb_url: null, medium_url: null, is_primary: i === 0, sort_order: i,
      alt_text: (isObj(prev[i]) && prev[i].alt_text) || (typeof o.name === 'string' ? o.name : null),
    }))
  }
  if (has(o, 'thumbnail_url')) o.thumbnail_url = urls[0]
  if (has(o, 'image_url')) o.image_url = urls[0]
  if (has(o, 'image')) o.image = urls[0]
}

function walk(node: unknown, depth: number): void {
  if (depth > 8) return
  if (Array.isArray(node)) { node.forEach(n => walk(n, depth + 1)); return }
  if (!isObj(node)) return
  const slug = typeof node.slug === 'string' ? node.slug : null
  const looksLikeProduct = has(node, 'price') || has(node, 'sku') || has(node, 'images') || has(node, 'variants')
  if (slug && looksLikeProduct) {
    const urls = demoProductImages(slug)
    if (urls) patchProduct(node, urls)
  } else if (slug && (has(node, 'image_url') || COLLECTION_IMAGES[slug])) {
    const url = demoCategoryImage(slug) ?? (COLLECTION_IMAGES[slug] ? demoAsset(COLLECTION_IMAGES[slug]) : null)
    if (url) node.image_url = url
  } else if (typeof node.type === 'string' && BANNER_IMAGES[node.type] && has(node, 'image_url') && has(node, 'title')) {
    node.image_url = demoAsset(BANNER_IMAGES[node.type])
  }
  // عناصر السلة/الطلب: { product_slug, image_url } أو { product: {...} }
  const lineSlug = typeof node.product_slug === 'string' ? node.product_slug
    : isObj(node.product) && typeof node.product.slug === 'string' ? node.product.slug : null
  if (lineSlug && !slug && has(node, 'image_url')) {
    const urls = demoProductImages(lineSlug)
    if (urls) node.image_url = urls[0]
  }
  for (const key in node) {
    const v = node[key]
    if (typeof v === 'object' && v !== null) walk(v, depth + 1)
  }
}

/** يُستدعى من response interceptor — لا يعمل شيئاً خارج الوضع التجريبي */
export function applyDemoImages<T>(data: T, enabled: boolean = demoFixtures()): T {
  if (enabled) walk(data, 0)
  return data
}
