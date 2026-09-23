import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { getImageUrl } from '../../lib/apiClient'

export function ProductVisual({ src, alt, className = '', priority = false }: { src: string | null; alt: string; productId?: number; className?: string; priority?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolvedSrc = getImageUrl(src)
  if (!resolvedSrc || failedSrc === resolvedSrc) return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}><Icon name="package" className="size-10" /><span>الصورة غير متاحة</span></div>
  return <img src={resolvedSrc} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => setFailedSrc(resolvedSrc)} className={`h-full w-full object-cover ${className}`} />
}
