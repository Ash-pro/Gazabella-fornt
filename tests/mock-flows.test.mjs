import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key,value) => memory.set(key,String(value)),
  removeItem: (key) => memory.delete(key),
  clear: () => memory.clear(),
}
let server, api, db, operations
before(async () => {
  server = await createServer({ configFile:false, cacheDir:'node_modules/.vite-tests', server:{middlewareMode:true}, appType:'custom', define:{'import.meta.env.VITE_MOCK_DELAY_MS':'"0"'} })
  api = (await server.ssrLoadModule('/src/mock/mockServices.ts')).mockServices
  db = await server.ssrLoadModule('/src/mock/mockDatabase.ts')
  operations = await server.ssrLoadModule('/src/mock/demoOperations.ts')
})
after(async () => { await server?.close() })
beforeEach(() => memory.clear())
const address = {full_name:'عميلة تجريبية',phone:'+970599000000',city:'خانيونس',area:'حي الأمل',details:'عنوان تجريبي للعرض فقط'}

test('OTP rejects an arbitrary six-digit code', async () => {
  await assert.rejects(api.verifyOtp(address.phone,'111111'))
  assert.equal((await api.verifyOtp(address.phone,'123456')).user.phone,address.phone)
})
test('catalog uses the comparison price of the cheapest variant and paginates', async () => {
  const first = await api.getProducts({per_page:3,page:1})
  const second = await api.getProducts({per_page:3,page:2})
  assert.equal(first.data.length,3)
  assert.equal(first.meta.last_page,4)
  assert(!first.data.some((p) => second.data.some((q) => p.id === q.id)))
  const detail = await api.getProduct(first.data[0].slug)
  const cheapest = [...detail.variants].sort((a,b) => Number(a.price)-Number(b.price))[0]
  assert.equal(first.data[0].min_price,cheapest.price)
  assert.equal(first.data[0].compare_at_price,cheapest.compare_at_price)
})
test('stock limits apply to additions and final reservation', async () => {
  const cart = await api.getCart()
  await assert.rejects(api.addToCart(101,11))
  operations.demoSetStock(101,1)
  await assert.rejects(api.reserveCart(),/المخزون/)
  assert.equal((await api.getCart()).total_items,cart.total_items)
})
test('heartbeat never moves the expiry and expired reservations block checkout', async () => {
  const first = await api.heartbeat()
  assert.equal((await api.heartbeat()).expires_at,first.expires_at)
  const cart = await api.getCart()
  cart.items.forEach((item) => {item.reservation.expires_at=new Date(Date.now()-1000).toISOString()})
  db.saveStoredCart(cart)
  assert.equal((await api.heartbeat()).seconds_remaining,0)
  await assert.rejects(api.beginCheckout())
  await assert.rejects(api.createOrder({address,delivery_option_id:1}))
})
test('checkout extends at most once by 15 minutes', async () => {
  const cart = await api.getCart()
  const original = Date.parse(cart.items[0].reservation.expires_at)
  const first = await api.beginCheckout()
  const second = await api.beginCheckout()
  assert.equal(Date.parse(first.expires_at),original+15*60_000)
  assert.equal(second.expires_at,first.expires_at)
  assert.equal((await api.heartbeat()).expires_at,first.expires_at)
})
test('coupon is capped and a rejected delivery option cannot create an order', async () => {
  db.saveStoredCart({items:[],total_items:0,subtotal:'0.00',has_active_reservation:false})
  await api.addToCart(102,1)
  const session = await api.beginCheckout('GAZA2026')
  assert(Number(session.coupon.discount_amount) <= Number(session.cart.subtotal))
  await assert.rejects(api.createOrder({address,delivery_option_id:3}))
  await assert.rejects(api.createOrder({address,delivery_option_id:1,coupon_code:'INVALID'}))
})
test('payment retries refer to the same order, clear the cart, and sync the mission', async () => {
  const before = (await api.getOrders()).data.length
  await api.beginCheckout()
  const created = await api.createOrder({address,delivery_option_id:1})
  const one = await api.initPayment(created.data.id)
  const two = await api.initPayment(created.data.id)
  assert.equal(one.payment_id,two.payment_id)
  const orders = (await api.getOrders()).data
  assert.equal(orders.length,before+1)
  const itemIds=orders.flatMap((o) => o.items.map((i) => i.id))
  assert.equal(new Set(itemIds).size,itemIds.length)
  assert.equal((await api.getCart()).total_items,0)
  const order = await api.getOrder(created.data.order_number)
  assert.equal(order.tracking.filter((t) => t.status === 'confirmed').length,1)
  assert.equal((await api.getDeliveryMissions()).find((m) => m.order_number === order.order_number).payment_status,'paid')
})
test('inventory and prep changes persist and stores have distinct products', async () => {
  const one=await api.getMerchantProducts(1), two=await api.getMerchantProducts(2)
  assert(!one.some((p) => two.some((q) => p.id === q.id)))
  operations.demoSetStock(101,7)
  assert.equal((await api.getProduct(db.INITIAL_PRODUCTS[0].slug)).variants.find((v) => v.id === 101).available_quantity,7)
  await api.beginCheckout()
  const created=await api.createOrder({address,delivery_option_id:1})
  await api.initPayment(created.data.id)
  await api.updateOrderPrepStatus(created.data.items[0].id,'ready_for_pickup')
  assert.equal((await api.getMerchantOrders(1)).find((i) => i.order_number === created.data.order_number).prep_status,'ready_for_pickup')
})
test('delivery transitions cannot skip pickup or bypass PIN validation', async () => {
  await assert.rejects(api.updateDeliveryStatus(2,'in_transit'))
  await assert.rejects(api.updateDeliveryStatus(1,'delivered'))
  assert.throws(() => operations.demoConfirmDelivery(1,'1111'),/غير صحيح/)
  assert.equal((await api.getDeliveryMissions()).find((m) => m.id === 1).delivery_status,'in_transit')
})
test('valid PIN starts the 48-hour window; a dispute is persisted once', async () => {
  operations.demoConfirmDelivery(1,'4829')
  const order = await api.getOrder('GAZ-2026-0014')
  assert.equal(order.status,'delivered')
  assert(Math.abs(Date.parse(order.escrow_expires_at)-Date.now()-48*3600_000)<1000)
  const first=operations.demoOpenDispute(order.order_number,'مشكلة تجريبية في المنتج المستلم')
  const second=operations.demoOpenDispute(order.order_number,'وصف آخر لنفس المشكلة التجريبية')
  assert.equal(first.id,second.id)
  assert.equal(operations.demoDispute(order.order_number).id,first.id)
})
test('a dispute cannot be opened before delivery or after expiry', async () => {
  assert.throws(() => operations.demoOpenDispute('GAZ-2026-0014','مشكلة تجريبية في المنتج'))
  operations.demoConfirmDelivery(1,'4829')
  const orders=db.getStoredOrders()
  orders.find((o) => o.id === 14).escrow_expires_at=new Date(Date.now()-1000).toISOString()
  db.saveStoredOrders(orders)
  assert.throws(() => operations.demoOpenDispute('GAZ-2026-0014','مشكلة تجريبية في المنتج'))
})
