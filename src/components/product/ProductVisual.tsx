import { t } from '../../i18n'
import { useState } from 'react'
import { getImageUrl } from '../../lib/apiClient'

/** onStatus: يُبلَّغ بنجاح تحميل الصورة أو فشلها (أو غيابها) مع رابطها المحلول، ليقرر الأب ما يُتاح عليها (مثل التكبير) */
export function ProductVisual({ src, alt, className = '', priority = false, onStatus }: { src: string | null; alt: string; productId?: number; className?: string; priority?: boolean; onStatus?: (status: 'ok' | 'failed', url: string | null) => void }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolvedSrc = getImageUrl(src)
  if (!resolvedSrc || failedSrc === resolvedSrc) return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}><img className="image-placeholder__mark" src="/brand/symbol/logo-128.webp" alt="" width="56" height="56" loading="lazy" decoding="async" /><span>{t('الصورة غير متاحة')}</span></div>
  return <img src={resolvedSrc} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onLoad={() => onStatus?.('ok', resolvedSrc)} onError={() => { setFailedSrc(resolvedSrc); onStatus?.('failed', resolvedSrc) }} className={`h-full w-full object-cover ${className}`} />
}
