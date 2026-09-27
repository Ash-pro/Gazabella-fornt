import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
let server, pricing, normalize
before(async () => {
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  server = await createServer({ configFile: false, resolve: { alias: { axios: new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') } }, cacheDir: 'node_modules/.vite-pricing-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  pricing = (await server.ssrLoadModule('/src/lib/productPricing.ts')).productPricing
  normalize = (await server.ssrLoadModule('/src/api/mvp0.ts')).normalizeMvp0Product
})
after(async () => { await server?.close() })
test('discount compares current price with the original price', () => {
  assert.deepEqual(pricing({ price: 60, discount_price: 45 }), { current: 45, original: 60, percent: 25 })
  for (const discount_price of [null, 60, 70, -1, NaN]) assert.deepEqual(pricing({ price: 60, discount_price }), { current: 60, original: null, percent: 0 })
  assert.deepEqual(pricing({ price: 60, discount_price: 0 }), { current: 0, original: 60, percent: 100 })
})
test('MVP0 keeps the previous price of the same cheapest variant, never a different size', () => {
  const variants = [{ id: 1, price: 45, compare_at_price: 60, available_quantity: 5 }, { id: 2, price: 75, compare_at_price: null, available_quantity: 2 }]
  const product = normalize({ id: 1, name: 'Test', slug: 'test', min_price: 45, variants })
  assert.deepEqual(pricing(product), { current: 45, original: 60, percent: 25 })
  assert.deepEqual(pricing(product, variants[1]), { current: 75, original: null, percent: 0 })
  assert.deepEqual(pricing(normalize({ ...product, min_price: 45, variants: variants.map(v => ({ ...v, compare_at_price: null })) })), { current: 45, original: null, percent: 0 })
})
