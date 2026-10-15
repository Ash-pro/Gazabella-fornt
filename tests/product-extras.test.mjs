import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, fx, demo
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-product-extras-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  fx = await server.ssrLoadModule('/src/fixtures/productExtras.ts')
  demo = await server.ssrLoadModule('/src/lib/demo.ts')
})
after(async () => { await server?.close() })

test('demo rating on the card matches the review summary on the page', () => {
  for (const id of [1, 7, 42, 99]) {
    const card = fx.demoRating(id)
    const page = fx.demoReviews(id, null)
    assert.equal(page.summary.count, card.rating_count)
    assert.equal(page.summary.average, card.rating_avg)
    const sum = Object.values(page.summary.distribution).reduce((a, b) => a + b, 0)
    assert.equal(sum, card.rating_count, 'distribution adds up to the count')
  }
})

test('real ratings from the API are never overwritten by demo data', () => {
  const p = { id: 5, rating_avg: 3.1, rating_count: 2 }
  assert.deepEqual(fx.withDemoRating(p), p)
})

test('star filter and paging', () => {
  const all = fx.demoReviews(42, null)
  const five = fx.demoReviews(42, null, 1, 5)
  assert.ok(five.data.every((r) => r.rating === 5))
  assert.equal(five.meta.total, all.summary.distribution['5'])
  assert.ok(all.data.length <= 6)
})

test('withDemo: API data wins; missing endpoint throws when demo mode is off', async () => {
  const ok = await demo.withDemo(async () => 'api', () => 'fixture')
  assert.deepEqual(ok, { data: 'api', demo: false })
  const missing = Object.assign(new Error('404'), { response: { status: 404 } })
  await assert.rejects(() => demo.withDemo(async () => { throw missing }, () => 'fixture'))
})
