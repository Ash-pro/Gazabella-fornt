import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const memory=new Map()
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)}
let server, api, client, auth, module
before(async()=>{
  server=await createServer({configFile:false,resolve:{alias:{axios:new URL("../node_modules/axios/dist/esm/axios.js",import.meta.url).pathname.replace(/^\/(\w:)/,"$1")}},cacheDir:'node_modules/.vite-api-tests',server:{middlewareMode:true,hmr:{port:24681}},appType:'custom',define:{'import.meta.env.VITE_DATA_SOURCE':'"api"','import.meta.env.VITE_STORAGE_URL':'"https://api.example.test"'}})
  module=await server.ssrLoadModule('/src/api/gazabella.ts'); api=module.gazabellaApi
  client=await server.ssrLoadModule('/src/lib/apiClient.ts')
  auth=(await server.ssrLoadModule('/src/stores/authStore.ts')).useAuthStore
})
after(async()=>{await server?.close()})
beforeEach(()=>{memory.clear();auth.getState().clearSession();client.apiClient.defaults.adapter=async()=>{throw Error('Unexpected network request')}})
const respond=(data,config,headers={})=>({data,status:200,statusText:'OK',headers,config})
test('catalog sends documented IDs and numeric Laravel boolean parameters',async()=>{
  client.apiClient.defaults.adapter=async config=>{
    assert.equal(config.url,'/products');assert.equal(config.params.category_id,7)
    assert.equal(config.params.in_stock,1);assert.equal(config.params.featured,0)
    assert(!('category_slug' in config.params));assert.equal(config.headers.get('Accept-Language'),'ar')
    return respond({data:[],meta:{current_page:1,last_page:1,per_page:15,total:0}},config)
  }
  await api.getProducts({category_id:7,category_slug:'ignored',in_stock:true,featured:false})
})
test('paginated categories are completely fetched and missing children normalized',async()=>{
  const pages=[]
  client.apiClient.defaults.adapter=async config=>{pages.push(config.params.page);return respond({data:[{id:config.params.page,name:'قسم',slug:'cat'+config.params.page}],meta:{last_page:2}},config)}
  const cats=await api.getCategories()
  assert.deepEqual(pages,[1,2]);assert.equal(cats.length,2);assert.deepEqual(cats[0].children,[])
})
test('settings and banner mappings match observed server field names',()=>{
  const settings=module.normalizeSettings({site_name:'Gazabella',support_email:'support@example.test',social:{instagram:'https://example.test'}})
  assert.equal(settings.store_name,'Gazabella');assert.equal(settings.email,'support@example.test')
  assert.equal(module.normalizeBanner({cta_text:'تسوق',cta_url:'/products'}).link_url,'/products')
})
test('guest cart identity persists and discount comparison uses original price',async()=>{
  client.apiClient.defaults.adapter=async config=>respond({data:{id:1,token:'guest-test',items:[{id:3,product:{id:2,name:'منتج',slug:'p',price:100,discount_price:80,stock:4,images:[]},quantity:2,unit_price:80,line_total:160}],items_count:2,subtotal:160}},config)
  const cart=await api.getCart()
  assert.equal(client.getCartToken(),'guest-test');assert.equal(cart.items[0].compare_at_price,'100');assert.equal(cart.subtotal,'160')
})
test('authenticated requests omit guest identity',async()=>{
  client.setCartToken('guest');auth.getState().setSession('customer',{id:1})
  client.apiClient.defaults.adapter=async config=>{assert.equal(config.headers.get('Authorization'),'Bearer customer');assert.equal(config.headers.get('X-Cart-Token'),undefined);return respond({data:[]},config)}
  await api.getWishlist()
})
test('guest requests use cart token and preserve external image origins',async()=>{
  client.setCartToken('guest')
  client.apiClient.defaults.adapter=async config=>{assert.equal(config.headers.get('X-Cart-Token'),'guest');return respond({data:[]},config)}
  await api.getWishlist()
  assert.equal(client.getImageUrl('https://cdn.example.test/p.jpg'),'https://cdn.example.test/p.jpg')
  assert.equal(client.getImageUrl('http://localhost/storage/p.jpg'),'https://api.example.test/storage/p.jpg')
})
test('real services never silently fall back to mock operational or payment data',async()=>{
  for(const run of [()=>api.getMerchantStores(),()=>api.getMerchantStats(),()=>api.getMerchantProducts(),()=>api.getMerchantOrders(),()=>api.getDeliveryStats(),()=>api.getDeliveryMissions(),()=>api.initPayment('x'),()=>api.checkout({})]) await assert.rejects(run())
})
test('order pagination is sent to the backend',async()=>{
  client.apiClient.defaults.adapter=async config=>{assert.equal(config.params.page,3);return respond({data:[],meta:{last_page:3,current_page:3}},config)}
  assert.equal((await api.getOrders(3)).meta.current_page,3)
})
test('product slugs are escaped as one path segment',async()=>{
  client.apiClient.defaults.adapter=async config=>{assert.equal(config.url,'/products/a%2Fb%3Fx');return respond({data:{}},config)}
  await api.getProduct('a/b?x')
})


test('missing order totals are rejected instead of displaying free shipping',()=>{
  assert.throws(()=>module.normalizeOrder({id:1,items:[],subtotal:10,total:10}),/مبالغ/)
  const order=module.normalizeOrder({id:1,items:[],subtotal:10,total:10,delivery_fee:0,status:'pending',payment_status:'pending'})
  assert.equal(order.delivery_fee,'0');assert.equal(order.payment_status,'pending')
})
test('delivery fee: normal fee passes through without waiver (D-22)',()=>{
  const o=module.normalizeOrder({id:1,items:[],subtotal:10,total:15,delivery_fee:5,status:'confirmed',payment_status:'pending'})
  assert.equal(o.delivery_fee,'5');assert.equal(o.delivery_waiver,null);assert.equal(o.delivery_fee_original,null)
})
test('delivery fee: compensation waiver keeps the original fee for strike-through (D-22)',()=>{
  const o=module.normalizeOrder({id:1,items:[],subtotal:10,total:10,delivery_fee:0,delivery_fee_original:'5.00',delivery_waiver:{reason:'compensation',label:'عرض تعويضي — توصيل مجاني'},status:'confirmed',payment_status:'pending'})
  assert.equal(o.delivery_fee,'0');assert.equal(o.delivery_fee_original,'5.00');assert.deepEqual(o.delivery_waiver,{reason:'compensation',label:'عرض تعويضي — توصيل مجاني'})
})
test('delivery fee: unknown waiver reason is ignored and original is dropped (D-22)',()=>{
  const o=module.normalizeOrder({id:1,items:[],subtotal:10,total:10,delivery_fee:0,delivery_fee_original:'5.00',delivery_waiver:{reason:'hack',label:'x'},status:'confirmed',payment_status:'pending'})
  assert.equal(o.delivery_waiver,null);assert.equal(o.delivery_fee_original,null)
})
test('payment methods: missing server list falls back to COD only (D-01, P1-FE-02)',async()=>{
  const pm=await server.ssrLoadModule('/src/lib/paymentMethods.ts')
  assert.deepEqual(pm.resolvePaymentMethods(undefined).map(m=>m.code),['cod'])
  assert.deepEqual(pm.resolvePaymentMethods([]).map(m=>m.code),['cod'])
  assert.deepEqual(pm.resolvePaymentMethods([{code:'cod',label:'x'},{code:'jawwal_pay',label:'y',is_sandbox:true}]).map(m=>m.code),['cod','jawwal_pay'])
  assert.deepEqual(pm.resolvePaymentMethods([{code:'bitcoin',label:'z'}]).map(m=>m.code),['cod'])
})
test('order status + payment method labels are unified (D-21, P1-FE-03)',async()=>{
  const os=await server.ssrLoadModule('/src/lib/orderStatus.ts')
  assert.equal(os.orderStatusLabel('pending'),'بانتظار التأكيد');assert.equal(os.orderStatusLabel('shipped'),'خرج للتوصيل')
  assert.equal(os.orderStatusLabel('delivered'),'تم التسليم');assert.equal(os.orderStatusLabel('weird'),'قيد المعالجة')
  assert.equal(os.paymentMethodLabel('cod'),'الدفع عند الاستلام');assert.equal(os.paymentMethodLabel('cash_on_delivery'),'الدفع عند الاستلام')
  assert.equal(os.paymentMethodLabel('jawwal_pay'),'جوال باي');assert.equal(os.paymentMethodLabel(undefined),'—')
})
test('realtime contract: channel, events, auth URL and invalidation keys (G-03, P1-FE-04)',async()=>{
  const rt=await server.ssrLoadModule('/src/lib/realtime.ts')
  assert.equal(rt.userChannel(7),'App.Models.User.7')
  assert.equal(rt.REALTIME_EVENTS.orderStatus,'.order.status.updated')
  assert.equal(rt.broadcastAuthUrl('http://127.0.0.1:8000/api/v1'),'http://127.0.0.1:8000/broadcasting/auth')
  assert.equal(rt.broadcastAuthUrl('/api/v1',undefined,'https://shop.test'),'https://shop.test/broadcasting/auth')
  assert.equal(rt.broadcastAuthUrl('http://x/api/v1','https://ws.test/auth'),'https://ws.test/auth')
  assert.deepEqual(rt.orderEventQueryKeys({order_number:'GAZ-2026-0042'}),[['orders'],['order','GAZ-2026-0042']])
  assert.deepEqual(rt.orderEventQueryKeys(null),[['orders'],['order']])
})
test('invalid authentication payload does not establish a session',async()=>{
  client.apiClient.defaults.adapter=async config=>respond({data:{user:{id:1}}},config)
  await assert.rejects(api.otpVerify('0591234567','123456'),/غير مكتملة/)
  assert.equal(auth.getState().token,null)
})
test('guest cart bootstrap is shared by concurrent callers',async()=>{
  let count=0
  client.apiClient.defaults.adapter=async config=>{count++;await new Promise(resolve=>setTimeout(resolve,10));return respond({data:{id:1,token:'one-cart',items:[],items_count:0,subtotal:0}},config)}
  await Promise.all([api.getCart(),api.getCart()]);assert.equal(count,1)
})

const otpUser = {id:1,name:'Customer',phone:'0591234567',role:'customer',created_at:'2026-09-25'}
const rawOrder = {id:1,order_number:'GAZ-2026-0001',status:'pending',items:[],subtotal:10,delivery_fee:5,total:15,payment_status:'pending',payment_method:'cod'}

test('OTP verify merges guest cart and clears token only after valid success',async()=>{
  client.setCartToken('guest')
  client.apiClient.defaults.adapter=async config=>{
    assert.equal(config.url,'/auth/otp/verify')
    assert.equal(config.headers.get('X-Cart-Token'),'guest')
    assert.deepEqual(JSON.parse(config.data),{phone:otpUser.phone,code:'123456',name:'Customer'})
    return respond({data:{token:'session',token_type:'Bearer',user:otpUser}},config)
  }
  const result=await api.otpVerify(otpUser.phone,'123456','Customer')
  assert.equal(result.user.phone,otpUser.phone);assert.equal(result.user.email,undefined)
  assert.equal(client.getCartToken(),null)
})

test('failed or malformed OTP verification preserves guest cart',async()=>{
  client.setCartToken('guest')
  client.apiClient.defaults.adapter=async()=>{throw Error('Invalid OTP')}
  await assert.rejects(api.otpVerify(otpUser.phone,'000000'))
  assert.equal(client.getCartToken(),'guest')
  client.apiClient.defaults.adapter=async config=>respond({data:{user:otpUser}},config)
  await assert.rejects(api.otpVerify(otpUser.phone,'123456'))
  assert.equal(client.getCartToken(),'guest')
})

test('OTP send contains only phone',async()=>{
  client.apiClient.defaults.adapter=async config=>{
    assert.equal(config.url,'/auth/otp/send')
    assert.deepEqual(JSON.parse(config.data),{phone:otpUser.phone})
    return respond({data:{message:'OTP sent'}},config)
  }
  assert.equal((await api.otpSend(otpUser.phone)).message,'OTP sent')
})

test('checkout posts cod with optional email omitted and normalizes totals',async()=>{
  const payload={name:'Customer',phone:otpUser.phone,address:'Test address',payment_method:'cod'}
  client.apiClient.defaults.adapter=async config=>{
    assert.equal(config.url,'/checkout');assert.equal(config.method,'post')
    assert.deepEqual(JSON.parse(config.data),payload)
    return respond({data:rawOrder},config)
  }
  const order=await api.checkout(payload)
  assert.equal(order.order_number,rawOrder.order_number);assert.equal(order.total,'15')
  assert.equal(order.payment_status,'pending')
})

test('Jawwal confirmation and reference lookup use the new contracts',async()=>{
  client.apiClient.defaults.adapter=async config=>{
    if(config.method==='post') {
      assert.equal(config.url,'/payments/jawwal/confirm')
      assert.deepEqual(JSON.parse(config.data),{order_number:rawOrder.order_number,reference:'ref-123'})
    } else {
      assert.equal(config.url,'/orders/lookup-by-reference')
      assert.deepEqual(config.params,{reference:'ref-123'})
    }
    return respond({data:{...rawOrder,payment_status:'paid',payment_reference:'ref-123',store_id:2,commission_amount:3}},config)
  }
  for(const order of [await api.confirmJawwalPayment(rawOrder.order_number,'ref-123'),await api.lookupOrderByReference('ref-123')]) {
    assert.equal(order.payment_status,'paid');assert.equal(order.payment_reference,'ref-123')
    assert(!('store_id' in order));assert(!('commission_amount' in order))
  }
  for(const status of ['pending','paid','failed','refunded']) assert.equal(module.normalizeOrder({...rawOrder,payment_status:status}).payment_status,status)
})
