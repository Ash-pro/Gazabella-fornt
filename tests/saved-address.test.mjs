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
