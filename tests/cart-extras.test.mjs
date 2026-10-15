import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, fx
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() } }
before(async () => {
  globalThis.sessionStorage = mem(); globalThis.localStorage = mem()
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-cart-extras-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  fx = await server.ssrLoadModule('/src/fixtures/cartExtras.ts')
})
after(async () => { await server?.close() })
beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

const cart = (subtotal) => ({ items: [{ id: 1 }], total_items: 1, subtotal: String(subtotal) })

test('percent coupon discounts the subtotal and is marked demo', () => {
  fx.demoApplyCoupon('gaza10', 200)
  const c = fx.withDemoCoupon(cart(200))
  assert.equal(c.discount, '20.00'); assert.equal(c.total, '180.00'); assert.equal(c.coupon.demo, true)
})

test('minimum subtotal is enforced with the server error shape', () => {
  assert.throws(() => fx.demoApplyCoupon('WELCOME15', 80), (e) => e.response.status === 422 && e.response.data.error.code === 'COUPON_MIN_SUBTOTAL' && e.response.data.error.details.min_subtotal === 100)
  assert.throws(() => fx.demoApplyCoupon('NOPE', 500), (e) => e.response.data.error.code === 'COUPON_INVALID')
})

test('a real server coupon is never replaced by the demo one', () => {
  fx.demoApplyCoupon('GAZA10', 200)
  const real = { ...cart(200), coupon: { code: 'REAL', discount: '5.00' }, discount: '5.00', total: '195.00' }
  assert.deepEqual(fx.withDemoCoupon(real), real)
})

test('address book keeps exactly one default', () => {
  const base = { label: 'البيت', recipient_name: 'سارة', phone: '0599123456', city: 'خان يونس', neighborhood: 'الكتيبة', street: 'شارع جلال', is_default: false }
  const a = fx.demoSaveAddress(base)
  assert.equal(a.is_default, true, 'first address becomes default')
  const b = fx.demoSaveAddress({ ...base, label: 'العمل', is_default: true })
  assert.deepEqual(fx.demoAddresses().filter((x) => x.is_default).map((x) => x.id), [b.id])
  fx.demoDeleteAddress(b.id)
  assert.equal(fx.demoAddresses()[0].is_default, true, 'default moves when the default is deleted')
})
