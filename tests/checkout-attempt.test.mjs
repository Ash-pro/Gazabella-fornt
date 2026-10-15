import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, m
const store = new Map()
before(async () => {
  globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-checkout-attempt-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  m = await server.ssrLoadModule('/src/lib/checkoutAttempt.ts')
})
after(async () => { await server?.close() })
beforeEach(() => store.clear())

const body = { payload: { name: 'سارة', phone: '0599123456', address: 'خانيونس', payment_method: 'cod' }, cart: '1:2,7:1' }

test('same payload reuses the key — retry after a dropped connection is safe', () => {
  const k1 = m.idempotencyKeyFor(body)
  const k2 = m.idempotencyKeyFor({ cart: body.cart, payload: { payment_method: 'cod', address: 'خانيونس', phone: '0599123456', name: 'سارة' } })
  assert.match(k1, /^[0-9a-f-]{36}$/)
  assert.equal(k1, k2, 'field order must not change the key')
})

test('changed address or cart gets a new key (no 409 on edited data, no replay of an old order)', () => {
  const k1 = m.idempotencyKeyFor(body)
  assert.notEqual(m.idempotencyKeyFor({ ...body, payload: { ...body.payload, address: 'رفح' } }), k1)
  const k2 = m.idempotencyKeyFor(body)
  assert.notEqual(m.idempotencyKeyFor({ ...body, cart: '1:3,7:1' }), k2)
})

test('clearing after success starts a fresh purchase intent', () => {
  const k1 = m.idempotencyKeyFor(body)
  m.clearCheckoutAttempt()
  assert.notEqual(m.idempotencyKeyFor(body), k1)
})

test('error classification', () => {
  const e = (status, code) => ({ response: { status, data: code ? { error: { code } } : {} } })
  assert.equal(m.classifyCheckoutError({ code: 'ERR_NETWORK' }), 'uncertain')
  assert.equal(m.classifyCheckoutError(e(503)), 'uncertain')
  assert.equal(m.classifyCheckoutError(e(408)), 'uncertain')
  assert.equal(m.classifyCheckoutError(e(409, 'IDEMPOTENCY_IN_PROGRESS')), 'uncertain')
  assert.equal(m.classifyCheckoutError(e(409, 'IDEMPOTENCY_KEY_REUSED')), 'key_reused')
  assert.equal(m.classifyCheckoutError(e(409, 'STOCK_CHANGED')), 'rejected')
  assert.equal(m.classifyCheckoutError(e(422)), 'rejected')
  assert.equal(m.classifyCheckoutError(e(401)), 'transient')
  assert.equal(m.classifyCheckoutError(e(429)), 'transient')
  assert.equal(m.classifyCheckoutError({ response: { status: 409, data: { code: 'IDEMPOTENCY_KEY_MISMATCH' } } }), 'key_reused')
})
