import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, resolve
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-home-config-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  resolve = (await server.ssrLoadModule('/src/lib/homeConfig.ts')).resolveHomeOrder
})
after(async () => { await server?.close() })

test('default order hides opt-in sections (best_sellers) until the admin enables them', () => {
  assert.deepEqual(resolve(null), ['deals', 'brands', 'picks', 'promo', 'new', 'budget', 'reorder', 'recent', 'services'])
})

test('admin order wins, disabled sections disappear, unlisted keys follow in default order', () => {
  const order = resolve({ sections: [{ key: 'best_sellers', enabled: true }, { key: 'picks', enabled: true }, { key: 'deals', enabled: false }], trust: null })
  assert.deepEqual(order, ['best_sellers', 'picks', 'brands', 'promo', 'new', 'budget', 'reorder', 'recent', 'services'])
})

test('duplicate keys from the admin are rendered once', () => {
  const order = resolve({ sections: [{ key: 'new', enabled: true }, { key: 'new', enabled: true }], trust: null })
  assert.equal(order.filter((k) => k === 'new').length, 1)
})
