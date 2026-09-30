import { useEffect } from 'react'
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, fullTitle, OG_LOCALE, SITE_NAME } from '../content/seo'

export interface SeoOptions {
  title?: string | null
  description?: string | null
  image?: string | null
  type?: 'website' | 'product' | 'article'
  noindex?: boolean
  /** بيانات منظمة schema.org — تُحقن كـ JSON-LD */
  jsonLd?: Record<string, unknown> | null
  /** سعر المنتج لمعاينات فيسبوك/واتساب */
  price?: { amount: number; currency: string } | null
}

const MANAGED = 'data-seo'

export function siteOrigin(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  return configured || window.location.origin
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  return `${siteOrigin()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (content == null) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el) }
  el.href = href
}

function setJsonLd(data: Record<string, unknown> | null | undefined) {
  document.head.querySelectorAll(`script[type="application/ld+json"][${MANAGED}]`).forEach((n) => n.remove())
  if (!data) return
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute(MANAGED, '')
  script.textContent = JSON.stringify(data).replace(/</g, '\\u003c')
  document.head.appendChild(script)
}

/** يطبّق العنوان والوصف وOpen Graph وcanonical وrobots — قيمة واحدة لكل صفحة */
export function applySeo(options: SeoOptions) {
  const title = fullTitle(options.title)
  const description = options.description || DEFAULT_DESCRIPTION
  const url = absoluteUrl(window.location.pathname)
  const image = absoluteUrl(options.image || DEFAULT_OG_IMAGE)
  document.title = title
  setMeta('name', 'description', description)
  setMeta('name', 'robots', options.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
  setMeta('property', 'og:site_name', SITE_NAME)
  setMeta('property', 'og:locale', OG_LOCALE)
  setMeta('property', 'og:type', options.type ?? 'website')
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image)
  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', image)
  setMeta('property', 'product:price:amount', options.price ? options.price.amount.toFixed(2) : null)
  setMeta('property', 'product:price:currency', options.price ? options.price.currency : null)
  setLink('canonical', url)
  setJsonLd(options.jsonLd)
}

/** للصفحات الديناميكية (المنتج) — الصفحات الثابتة تُغطّى من RouteSeo */
export function useSeo(options: SeoOptions | null) {
  const key = options ? JSON.stringify(options) : null
  useEffect(() => {
    if (!key) return
    applySeo(JSON.parse(key) as SeoOptions)
  }, [key])
}
