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
  const order=module.normalizeOrder({id:1,items:[],subtotal:10,total:10,delivery_fee:0,status:'pending'})
  assert.equal(order.delivery_fee,'0');assert.equal(order.payment_status,'unknown')
})
test('invalid authentication payload does not establish a session',async()=>{
  client.apiClient.defaults.adapter=async config=>respond({data:{user:{id:1}}},config)
  await assert.rejects(api.login('test@example.test','test'),/غير مكتملة/)
  assert.equal(auth.getState().token,null)
})
test('guest cart bootstrap is shared by concurrent callers',async()=>{
  let count=0
  client.apiClient.defaults.adapter=async config=>{count++;await new Promise(resolve=>setTimeout(resolve,10));return respond({data:{id:1,token:'one-cart',items:[],items_count:0,subtotal:0}},config)}
  await Promise.all([api.getCart(),api.getCart()]);assert.equal(count,1)
})
