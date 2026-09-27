import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { scanForLeaks } from './lib/leakScan.mjs'

// ── وحدة الفاحص نفسه ──
test('leak scanner: catches forbidden keys at any depth (P1-QA-02)', () => {
  const f = scanForLeaks({ data: [{ id: 1, variants: [{ id: 2, store_id: 9 }] }], meta: { sub_orders: [] } })
  assert.deepEqual(f.map((x) => x.path), ['data[0].variants[0].store_id', 'meta.sub_orders'])
})
test('leak scanner: catches partner store names inside string values', () => {
  const f = scanForLeaks({ note: 'تم التجهيز في بوتيك سحر الشرق' }, { storeNames: ['بوتيك سحر الشرق'] })
  assert.equal(f.length, 1)
})
test('leak scanner: clean customer payload passes; settings.store_name is allowed', () => {
  assert.deepEqual(scanForLeaks({ order_number: 'GAZ-2026-0001', status: 'confirmed', total: '10.00' }), [])
  assert.deepEqual(scanForLeaks({ store_name: 'Gazabella' }, { context: 'settings' }), [])
})

// ── ما تستلمه واجهة العميل في وضع Mock ──
const memory = new Map()
globalThis.localStorage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: (k) => memory.delete(k) }
globalThis.sessionStorage = globalThis.localStorage
let server, api
const STORE_NAMES = ['متجر روز غزة', 'بوتيك سحر الشرق', 'لافندر كوزمتكس']
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-leak-tests', server: { middlewareMode: true, hmr: { port: 24682 } }, appType: 'custom',
    define: { 'import.meta.env.VITE_DATA_SOURCE': '"mock"', 'import.meta.env.VITE_MOCK_DELAY_MS': '"0"' } })
  api = (await server.ssrLoadModule('/src/api/gazabella.ts')).gazabellaApi
})
after(async () => { await server?.close() })

test('mock customer API: products list + detail expose no store identity (D-12)', async () => {
  const list = await api.getProducts({ page: 1, per_page: 50 })
  assert.deepEqual(scanForLeaks(list, { storeNames: STORE_NAMES }), [])
  const detail = await api.getProduct(list.data[0].slug)
  assert.deepEqual(scanForLeaks(detail, { storeNames: STORE_NAMES }), [])
})
test('mock customer API: orders expose no store identity', async () => {
  const orders = await api.getOrders(1)
  assert.deepEqual(scanForLeaks(orders, { storeNames: STORE_NAMES }), [])
  const one = await api.getOrder(orders.data[0].order_number)
  assert.deepEqual(scanForLeaks(one, { storeNames: STORE_NAMES }), [])
})
