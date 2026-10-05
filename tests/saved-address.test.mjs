import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, m
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-saved-address-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  m = await server.ssrLoadModule('/src/lib/savedAddress.ts')
})
after(() => server?.close())

const zones = ['خان يونس', 'رفح', 'مدينة غزة']

test('savedAddressFrom: comma, dash and slash separators split neighborhood from street', () => {
  assert.deepEqual(m.savedAddressFrom({ city: 'خان يونس', address: 'حي الأمل، شارع البحر' }, zones), { city: 'خان يونس', neighborhood: 'حي الأمل', street: 'شارع البحر' })
  assert.deepEqual(m.savedAddressFrom({ city: 'خان يونس', address: 'حي الامل - بجوار الشؤون الاجتماعية' }, zones), { city: 'خان يونس', neighborhood: 'حي الامل', street: 'بجوار الشؤون الاجتماعية' })
  assert.deepEqual(m.savedAddressFrom({ city: 'رفح', address: 'تل السلطان / قرب المسجد' }, zones).neighborhood, 'تل السلطان')
})

test('savedAddressFrom: city matches a zone loosely, or is found inside the address', () => {
  assert.equal(m.savedAddressFrom({ city: 'خانيونس', address: 'حي الأمل - شارع 5' }, zones).city, 'خان يونس')
  assert.equal(m.savedAddressFrom({ city: 'غزة', address: 'الرمال - شارع الوحدة' }, zones).city, 'مدينة غزة')
  assert.deepEqual(m.savedAddressFrom({ city: '', address: 'خان يونس - حي الامل - بجوار الشؤون' }, zones), { city: 'خان يونس', neighborhood: 'حي الامل', street: 'بجوار الشؤون' })
  assert.equal(m.savedAddressFrom({ city: 'نابلس', address: 'وسط البلد - شارع 1' }, zones).city, '')
})

test('savedAddressFrom: single segment goes to street; empty profile is null', () => {
  assert.deepEqual(m.savedAddressFrom({ city: 'رفح', address: 'بجوار البلدية' }, zones), { city: 'رفح', neighborhood: '', street: 'بجوار البلدية' })
  assert.equal(m.savedAddressFrom({ city: null, address: null }, zones), null)
  assert.equal(m.savedAddressFrom(null, zones), null)
})

test('tracked order cache: round-trips per order number, marks as local, ignores other orders', async () => {
  const store = new Map()
  globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  const t = await server.ssrLoadModule('/src/lib/orderTracking.ts')
  assert.equal(t.loadTracked('GZ-1'), null)
  t.saveTracked({ order_number: 'GZ-261005-5JTYB5', status: 'shipped', items: [], tracking: [] }, '0598466903')
  const hit = t.loadTracked('gz-261005-5jtyb5')
  assert.equal(hit.order.status, 'shipped'); assert.equal(hit.order.local, true); assert.equal(hit.phone, '0598466903')
  assert.equal(t.loadTracked('GZ-OTHER'), null)
  assert.equal(t.loadTracked().order.order_number, 'GZ-261005-5JTYB5')
  delete globalThis.sessionStorage
})
