import type { ProductBrief, ProductVariant } from '../types/api'

export function productPricing(product: Pick<ProductBrief, 'price' | 'discount_price'>, variant?: ProductVariant) {
  const current = variant ? Number(variant.price) : product.discount_price != null && Number.isFinite(Number(product.discount_price)) && Number(product.discount_price) >= 0 && Number(product.discount_price) < Number(product.price) ? Number(product.discount_price) : Number(product.price)
  const candidate = variant ? variant.compare_at_price : product.discount_price != null ? product.price : null
  const original = candidate != null && Number.isFinite(Number(candidate)) && Number(candidate) > current ? Number(candidate) : null
  return { current, original, percent: original ? Math.round((original - current) / original * 100) : 0 }
}
