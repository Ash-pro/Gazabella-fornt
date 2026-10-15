import { getImageUrl } from './apiClient'
import type { ProductImage } from '../types/api'

/**
 * srcset من مقاسات الخادم إن وُجدت (thumb_url ‎400w‎ · medium_url ‎800w‎) — عقد مقترح على الباك اند.
 * بدونها يبقى الرابط الأصلي وحده (السلوك الحالي).
 */
export function imageSrcSet(image: Pick<ProductImage, 'thumb_url' | 'medium_url'> | null | undefined): string | undefined {
  const parts = [
    image?.thumb_url ? `${getImageUrl(image.thumb_url)} 400w` : null,
    image?.medium_url ? `${getImageUrl(image.medium_url)} 800w` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}
