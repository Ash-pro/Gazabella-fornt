/**
 * طبقة Analytics موحّدة — المزوّد يُختار من البيئة دون تغيير الكود:
 *   VITE_ANALYTICS_PROVIDER = none | plausible | ga4
 *   VITE_PLAUSIBLE_DOMAIN   = gazabella.ps          (plausible)
 *   VITE_PLAUSIBLE_SRC      = https://plausible.io/js/script.manual.js (اختياري — للاستضافة الذاتية)
 *   VITE_GA4_ID             = G-XXXXXXX             (ga4)
 *
 * قاعدة ثابتة: لا اسم ولا هاتف ولا عنوان ولا كود تسليم في أي حدث.
 * الأحداث بأسماء GA4 Ecommerce القياسية حتى تعمل التقارير الجاهزة.
 */

export const CURRENCY = 'ILS'

export interface AnalyticsItem {
  item_id: string
  item_name: string
  price?: number
  quantity?: number
  item_category?: string
  item_variant?: string
}

type Items = { items: AnalyticsItem[]; value: number }
export interface AnalyticsEvents {
  view_item: Items
  add_to_cart: Items
  remove_from_cart: Items
  view_cart: Items
  begin_checkout: Items
  /** وصلت خطوة «المراجعة والتأكيد» — لقياس التسرّب بين الخطوتين */
  checkout_review: Items
  order_track: { source: string }
  reorder: { added: number; total: number }
  purchase: Items & { transaction_id: string; shipping: number; payment_type: string; delivery_waived: boolean }
  checkout_error: { stage: 'reserve' | 'quote' | 'create' | 'submit'; status: number }
  login: { method: 'otp' }
  search: { search_term: string }
  contact: { channel: 'whatsapp' | 'phone' | 'email'; page: string }
  location_consent: { outcome: 'accepted' | 'dismissed' | 'failed' | 'skipped' }
  privacy_action: { action: 'export' | 'delete' }
}

type Provider = 'none' | 'plausible' | 'ga4'
type PlausibleFn = ((event: string, options?: { u?: string; props?: Record<string, string | number | boolean>; revenue?: { currency: string; amount: number } }) => void) & { q?: unknown[] }

declare global {
  interface Window {
    plausible?: PlausibleFn
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const env = import.meta.env
const provider: Provider = env.VITE_DATA_SOURCE === 'mock' ? 'none' : ((env.VITE_ANALYTICS_PROVIDER as Provider | undefined) ?? 'none')
const debug = env.DEV || env.VITE_ANALYTICS_DEBUG === 'true'
let started = false

function loadScript(src: string, attrs: Record<string, string> = {}) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v))
  document.head.appendChild(s)
}

export function initAnalytics() {
  if (started || typeof window === 'undefined') return
  started = true
  if (provider === 'plausible' && env.VITE_PLAUSIBLE_DOMAIN) {
    // طابور قبل تحميل السكربت — لا نفقد أول page view
    window.plausible = window.plausible || (function (...args: unknown[]) { ((window.plausible as PlausibleFn).q = (window.plausible as PlausibleFn).q || []).push(args) } as PlausibleFn)
    loadScript((env.VITE_PLAUSIBLE_SRC as string | undefined) || 'https://plausible.io/js/script.manual.js', { 'data-domain': env.VITE_PLAUSIBLE_DOMAIN as string })
  } else if (provider === 'ga4' && env.VITE_GA4_ID) {
    window.dataLayer = window.dataLayer || []
    // gtag يجب أن يدفع كائن arguments نفسه وليس مصفوفة
    window.gtag = function gtag() { window.dataLayer!.push(arguments) } // eslint-disable-line prefer-rest-params
    window.gtag('js', new Date())
    window.gtag('config', env.VITE_GA4_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(env.VITE_GA4_ID as string)}`)
  }
}

/** يحذف أي باراميتر قد يحمل بيانات حساسة (مرجع دفع، رقم، توكن) */
const SAFE_PARAMS = new Set(['search', 'category', 'sub', 'collection', 'sort', 'page', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'])
export function sanitizeUrl(href: string): string {
  const url = new URL(href)
  for (const key of [...url.searchParams.keys()]) if (!SAFE_PARAMS.has(key)) url.searchParams.delete(key)
  url.hash = ''
  return url.toString()
}

export function trackPageView() {
  const url = sanitizeUrl(window.location.href)
  if (debug) console.debug('[analytics] page_view', url)
  if (provider === 'plausible') window.plausible?.('pageview', { u: url })
  else if (provider === 'ga4') window.gtag?.('event', 'page_view', { page_location: url, page_title: document.title })
}

function flatProps(data: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === 'items' && Array.isArray(v)) { out.items_count = v.reduce((n, i: AnalyticsItem) => n + (i.quantity ?? 1), 0); if (v[0]) out.item_name = (v[0] as AnalyticsItem).item_name }
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v
  }
  return out
}

export function track<K extends keyof AnalyticsEvents>(event: K, data: AnalyticsEvents[K]) {
  try {
    const payload = { ...data, ...('value' in data ? { currency: CURRENCY } : {}) }
    if (debug) console.debug('[analytics]', event, payload)
    if (provider === 'ga4') window.gtag?.('event', event, payload)
    else if (provider === 'plausible') {
      const revenue = event === 'purchase' ? { currency: CURRENCY, amount: (data as AnalyticsEvents['purchase']).value } : undefined
      window.plausible?.(event, { props: flatProps(payload), ...(revenue ? { revenue } : {}) })
    }
  } catch {
    // التحليلات لا يجوز أن تكسر تجربة الشراء
  }
}

const num = (v: string | number | null | undefined) => Number(v) || 0

export function productItem(p: { id: number; name: string; price: number; discount_price?: number | null; category?: { name: string } | null }, opts: { quantity?: number; variant?: string | null; price?: number } = {}): AnalyticsItem {
  return {
    item_id: String(p.id),
    item_name: p.name,
    price: opts.price ?? num(p.discount_price ?? p.price),
    quantity: opts.quantity ?? 1,
    ...(p.category?.name ? { item_category: p.category.name } : {}),
    ...(opts.variant ? { item_variant: opts.variant } : {}),
  }
}

export function lineItems(lines: Array<{ product_id?: number; product_name: string; variant_name?: string | null; unit_price: string | number; quantity: number }>): Items {
  const items = lines.map((l) => ({
    item_id: l.product_id != null ? String(l.product_id) : l.product_name,
    item_name: l.product_name,
    price: num(l.unit_price),
    quantity: l.quantity,
    ...(l.variant_name ? { item_variant: l.variant_name } : {}),
  }))
  return { items, value: Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100 }
}

export function trackPurchase(order: { order_number: string; total: string; delivery_fee: string; payment_method?: string; delivery_waiver?: unknown; items: Parameters<typeof lineItems>[0] }) {
  track('purchase', {
    ...lineItems(order.items),
    transaction_id: order.order_number,
    value: num(order.total),
    shipping: num(order.delivery_fee),
    payment_type: order.payment_method ?? 'cod',
    delivery_waived: Boolean(order.delivery_waiver),
  })
}
