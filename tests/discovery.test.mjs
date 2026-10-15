import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, cp, fx
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-discovery-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  cp = await server.ssrLoadModule('/src/lib/catalogParams.ts')
  fx = await server.ssrLoadModule('/src/fixtures/discovery.ts')
})
after(async () => { await server?.close() })

test('brand is a catalog filter: read, counted, removable, cleared', () => {
  const params = new URLSearchParams('brand=gazabella&sort=price')
  const state = cp.readCatalog(params)
  assert.equal(state.brand, 'gazabella')
  assert.equal(cp.activeFilterCount(state), 1)
  assert.equal(cp.removeFilter(params, 'brand').get('brand'), null)
  const cleared = cp.clearFilters(params)
  assert.equal(cleared.get('brand'), null); assert.equal(cleared.get('sort'), 'price', 'sort survives clearing filters')
})

test('demo brands are clearly namespaced so they never collide with real slugs', () => {
  assert.ok(fx.DEMO_BRANDS.every((b) => fx.isDemoBrand(b.slug) && b.id >= 9000))
  assert.equal(fx.isDemoBrand('gazabella'), false)
})
