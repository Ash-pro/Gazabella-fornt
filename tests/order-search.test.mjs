import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, m
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-order-search-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  m = await server.ssrLoadModule('/src/lib/orderSearch.ts')
})
after(() => server?.close())

const order = (o) => ({ id: 1, order_number: 'GZ-261001-8QQ51F', status: 'pending', total: '100.50', created_at: '2026-10-01T10:00:00Z', items: [{ id: 1, product_name: 'كريم مرطّب للبشرة', variant_name: 'Rose', quantity: 1 }], ...o })

test('orderMatches: number with/without dashes, case-insensitive', () => {
  assert.ok(m.orderMatches(order(), '8qq51f'))
  assert.ok(m.orderMatches(order(), '2610018QQ'))
  assert.ok(m.orderMatches(order(), 'gz-261001'))
  assert.ok(!m.orderMatches(order(), 'ZZ99'))
})

test('orderMatches: Arabic normalization + multi-word', () => {
  assert.ok(m.orderMatches(order(), 'كريم مرطب'))
  assert.ok(m.orderMatches(order(), 'للبشره'))
  assert.ok(m.orderMatches(order(), 'rose'))
  assert.ok(!m.orderMatches(order(), 'كريم شامبو'))
  assert.ok(m.orderMatches(order(), '   '))
})

test('groups, steps and summary', () => {
  assert.equal(m.orderGroup('shipped'), 'active')
  assert.equal(m.orderGroup('refunded'), 'cancelled')
  assert.equal(m.orderStepIndex('processing'), 2)
  assert.equal(m.orderStepIndex('cancelled'), -1)
  const list = [order(), order({ id: 2, status: 'delivered', total: '50' }), order({ id: 3, status: 'cancelled', total: '999' })]
  assert.deepEqual(m.summarizeOrders(list), { count: 3, active: 1, delivered: 1, spent: 150.5 })
  assert.deepEqual(m.countByGroup(list), { all: 3, active: 1, delivered: 1, cancelled: 1 })
  assert.ok(m.isOrderGroup('active') && !m.isOrderGroup('x') && !m.isOrderGroup(null))
})
