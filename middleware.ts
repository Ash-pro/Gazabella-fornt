/**
 * Vercel Routing Middleware — معاينات الروابط لروبوتات المشاركة (واتساب، فيسبوك، تيليجرام…)
 * هذه الروبوتات لا تشغّل JavaScript، فتقرأ index.html فقط. للزوار العاديين: لا تدخّل إطلاقاً.
 *
 * Env على Vercel (Runtime): OG_API_BASE_URL · OG_STORAGE_URL · SITE_URL
 * (ويقرأ VITE_API_BASE_URL / VITE_STORAGE_URL / VITE_SITE_URL كبديل)
 */
// ── نسخة من src/content/seo.ts (الـ middleware مستقل تماماً عن bundle التطبيق) ──
// اختبار tests/launch-observability.test.mjs يفشل إذا اختلفت عن الأصل.
interface SeoEntry {
  title: string | null // null = العنوان الافتراضي للموقع
  description: string
  noindex?: boolean
}

const SITE_NAME = 'Gazabella'
const DEFAULT_TITLE = 'Gazabella | الجمال أقرب إليك'
const DEFAULT_DESCRIPTION = 'Gazabella — وجهتكِ الموحدة لمنتجات التجميل والعناية والهدايا في خان يونس. توصيل للبيت ودفع عند الاستلام.'
const DEFAULT_OG_IMAGE = '/brand/social/og-1200x630.png'
const OG_LOCALE = 'ar_AR'

/** المفاتيح مسارات دقيقة؛ المسارات الديناميكية (المنتج) تُعالج في مكانها */
const ROUTE_SEO: Record<string, SeoEntry> = {
  '/': { title: null, description: DEFAULT_DESCRIPTION },
  '/delivery-info': { title: 'التوصيل والرسوم', description: 'مناطق التوصيل ورسومها ومددها، ومتى تكون التوصيلة مجانية، وكيف يعمل كود التسليم.' },
  '/returns': { title: 'الاسترجاع والاستبدال', description: 'سياسة الاسترجاع والاستبدال لمنتجات التجميل والعناية: المنتج التالف أو الخاطئ، ومدة الإرجاع، والاستثناءات.' },
  '/privacy': { title: 'سياسة الخصوصية', description: 'ما البيانات التي نجمعها ولماذا، ومن يراها، وكيف نحميها، وحقوقكِ في الوصول إليها وحذفها.' },
  '/terms': { title: 'شروط الاستخدام', description: 'شروط استخدام Gazabella: الطلب والتأكيد، الأسعار والدفع، الاستلام والإلغاء.' },
  '/faq': { title: 'الأسئلة الشائعة', description: 'أجوبة سريعة عن الطلب والدفع والتوصيل وكود التسليم والاسترجاع.' },
  '/contact': { title: 'تواصلي معنا', description: 'تواصلي مع خدمة عميلات Gazabella عبر واتساب أو الهاتف.' },
  '/cart': { title: 'سلة التسوق', description: DEFAULT_DESCRIPTION, noindex: true },
  '/checkout': { title: 'إتمام الطلب', description: DEFAULT_DESCRIPTION, noindex: true },
  '/checkout/receipt': { title: 'تم استلام طلبكِ', description: DEFAULT_DESCRIPTION, noindex: true },
  '/auth': { title: 'تسجيل الدخول', description: DEFAULT_DESCRIPTION, noindex: true },
  '/profile': { title: 'الملف الشخصي', description: DEFAULT_DESCRIPTION, noindex: true },
  '/orders': { title: 'طلباتي', description: DEFAULT_DESCRIPTION, noindex: true },
  '/orders/lookup': { title: 'تتبع طلب', description: 'تتبعي حالة طلبكِ برقم المرجع.', noindex: true },
}

/** صفحات خاصة لا تُفهرس حتى لو كانت ديناميكية */
function isPrivatePath(pathname: string): boolean {
  return /^\/(orders|checkout|profile|auth|cart|merchant|delivery)(\/|$)/.test(pathname)
}

function fullTitle(title: string | null | undefined): string {
  return title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE
}

/** وصف نظيف بطول مناسب لمحركات البحث والمعاينات (≤160 حرفاً) */
function toMetaDescription(text: string | null | undefined, fallback = DEFAULT_DESCRIPTION): string {
  const clean = (text ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  return clean.length > 160 ? `${clean.slice(0, 157).replace(/\s+\S*$/, '')}…` : clean
}
// ── نهاية النسخة ──


export const config = {
  // كل المسارات بدون امتداد ملف، ما عدا الأصول الثابتة
  matcher: ['/((?!assets/|brand/|images/|payments/|api/|.*\\.[a-zA-Z0-9]+$).*)'],
}

const BOTS = /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|slackbot|linkedinbot|discordbot|pinterest|skypeuripreview|vkshare|redditbot|snapchat|applebot|googlebot|bingbot|yandex|duckduckbot|embedly|iframely|viber/i

interface Meta { title: string; description: string; image: string; url: string; type: string; noindex: boolean; price?: string }

const env = (k: string): string => {
  // عبر globalThis بدون الاعتماد على تعريفات Node (Vercel يفحص الملف بدونها)
  try { return ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[k] ?? '').replace(/\/$/, '') } catch { return '' }
}

/**
 * «أكمل الطلب كما هو» — نفس ما تفعله next() من @vercel/functions.
 * إرجاع undefined لا يكفي في Routing Middleware خارج Next.js ويسبب MIDDLEWARE_INVOCATION_FAILED.
 */
function next(): Response {
  return new Response(null, { headers: { 'x-middleware-next': '1' } })
}

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

export default async function middleware(request: Request): Promise<Response> {
  try {
    return (await botPreview(request)) ?? next()
  } catch {
    // أي خطأ هنا يجب ألا يُسقط الموقع — نمرّر الطلب كما هو
    return next()
  }
}

async function botPreview(request: Request): Promise<Response | null> {
  if (request.method !== 'GET' || !BOTS.test(request.headers.get('user-agent') ?? '')) return null
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
  if (!shell.ok) return null
  const html = render(await shell.text(), base)
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400', vary: 'user-agent' },
  })
}
