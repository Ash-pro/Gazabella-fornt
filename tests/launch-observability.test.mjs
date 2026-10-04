// اختبارات طبقة الإطلاق: الخصوصية في Analytics وSentry، وبيانات SEO
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, analytics, monitoring, seo, storeInfo
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-launch-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom', define: { 'import.meta.env.VITE_DATA_SOURCE': '"api"' } })
  analytics = await server.ssrLoadModule('/src/lib/analytics.ts')
  monitoring = await server.ssrLoadModule('/src/lib/monitoring.ts')
  seo = await server.ssrLoadModule('/src/content/seo.ts')
  storeInfo = await server.ssrLoadModule('/src/content/storeInfo.ts')
})
after(async () => { await server?.close() })

test('analytics: URL sanitizer strips sensitive params and keeps catalogue params', () => {
  const out = analytics.sanitizeUrl('https://gazabella.ps/orders/lookup?reference=JP-123&phone=0599123456&search=ماسكارا&utm_source=ig#x')
  assert.ok(!out.includes('reference')); assert.ok(!out.includes('0599123456')); assert.ok(!out.includes('#x'))
  assert.ok(out.includes('search=')); assert.ok(out.includes('utm_source=ig'))
})

test('analytics: line items and purchase value never carry customer data', () => {
  const r = analytics.lineItems([{ product_id: 7, product_name: 'أحمر شفاه', variant_name: 'وردي', unit_price: '25.50', quantity: 2 }])
  assert.equal(r.value, 51); assert.deepEqual(Object.keys(r.items[0]).sort(), ['item_id', 'item_name', 'item_variant', 'price', 'quantity'])
})

test('monitoring: scrub hides Palestinian phone numbers and bearer tokens', () => {
  const s = monitoring.scrub('call 0599123456 or +970 59 912 3456 — Authorization: Bearer 12|abcDEF.xyz')
  assert.ok(!/0599123456|912 3456|abcDEF/.test(s), s)
  assert.ok(s.includes('[phone]') && s.includes('Bearer [token]'))
})

test('seo: descriptions are cleaned and capped at 160 chars', () => {
  assert.equal(seo.toMetaDescription('<p>سيروم   <b>خفيف</b></p>'), 'سيروم خفيف')
  assert.ok(seo.toMetaDescription('ك'.repeat(400)).length <= 160)
  assert.equal(seo.toMetaDescription(''), seo.DEFAULT_DESCRIPTION)
})

test('seo: private paths are noindex, public policies are indexable', () => {
  for (const p of ['/orders/GZ-1', '/checkout', '/profile', '/cart', '/merchant']) assert.ok(seo.isPrivatePath(p), p)
  for (const p of ['/', '/returns', '/privacy', '/products/x']) assert.ok(!seo.isPrivatePath(p), p)
  assert.equal(seo.fullTitle(null), seo.DEFAULT_TITLE)
})

test('support: WhatsApp numbers normalise to international format', () => {
  assert.equal(storeInfo.normalizeWhatsapp('059-912-3456'), '970599123456')
  assert.equal(storeInfo.normalizeWhatsapp('00970599123456'), '970599123456')
  assert.equal(storeInfo.normalizeWhatsapp('123'), null)
  assert.equal(storeInfo.resolveWhatsapp({ whatsapp: 'https://wa.me/970561112233' }), '970561112233')
})

test('middleware: self-contained SEO copy matches src/content/seo.ts', async () => {
  const { readFile } = await import('node:fs/promises')
  const norm = (x) => x.replace(/export /g, '').replace(/\s+/g, ' ').trim()
  const src = await readFile(new URL('../src/content/seo.ts', import.meta.url), 'utf8')
  const mw = await readFile(new URL('../middleware.ts', import.meta.url), 'utf8')
  const original = norm(src.slice(src.indexOf('export interface SeoEntry')))
  const copy = norm(mw.slice(mw.indexOf('interface SeoEntry'), mw.indexOf('// ── نهاية النسخة ──')))
  assert.equal(copy, original)
  assert.ok(!/from '\.\/src\//.test(mw), 'middleware must not import from src/')
})

test('middleware: normal visitors pass through with x-middleware-next, bots get HTML, errors never break the site', async () => {
  const mod = await server.ssrLoadModule('/middleware.ts')
  const human = await mod.default(new Request('https://gazabella.ps/products/x', { headers: { 'user-agent': 'Mozilla/5.0 Chrome/120' } }))
  assert.ok(human instanceof Response)
  assert.equal(human.headers.get('x-middleware-next'), '1')
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('network down') }
  try {
    const bot = await mod.default(new Request('https://gazabella.ps/returns', { headers: { 'user-agent': 'WhatsApp/2.23' } }))
    assert.equal(bot.headers.get('x-middleware-next'), '1', 'fetch failure must fall back to pass-through')
  } finally { globalThis.fetch = realFetch }
})

test('B-01: /settings normalises support, social and policies (real response shape)', async () => {
  const api = await server.ssrLoadModule('/src/api/gazabella.ts')
  const s = api.normalizeSettings({
    site_name: 'Gazabella', tagline: 'الجمال، أقرب إليكِ',
    support: { email: 'support@gazabella.com', phone: '+970599000000', whatsapp: null, hours: null, response_time: null },
    social: { instagram: 'https://ig/x', facebook: '', whatsapp: null },
    policies: { return_window_days: 7, acceptance_window_minutes: 30, free_delivery_threshold: 0, cod_available: true },
  })
  assert.equal(s.store_name, 'Gazabella')
  assert.equal(s.phone, '+970599000000')
  assert.equal(s.email, 'support@gazabella.com')
  assert.deepEqual(s.social_links, { instagram: 'https://ig/x' }, 'empty/null social links are dropped')
  assert.equal(s.policies.return_window_days, 7)
  assert.equal(s.policies.free_delivery_threshold, 0)
  assert.equal(s.policies.updated_at, null)
  const withWa = api.normalizeSettings({ support: { whatsapp: '0599111222' }, social: { whatsapp: '970500000000' } })
  assert.equal(withWa.social_links.whatsapp, '0599111222', 'support.whatsapp wins over social.whatsapp')
})

test('B-02: /delivery-zones normalises numbers and drops invalid rows', async () => {
  const api = await server.ssrLoadModule('/src/api/gazabella.ts')
  const zones = api.normalizeDeliveryZones([
    { id: 1, name: 'خان يونس', fee: 5, eta_minutes: 45, currency: 'ILS' },
    { id: 2, name: 'رفح', fee: '8.00', eta_minutes: '60' },
    { id: 3, name: '', fee: 3 },
    { id: 4, name: 'مغلقة', fee: 2, is_active: false },
  ])
  assert.deepEqual(zones, [
    { id: 1, name: 'خان يونس', fee: 5, eta_minutes: 45, currency: 'ILS' },
    { id: 2, name: 'رفح', fee: 8, eta_minutes: 60, currency: 'ILS' },
  ])
})

test('delivery ETA is phrased naturally in Arabic', () => {
  assert.equal(storeInfo.formatEta(45), 'خلال 45 دقيقة')
  assert.equal(storeInfo.formatEta(60), 'خلال ساعة')
  assert.equal(storeInfo.formatEta(90), 'خلال ساعة ونصف')
  assert.equal(storeInfo.formatEta(120), 'خلال ساعتين')
  assert.equal(storeInfo.formatEta(75), 'خلال ساعة و15 دقيقة')
  assert.equal(storeInfo.formatEta(null), 'حسب التغطية')
  assert.deepEqual(storeInfo.STORE_INFO.deliveryZones.map((z) => [z.name, z.fee, z.etaMinutes]), [['خان يونس', 5, 45], ['رفح', 8, 60], ['مدينة غزة', 10, 90]])
  assert.equal(storeInfo.STORE_INFO.returnWindowDays, 7)
})

test('service status: outage detection + status URL + payment methods from settings', async () => {
  const s = await server.ssrLoadModule('/src/lib/serviceStatus.ts')
  assert.equal(s.isOutage({ code: 'ERR_NETWORK' }), true)
  assert.equal(s.isOutage({ response: { status: 503 } }), true)
  assert.equal(s.isOutage({ response: { status: 500 } }), false)
  assert.equal(s.isOutage({ response: { status: 422 } }), false)
  assert.equal(s.isOutage({ code: 'ECONNABORTED' }), false)
  assert.equal(s.statusUrl('https://api.example.com/api/v1', 'https://shop.example.com'), 'https://api.example.com/api/status?ping=true')
  assert.equal(s.statusUrl(undefined, 'https://shop.example.com'), 'https://shop.example.com/api/status?ping=true')
  let calls = 0; const off = s.serviceStatus.subscribe(() => { calls += 1 })
  s.serviceStatus.set(true); s.serviceStatus.set(true); s.serviceStatus.set(false); off()
  assert.equal(calls, 2)
  const p = await server.ssrLoadModule('/src/lib/paymentMethods.ts')
  assert.deepEqual(p.paymentOptionsFromCodes(['cod']).map((o) => o.code), ['cod'])
  assert.deepEqual(p.paymentOptionsFromCodes(['jawwal_pay', 'cod', 'cod', 'visa']).map((o) => o.code), ['jawwal_pay', 'cod'])
  assert.deepEqual(p.paymentOptionsFromCodes(null).map((o) => o.code), ['cod'])
  assert.deepEqual(p.paymentOptionsFromCodes([]).map((o) => o.code), ['cod'])
})

test('middleware: robots.txt + sitemap.xml (static pages, API products/categories, canonical host only, API failure)', async () => {
  const mod = await server.ssrLoadModule('/middleware.ts')
  const realFetch = globalThis.fetch
  const realEnv = { ...process.env }
  const get = async (url) => { const r = await mod.default(new Request(url, { headers: { 'user-agent': 'Googlebot' } })); return { r, text: await r.text() } }
  try {
    process.env.VITE_API_BASE_URL = 'https://api.example.com/api/v1'
    delete process.env.SITE_URL; delete process.env.VITE_SITE_URL
    globalThis.fetch = async (u) => {
      assert.equal(String(u), 'https://api.example.com/api/v1/sitemap')
      return new Response(JSON.stringify({ success: true, data: { entries: [
        { type: 'product', slug: 'rose-serum', updated_at: '2026-10-04T07:59:31+00:00' },
        { type: 'product', slug: 'rose-serum', updated_at: null },
        { type: 'category', slug: 'skincare', updated_at: 'not-a-date' },
        { type: 'weird', slug: 'x' }, { type: 'product' },
        { type: 'product', slug: 'a&b <c>' },
      ] } }), { status: 200 })
    }
    const robots = await get('https://shop.example.com/robots.txt')
    assert.match(robots.r.headers.get('content-type'), /text\/plain/)
    assert.match(robots.text, /^User-agent: \*\nAllow: \/\n/)
    assert.match(robots.text, /Disallow: \/checkout\n/)
    assert.match(robots.text, /Disallow: \/delivery\$\n/)
    assert.ok(!/Disallow: \/delivery\n/.test(robots.text), '/delivery-info must stay crawlable')
    assert.match(robots.text, /Sitemap: https:\/\/shop\.example\.com\/sitemap\.xml\n$/)

    const map = await get('https://shop.example.com/sitemap.xml')
    assert.match(map.r.headers.get('content-type'), /application\/xml/)
    assert.match(map.r.headers.get('cache-control'), /s-maxage=3600/)
    assert.ok(map.text.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
    for (const loc of ['https://shop.example.com/', 'https://shop.example.com/faq', 'https://shop.example.com/delivery-info', 'https://shop.example.com/products/rose-serum', 'https://shop.example.com/?category=skincare', 'https://shop.example.com/products/a%26b%20%3Cc%3E'])
      assert.ok(map.text.includes(`<loc>${loc}</loc>`), `missing ${loc}`)
    assert.equal(map.text.split('/products/rose-serum<').length - 1, 1, 'duplicates removed')
    assert.ok(map.text.includes('<lastmod>2026-10-04T07:59:31.000Z</lastmod>'))
    assert.ok(!/checkout|\/cart|\/orders|\/auth|weird|not-a-date/.test(map.text))

    // نطاق غير الرسمي (معاينة): لا زحف ولا روابط
    process.env.SITE_URL = 'https://gazabella.ps'
    const preview = await get('https://preview-abc.vercel.app/robots.txt')
    assert.equal(preview.text, 'User-agent: *\nDisallow: /\n')
    const official = await get('https://gazabella.ps/sitemap.xml')
    assert.ok(official.text.includes('<loc>https://gazabella.ps/products/rose-serum</loc>'))

    // فشل الـ API: خريطة صالحة بالصفحات الثابتة فقط وبكاش قصير
    globalThis.fetch = async () => { throw new Error('down') }
    const degraded = await get('https://gazabella.ps/sitemap.xml')
    assert.equal(degraded.r.status, 200)
    assert.ok(degraded.text.includes('<loc>https://gazabella.ps/faq</loc>') && !degraded.text.includes('/products/'))
    assert.match(degraded.r.headers.get('cache-control'), /s-maxage=120/)
  } finally {
    globalThis.fetch = realFetch
    for (const k of ['VITE_API_BASE_URL', 'SITE_URL', 'VITE_SITE_URL']) { if (k in realEnv) process.env[k] = realEnv[k]; else delete process.env[k] }
  }
})

test('public cache: stores only non-null data, expires after 7 days, survives broken storage', async () => {
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { store.set(k, String(v)) }, removeItem: (k) => { store.delete(k) } }
  try {
    const c = await server.ssrLoadModule('/src/lib/publicCache.ts')
    assert.equal(c.readPublicCache('banners'), undefined)
    c.writePublicCache('banners', [{ id: 1 }], 1000)
    assert.deepEqual(c.readPublicCache('banners', 2000), [{ id: 1 }])
    assert.equal(c.readPublicCache('banners', 1000 + 8 * 24 * 60 * 60 * 1000), undefined)
    c.writePublicCache('settings', null)
    assert.equal(c.readPublicCache('settings'), undefined)
    store.set([...store.keys()][0], '{broken')
    assert.equal(c.readPublicCache('banners', 2000), undefined)
    assert.ok(c.PUBLIC_QUERY_KEYS.includes('categories') && !c.PUBLIC_QUERY_KEYS.includes('cart') && !c.PUBLIC_QUERY_KEYS.includes('orders'))
  } finally { delete globalThis.localStorage }
})
