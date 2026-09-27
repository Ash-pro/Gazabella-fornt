// Real HTTP integration against an isolated SQLite database. Never uses the configured remote API.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'
import { createServer as createTcpServer } from 'node:net'

const backend = resolve(process.env.MVP0_BACKEND_PATH || '../GazabellaOnlineStore/backend')
assert(existsSync(join(backend, 'artisan')), 'Set MVP0_BACKEND_PATH to the MVP0 Laravel backend')
const php = process.env.PHP_BINARY || 'C:/xampp/php/php.exe'
const temp = mkdtempSync(join(tmpdir(), 'gazabella-mvp0-test-'))
const db = join(temp, 'integration.sqlite')
writeFileSync(db, '')
const env = { ...process.env, APP_ENV: 'testing', APP_DEBUG: 'false', APP_KEY: 'base64:' + Buffer.alloc(32, 7).toString('base64'),
  APP_CONFIG_CACHE: join(temp, 'config.php'), DB_CONNECTION: 'sqlite', DB_DATABASE: db,
  CACHE_STORE: 'array', SESSION_DRIVER: 'array', QUEUE_CONNECTION: 'sync', BROADCAST_CONNECTION: 'log',
  FRONTEND_URL: 'http://127.0.0.1:5177',
  OTP_TEST_MODE: 'true', OTP_TEST_CODE: '123456', JAWWAL_PAY_SANDBOX: 'true' }
const migration = spawnSync(php, ['artisan', 'migrate', '--force', '--seed'], { cwd: backend, env, encoding: 'utf8' })
assert.equal(migration.status, 0, migration.stdout + migration.stderr)
const discountFixture = spawnSync(php, ['-r', `require 'vendor/autoload.php'; $app=require 'bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); App\\Models\\ProductVariant::where('sku','RB-50')->update(['compare_at_price'=>60]);`], { cwd: backend, env, encoding: 'utf8' })
assert.equal(discountFixture.status, 0, discountFixture.stdout + discountFixture.stderr)
const socket = createTcpServer()
await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(Number(process.env.MVP0_TEST_PORT || 0), '127.0.0.1', resolve) })
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))
const baseURL = `http://127.0.0.1:${port}/api/v1`
const child = spawn(php, ['-S', `127.0.0.1:${port}`, '-t', 'public', 'public/index.php'], { cwd: backend, env, windowsHide: true, stdio: 'ignore' })
let vite
try {
  let ready = false
  for (let i = 0; i < 50; i++) {
    try { ready = (await fetch(baseURL + '/health')).ok } catch {}
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert(ready, 'Local PHP test server did not start')
  const preflight = await fetch(baseURL + '/orders', { method: 'OPTIONS', headers: {
    Origin: env.FRONTEND_URL, 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type,x-guest-uuid,idempotency-key',
  } })
  assert.equal(preflight.headers.get('access-control-allow-origin'), env.FRONTEND_URL)
  assert(preflight.headers.get('access-control-allow-headers')?.toLowerCase().includes('idempotency-key'))
  const adminLogin = await fetch(`http://127.0.0.1:${port}/admin/login`)
  await adminLogin.text()
  assert.equal(adminLogin.status, 200, 'Admin login page must render')
  const adminProtected = await fetch(`http://127.0.0.1:${port}/admin`, { redirect: 'manual' })
  await adminProtected.text()
  assert.equal(adminProtected.status, 302, 'Anonymous visitors must not enter admin')
  assert(adminProtected.headers.get('location')?.endsWith('/admin/login'))
  const memory = new Map()
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) }
  vite = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-mvp0-http',
    resolve: { alias: { axios: new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') } },
    server: { middlewareMode: true, hmr: false }, appType: 'custom', define: {
      'import.meta.env.VITE_API_CONTRACT': '"mvp0"', 'import.meta.env.VITE_DATA_SOURCE': '"api"',
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(baseURL),
    } })
  const { gazabellaApi: api } = await vite.ssrLoadModule('/src/api/gazabella.ts')
  const { mvp0Checkout: checkout } = await vite.ssrLoadModule('/src/api/mvp0.ts')
  const { apiClient } = await vite.ssrLoadModule('/src/lib/apiClient.ts')
  apiClient.defaults.adapter = 'fetch'
  const { useAuthStore: auth } = await vite.ssrLoadModule('/src/stores/authStore.ts')
  const categories = await api.getCategories()
  assert(categories[0].children.length > 0)
  const products = await api.getProducts({ page: 1, per_page: 20 })
  assert(products.data.length > 0)
  const sale = products.data.find(p => p.slug === 'rose-black')
  assert.equal(sale.price, 60)
  assert.equal(sale.discount_price, 45)
  const saleDetail = await api.getProduct('rose-black')
  assert.equal(saleDetail.variants.find(v => v.name === '50ml').compare_at_price, 60)
  assert.equal(saleDetail.variants.find(v => v.name === '100ml').compare_at_price, null)
  const product = await api.getProduct(products.data[0].slug)
  const variant = product.variants.find(v => v.available_quantity >= 2)
  assert(variant)
  assert.equal((await api.getCart()).total_items, 0)
  assert.equal((await api.addToCart(variant.id, 2)).total_items, 2)
  await api.otpSend('0591234567')
  await assert.rejects(() => api.otpVerify('0591234567', '000000', 'عميل تجربة HTTP'), error => error.response?.status === 401)
  const session = await api.otpVerify('0591234567', '123456', 'عميل تجربة HTTP')
  auth.getState().setSession(session.token, session.user)
  assert.equal((await api.getMe()).phone, '+970591234567')
  assert.equal((await api.getCart()).total_items, 2, 'Guest cart must be merged')
  await checkout.reserve()
  const begin = await checkout.begin()
  assert(begin.expires_at && begin.reservation_extended)
  assert.equal((await checkout.begin()).reservation_extended, false)
  const delivery = begin.delivery_options[0]
  const quote = await checkout.quote(delivery.id, begin.active_cities[0])
  assert.equal(Number(quote.total), Number(quote.subtotal) + Number(quote.delivery_fee) - Number(quote.discount_amount))
  const payload = { address: { full_name: 'عميل تجربة HTTP', phone: '+970591234567', city: begin.active_cities[0], area: 'الأمل', details: 'عنوان اختبار محلي' }, delivery_option_id: delivery.id, payment_method: 'jawwal_pay', quote_token: quote.quote_token }
  const key = crypto.randomUUID()
  const order = await checkout.create(payload, key)
  assert.equal(order.payment_status, 'pending')
  assert.equal(order.total, quote.total)
  assert(order.address.includes('خانيونس'))
  assert.equal((await checkout.create(payload, key)).order_number, order.order_number)
  assert.equal((await api.getOrders()).data[0].order_number, order.order_number)
  assert.equal((await api.getOrder(order.order_number)).items[0].variant_name, variant.name)
  const payment = await api.initPayment(order.order_number)
  assert(new URL(payment.payment_url).hostname === 'sandbox.jawwalpay.ps')
  await apiClient.post('/payments/webhook', { merchant_ref: order.order_number, transaction_id: 'local-http-test', amount: order.total, status: 'SUCCESS' })
  const paid = await api.getOrder(order.order_number)
  assert.equal(paid.payment_status, 'paid')
  assert.equal(paid.status, 'confirmed')
  assert.equal((await api.getCart()).total_items, 0)
  writeFileSync(join(temp, 'result.json'), JSON.stringify({ passed: true, baseURL, otpMode: 'test_mode', categories: categories.length, order: order.order_number, payment: paid.payment_status }, null, 2))
  console.log('PASS: CORS, admin login/access guard, real HTTP catalog, variants, guest cart, OTP, merge, reservation, one extension, quote, idempotent order, history, sandbox webhook.')
  console.log(`Isolated test artifacts: ${temp}`)
} finally {
  await vite?.close()
  child.kill()
}
