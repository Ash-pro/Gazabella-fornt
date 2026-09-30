/**
 * Vercel Routing Middleware — معاينات الروابط لروبوتات المشاركة (واتساب، فيسبوك، تيليجرام…)
 * هذه الروبوتات لا تشغّل JavaScript، فتقرأ index.html فقط. للزوار العاديين: لا تدخّل إطلاقاً.
 *
 * Env على Vercel (Runtime): OG_API_BASE_URL · OG_STORAGE_URL · SITE_URL
 * (ويقرأ VITE_API_BASE_URL / VITE_STORAGE_URL / VITE_SITE_URL كبديل)
 */
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, fullTitle, isPrivatePath, OG_LOCALE, ROUTE_SEO, SITE_NAME, toMetaDescription } from './src/content/seo.ts'

export const config = {
  // كل المسارات بدون امتداد ملف، ما عدا الأصول الثابتة
  matcher: ['/((?!assets/|brand/|images/|payments/|api/|.*\\.[a-zA-Z0-9]+$).*)'],
}

const BOTS = /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|slackbot|linkedinbot|discordbot|pinterest|skypeuripreview|vkshare|redditbot|snapchat|applebot|googlebot|bingbot|yandex|duckduckbot|embedly|iframely|viber/i

interface Meta { title: string; description: string; image: string; url: string; type: string; noindex: boolean; price?: string }

const env = (k: string) => (process.env[k] ?? '').replace(/\/$/, '')

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function absolute(origin: string, pathOrUrl: string, storage?: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) {
    // الباك اند قد يرجع localhost في روابط الصور — نستبدل الأصل بالـ storage
    if (storage) { try { const u = new URL(pathOrUrl); if (['localhost', '127.0.0.1'].includes(u.hostname)) return `${storage}${u.pathname}` } catch { /* ignore */ } }
    return pathOrUrl
  }
  if (storage && !pathOrUrl.startsWith('/brand/')) return `${storage}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
  return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

async function productMeta(slug: string, origin: string): Promise<Partial<Meta> | null> {
  const api = env('OG_API_BASE_URL') || env('VITE_API_BASE_URL')
  if (!api) return null
  try {
    const res = await fetch(`${api}/products/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json', 'Accept-Language': 'ar' }, signal: AbortSignal.timeout(2500) })
    if (!res.ok) return null
    const body = (await res.json()) as { data?: { name?: string; description?: string | null; price?: number | string; discount_price?: number | string | null; images?: Array<{ url?: string; is_primary?: boolean }>; category?: { name?: string } } }
    const p = body.data
    if (!p?.name) return null
    const price = Number(p.discount_price ?? p.price) || 0
    const img = p.images?.find((i) => i.is_primary)?.url ?? p.images?.[0]?.url
    const storage = env('OG_STORAGE_URL') || env('VITE_STORAGE_URL')
    return {
      title: fullTitle(p.name),
      description: toMetaDescription(p.description, `${p.name} — ${p.category?.name ?? 'منتجات التجميل'} بسعر ${price} ₪. توصيل في خان يونس ودفع عند الاستلام.`),
      image: img ? absolute(origin, img, storage) : undefined,
      type: 'product',
      price: price ? price.toFixed(2) : undefined,
    }
  } catch {
    return null
  }
}

function render(html: string, m: Meta): string {
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta name="robots" content="${m.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="${OG_LOCALE}" />`,
    `<meta property="og:type" content="${m.type}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...(m.price ? [`<meta property="product:price:amount" content="${m.price}" />`, `<meta property="product:price:currency" content="ILS" />`] : []),
  ].join('\n    ')
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    // نحذف أي وسوم افتراضية حتى لا تقرأ الروبوتات أول نسخة (القيمة العامة)
    .replace(/\s*<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="(?:og|product):[^"]+")[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
    .replace('</head>', `    ${tags}\n  </head>`)
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  if (request.method !== 'GET' || !BOTS.test(request.headers.get('user-agent') ?? '')) return undefined
  const url = new URL(request.url)
  const origin = env('SITE_URL') || env('VITE_SITE_URL') || url.origin
  const path = url.pathname.replace(/\/+$/, '') || '/'

  const base: Meta = { title: fullTitle(null), description: DEFAULT_DESCRIPTION, image: `${origin}${DEFAULT_OG_IMAGE}`, url: `${origin}${path}`, type: 'website', noindex: isPrivatePath(path) }
  const route = ROUTE_SEO[path]
  if (route) Object.assign(base, { title: fullTitle(route.title), description: route.description, noindex: Boolean(route.noindex) })
  const slug = /^\/products\/([^/]+)$/.exec(path)?.[1]
  if (slug) {
    const product = await productMeta(decodeURIComponent(slug), origin)
    if (product) Object.assign(base, Object.fromEntries(Object.entries(product).filter(([, v]) => v !== undefined)))
  }

  const shell = await fetch(new URL('/index.html', url.origin))
  if (!shell.ok) return undefined
  const html = render(await shell.text(), base)
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400', vary: 'user-agent' },
  })
}
