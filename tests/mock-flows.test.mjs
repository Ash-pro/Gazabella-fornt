import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const memory = new Map()
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() }
let server, api, db, operations, formatPrice
before(async () => {
  server = await createServer({ configFile:false, cacheDir:'node_modules/.vite-tests', server:{middlewareMode:true,hmr:{port:24682}}, appType:'custom', define:{'import.meta.env.VITE_MOCK_DELAY_MS':'"0"'} })
  api = (await server.ssrLoadModule('/src/mock/mockServices.ts')).mockServices
  db = await server.ssrLoadModule('/src/mock/mockDatabase.ts')
  operations = await server.ssrLoadModule('/src/mock/demoOperations.ts')
  formatPrice = (await server.ssrLoadModule('/src/lib/format.ts')).formatPrice
})
after(async () => { await server?.close() })
beforeEach(() => memory.clear())
const address = {name:'عميلة تجريبية',email:'test@example.test',phone:'0599000000',address:'عنوان اختبار محلي فقط',payment_method:'cash_on_delivery'}

test('prices preserve fractional amounts', () => {
  assert.equal(formatPrice('19.50'),'₪19.50')
  assert.equal(formatPrice('103.20'),'₪103.20')
})
test('catalog pagination and product detail agree on effective price', async () => {
  const first=await api.getProducts({per_page:3,page:1}), second=await api.getProducts({per_page:3,page:2})
  assert.equal(first.data.length,3)
  assert(!first.data.some(p=>second.data.some(q=>q.id===p.id)))
  for(const product of first.data) {
    const detail=await api.getProduct(product.slug)
    assert.equal(detail.discount_price ?? detail.price,product.discount_price ?? product.price)
  }
})
test('cart rejects excessive or fractional quantities without changing stored cart', async () => {
  await api.clearCart()
  const p=(await api.getProducts({})).data.find(p=>p.in_stock)
  await api.addToCart(p.id,1)
  const before=await api.getCart()
  await assert.rejects(api.addToCart(p.id,100000))
  await assert.rejects(api.addToCart(p.id,1.5))
  assert.deepEqual(await api.getCart(),before)
})
test('cart update and removal keep totals consistent', async () => {
  await api.clearCart()
  const p=(await api.getProducts({})).data.find(p=>p.stock>=2)
  const added=await api.addToCart(p.id,1)
  const updated=await api.updateCartItem(added.items[0].id,2)
  assert.equal(Number(updated.subtotal),Number(updated.items[0].unit_price)*2)
  assert.equal(updated.total_items,2)
  assert.equal((await api.removeCartItem(updated.items[0].id)).total_items,0)
})
test('empty checkout is rejected', async () => {
  await api.clearCart()
  await assert.rejects(api.checkout(address))
})
test('COD checkout stays unpaid and creates a matching delivery mission', async () => {
  const before=(await api.getOrders()).data.length
  const order=await api.checkout(address)
  assert.equal(order.payment_method,'cash_on_delivery')
  assert.equal(order.payment_status,'unpaid')
  assert.equal(Number(order.total),Number(order.subtotal)+Number(order.delivery_fee))
  assert.equal((await api.getOrders()).data.length,before+1)
  assert.equal((await api.getCart()).total_items,0)
  assert.equal((await api.getOrder(order.order_number)).id,order.id)
  assert.equal((await api.getDeliveryMissions()).find(m=>m.order_number===order.order_number).payment_method,'cash_on_delivery')
  await assert.rejects(api.initPayment(order.order_number),/عند الاستلام/)
  await assert.rejects(api.checkout(address))
})
test('wishlist toggles persist and include full product records', async () => {
  const p=(await api.getProducts({})).data[0]
  assert.equal((await api.toggleWishlist(p.slug)).wishlisted,true)
  assert.equal((await api.getWishlist())[0].id,p.id)
  assert.equal((await api.toggleWishlist(p.slug)).wishlisted,false)
  assert.deepEqual(await api.getWishlist(),[])
})
test('delivery cannot skip pickup or bypass PIN validation', async () => {
  await assert.rejects(api.updateDeliveryStatus(2,'in_transit'))
  await assert.rejects(api.updateDeliveryStatus(1,'delivered'))
  assert.throws(()=>operations.demoConfirmDelivery(1,'1111'),/غير صحيح/)
})
test('valid PIN starts review window and duplicate disputes are idempotent', async () => {
  operations.demoConfirmDelivery(1,'4829')
  const order=await api.getOrder('GAZ-2026-0014')
  assert.equal(order.status,'delivered')
  assert(Math.abs(Date.parse(order.escrow_expires_at)-Date.now()-48*3600_000)<1000)
  const first=operations.demoOpenDispute(order.order_number,'مشكلة تجريبية في المنتج المستلم')
  assert.equal(operations.demoOpenDispute(order.order_number,'وصف آخر لنفس المشكلة التجريبية').id,first.id)
})
test('disputes rejected before delivery and after review window', async () => {
  assert.throws(()=>operations.demoOpenDispute('GAZ-2026-0014','مشكلة تجريبية في المنتج'))
  operations.demoConfirmDelivery(1,'4829')
  const orders=db.getStoredOrders()
  orders.find(o=>o.id===14).escrow_expires_at=new Date(Date.now()-1000).toISOString()
  db.saveStoredOrders(orders)
  assert.throws(()=>operations.demoOpenDispute('GAZ-2026-0014','مشكلة تجريبية في المنتج'))
})

test('merchant stock updates affect customer product availability',async()=>{
  const product=(await api.getProducts({})).data[0]
  operations.demoSetStock(product.id,0)
  assert.equal((await api.getProduct(product.slug)).stock,0)
  assert.equal((await api.getProduct(product.slug)).in_stock,false)
  await assert.rejects(api.addToCart(product.id,1))
})
test('mock discount is lower than original price',async()=>{
  const products=(await api.getProducts({per_page:100})).data
  for(const p of products) if(p.discount_price!==null) assert(p.discount_price<p.price)
})
