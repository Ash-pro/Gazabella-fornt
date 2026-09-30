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
