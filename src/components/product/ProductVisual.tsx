import { t } from '../../i18n'
import { useState, type SyntheticEvent } from 'react'
import { getImageUrl } from '../../lib/apiClient'

/** الصورة التي تختلف نسبتها كثيراً عن إطارها (أفقية في إطار عمودي) تُعرض كاملة بدل قصّ المنتج */
function fitToFrame(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.naturalWidth || !img.clientWidth || !img.clientHeight) return
  const drift = Math.abs(Math.log((img.naturalWidth / img.naturalHeight) / (img.clientWidth / img.clientHeight)))
  img.classList.toggle('is-contain', drift > 0.25)
}

/** onStatus: يُبلَّغ بنجاح تحميل الصورة أو فشلها (أو غيابها) مع رابطها المحلول، ليقرر الأب ما يُتاح عليها (مثل التكبير) */
export function ProductVisual({ src, alt, className = '', priority = false, srcSet, sizes, onStatus }: { src: string | null; alt: string; productId?: number; className?: string; priority?: boolean; srcSet?: string; sizes?: string; onStatus?: (status: 'ok' | 'failed', url: string | null) => void }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolvedSrc = getImageUrl(src)
  if (!resolvedSrc || failedSrc === resolvedSrc) return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}><img className="image-placeholder__mark" src="/brand/symbol/logo-128.webp" alt="" width="56" height="56" loading="lazy" decoding="async" /><span>{t('الصورة غير متاحة')}</span></div>
  return <img
    src={resolvedSrc}
    srcSet={srcSet ? `${srcSet}, ${resolvedSrc} 1200w` : undefined}
    sizes={srcSet ? sizes : undefined}
    alt={alt}
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : 'auto'}
    decoding="async"
    onLoad={(e) => { fitToFrame(e); onStatus?.('ok', resolvedSrc) }}
    onError={() => { setFailedSrc(resolvedSrc); onStatus?.('failed', resolvedSrc) }}
    className={`h-full w-full object-cover ${className}`}
  />
}
