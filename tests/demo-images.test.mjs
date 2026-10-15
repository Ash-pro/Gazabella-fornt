import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, m
before(async () => {
  globalThis.window = { location: { origin: 'https://gazabella.ps' } }
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-demo-images-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  m = await server.ssrLoadModule('/src/lib/demoImages.ts')
})
after(async () => { await server?.close() })

const raw = () => ({
  data: [{
    id: 1, slug: 'aurelia-brightening-serum', name: 'Aurelia', price: 35,
    category: { id: 6, parent_id: null, slug: 'skincare', image_url: 'https://api/placeholders/categories/skincare.jpg' },
    images: [{ id: 98, url: 'https://api/placeholders/products/serum.jpg', is_primary: true }],
  }, { id: 99, slug: 'real-new-product', name: 'New', price: 10, images: [{ url: 'https://cdn/real.jpg', is_primary: true }] }],
})

test('disabled outside demo mode: payload untouched', () => {
  const d = raw()
  m.applyDemoImages(d, false)
  assert.deepEqual(d, raw())
})

test('demo mode swaps product, nested category, and keeps unknown products real', () => {
  const d = m.applyDemoImages(raw(), true)
  const p = d.data[0]
  assert.equal(p.images.length, 2)
  assert.equal(p.images[0].url, '/demo/products/aurelia-brightening-serum-1.webp')
  assert.equal(p.images[0].id, 98)
  assert.equal(p.images[0].is_primary, true)
  assert.equal(p.category.image_url, '/demo/categories/skincare.webp')
  assert.equal(d.data[1].images[0].url, 'https://cdn/real.jpg')
})

test('banners by type, collections, cart/order line items', () => {
  const d = m.applyDemoImages({
    banners: [{ id: 1, type: 'hero', title: 'x', image_url: 'p.jpg' }, { id: 3, type: 'badge', title: 'y', image_url: null }],
    collections: [{ id: 1, name: 'Edit', slug: 'the-everyday-edit' }],
    items: [{ product_slug: 'silk-setting-powder', image_url: null }, { id: 7, product: { id: 2, name: 'x', slug: 'rosewater-facial-toner' }, image_url: 'https://api/placeholders/x.jpg', unit_price: 9 }],
  }, true)
  assert.equal(d.items[1].image_url, '/demo/products/rosewater-facial-toner-1.webp')
  assert.equal(d.banners[0].image_url, '/demo/banners/hero.webp')
  assert.equal(d.banners[1].image_url, null)
  assert.equal(d.collections[0].image_url, '/demo/collections/everyday-edit.webp')
  assert.equal(d.items[0].image_url, '/demo/products/silk-setting-powder-1.webp')
})
