import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, share, reviewed
before(async () => {
  globalThis.window = { location: { origin: 'https://gazabella.ps' }, matchMedia: () => ({ matches: false }) }
  const m = new Map(); globalThis.localStorage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-share-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  share = await server.ssrLoadModule('/src/lib/share.ts')
  reviewed = await server.ssrLoadModule('/src/lib/reviewed.ts')
})
after(async () => { await server?.close() })

const c = { url: 'https://gazabella.ps/w/abc', title: 'قائمتي', text: '3 اختيارات', campaign: 'wishlist' }

test('every channel link carries its own utm_source', () => {
  for (const ch of ['whatsapp', 'telegram', 'facebook', 'messenger', 'x', 'pinterest', 'snapchat', 'email', 'sms']) {
    const href = decodeURIComponent(share.shareHref(ch, c))
    assert.ok(href.includes(`utm_source=${ch}`), ch)
    assert.ok(href.includes('utm_campaign=wishlist'), ch)
  }
})

test('whatsapp text includes title and url; facebook only needs the url', () => {
  const wa = decodeURIComponent(share.shareHref('whatsapp', c))
  assert.ok(wa.startsWith('https://wa.me/?text=') && wa.includes('قائمتي') && wa.includes('/w/abc'))
  assert.ok(share.shareHref('facebook', c).startsWith('https://www.facebook.com/sharer/sharer.php?u='))
})

test('QR is an SVG data URL', () => {
  assert.ok(share.qrDataUrl('https://gazabella.ps/w/abc').startsWith('data:image/svg+xml;utf8,'))
})

test('review requests: only delivered, with slug, not reviewed, no duplicates', () => {
  const item = (id, slug, extra = {}) => ({ id, product_slug: slug, product_name: slug, image_url: null, unit_price: '1', quantity: 1, subtotal: '1', ...extra })
  const orders = [
    { status: 'delivered', items: [item(1, 'a'), item(2, 'b', { reviewed: true }), item(3, null)] },
    { status: 'shipped', items: [item(4, 'c')] },
    { status: 'delivered', items: [item(5, 'a'), item(6, 'd')] },
  ]
  assert.deepEqual(reviewed.pendingReviews(orders).map((i) => i.product_slug), ['a', 'd'])
  reviewed.markReviewed('a')
  assert.deepEqual(reviewed.pendingReviews(orders).map((i) => i.product_slug), ['d'])
})
