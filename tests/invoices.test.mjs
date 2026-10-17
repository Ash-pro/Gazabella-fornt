// INV — الفواتير: الباركود، اتساق البيانات التجريبية، قواعد الإصدار في Mock، تطبيع ردود الـ API، وعدم تسريب بيانات المتاجر
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { scanForLeaks } from './lib/leakScan.mjs'

const memory = new Map()
globalThis.localStorage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: (k) => memory.delete(k), clear: () => memory.clear() }
globalThis.sessionStorage = globalThis.localStorage
const STORE_NAMES = ['متجر روز غزة', 'بوتيك سحر الشرق', 'لافندر كوزمتكس']

let server, apiServer, bc, fx, mock, invoices, gz, apiInvoices, apiClient
before(async () => {
  const axiosAlias = { axios: new URL('../node_modules/axios/dist/esm/axios.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') }
  server = await createServer({ configFile: false, resolve: { alias: axiosAlias }, cacheDir: 'node_modules/.vite-invoice-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom',
    define: { 'import.meta.env.VITE_DATA_SOURCE': '"mock"', 'import.meta.env.VITE_MOCK_DELAY_MS': '"0"' } })
  bc = await server.ssrLoadModule('/src/lib/barcode128.ts')
  fx = await server.ssrLoadModule('/src/fixtures/invoices.ts')
  mock = (await server.ssrLoadModule('/src/mock/mockServices.ts')).mockServices
  invoices = await server.ssrLoadModule('/src/api/invoices.ts')
  gz = await server.ssrLoadModule('/src/api/gazabella.ts')
  // نسخة ثانية بوضع API حقيقي لاختبار التطبيع ومسارات الطلب
  apiServer = await createServer({ configFile: false, resolve: { alias: axiosAlias }, cacheDir: 'node_modules/.vite-invoice-api-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom',
    define: { 'import.meta.env.VITE_DATA_SOURCE': '"api"' } })
  apiInvoices = await apiServer.ssrLoadModule('/src/api/invoices.ts')
  apiClient = (await apiServer.ssrLoadModule('/src/lib/apiClient.ts')).apiClient
})
after(async () => { await server?.close(); await apiServer?.close() })
beforeEach(() => memory.clear())

const cents = (v) => Math.round(Number(v) * 100)

test('Code128-B: 106 unique patterns of 11 modules, start/checksum/stop layout', () => {
  assert.equal(bc.CODE128_PATTERNS.length, 106)
  assert.equal(new Set(bc.CODE128_PATTERNS).size, 106)
  for (const p of bc.CODE128_PATTERNS) assert.equal([...p].reduce((s, d) => s + Number(d), 0), 11, p)
  const text = 'GZB-INV-2026-000101'
  const values = bc.code128Values(text)
  assert.equal(values[0], 104)
  assert.equal(values.length, text.length + 2)
  const expected = (104 + [...text].reduce((s, ch, i) => s + (ch.charCodeAt(0) - 32) * (i + 1), 0)) % 103
  assert.equal(values.at(-1), expected)
  const widths = bc.code128Widths(text)
  assert.equal(widths.reduce((a, b) => a + b, 0), 11 * values.length + 13)
  assert.equal(widths.length % 2, 1, 'starts and ends with a bar')
  assert.throws(() => bc.code128Values('فاتورة'))
  assert.throws(() => bc.code128Values(''))
})

test('demo invoices: amounts add up, numbering is valid, payments are Jawwal Pay/wallet only (INV-1/2)', () => {
  assert.ok(fx.DEMO_INVOICES.length >= 5)
  for (const inv of fx.DEMO_INVOICES) {
    assert.match(inv.invoice_number, invoices.INVOICE_NUMBER)
    const lines = inv.items.reduce((s, i) => s + cents(i.line_total), 0)
    assert.equal(lines, cents(inv.subtotal), inv.invoice_number)
    for (const i of inv.items) assert.equal(cents(i.line_total), cents(i.unit_price) * i.quantity)
    assert.equal(cents(inv.subtotal) - cents(inv.discount_amount ?? 0) + cents(inv.delivery_fee), cents(inv.total), inv.invoice_number)
    assert.equal(inv.payments.reduce((s, p) => s + cents(p.amount), 0), cents(inv.total), 'payments cover the total')
    for (const p of inv.payments) assert.ok(['jawwal_pay', 'wallet'].includes(p.method))
    const credited = inv.credit_notes.reduce((s, c) => s + cents(c.amount), 0)
    assert.equal(credited, cents(inv.credited_total))
    assert.equal(inv.status, credited === 0 ? 'issued' : credited >= cents(inv.total) ? 'credited' : 'partially_credited')
    assert.ok(!/tax|vat|ضريب/i.test(JSON.stringify(inv)), 'no tax fields (INV-1)')
    assert.match(inv.customer.phone_masked, /^\d{3}•••\d{4}$/)
  }
  const statuses = new Set(fx.DEMO_INVOICES.map((i) => i.status))
  assert.ok(statuses.has('issued') && statuses.has('partially_credited'))
  assert.ok(fx.DEMO_INVOICES.some((i) => i.payments.length === 2), 'one mixed wallet + Jawwal Pay invoice')
  assert.ok(fx.DEMO_INVOICES.some((i) => i.coupon_code && i.discount_amount), 'one coupon invoice')
  assert.ok(fx.DEMO_INVOICES.some((i) => i.delivery_fee === '0.00' && i.delivery_fee_original), 'one free-delivery invoice')
})

test('mock: completed demo orders carry their invoice; unpaid/cancelled orders have none', async () => {
  const orders = (await mock.getOrders()).data
  for (const inv of fx.DEMO_INVOICES) {
    const order = orders.find((o) => o.order_number === inv.order_number)
    assert.ok(order, inv.order_number)
    assert.equal(order.invoice.invoice_number, inv.invoice_number)
    assert.equal(order.total, inv.total)
  }
  assert.equal(orders.find((o) => o.order_number === 'GAZ-2026-0020').invoice, null)
  assert.equal(orders.find((o) => o.order_number === 'GAZ-2026-0021').invoice, null)
  // الزرع لا يتكرر
  const again = (await mock.getOrders()).data
  assert.equal(again.length, orders.length)
})

test('mock: invoice is issued once on Jawwal Pay confirmation, never for unpaid or COD orders (INV-2/3)', async () => {
  const before = (await mock.getInvoices()).data.length
  await mock.getOrder('GAZ-2026-0020')
  assert.equal((await mock.getInvoices()).data.length, before, 'pending order → no invoice')

  await mock.initPayment('GAZ-2026-0020')
  const paid = await mock.getOrder('GAZ-2026-0020')
  assert.equal(paid.payment_status, 'paid'); assert.equal(paid.status, 'confirmed')
  assert.match(paid.invoice.invoice_number, invoices.INVOICE_NUMBER)
  const list = (await mock.getInvoices()).data
  assert.equal(list.length, before + 1)
  // ترقيم متسلسل بلا تكرار: الجديدة أكبر رقم في سنتها
  const year = paid.invoice.invoice_number.slice(8, 12)
  const seqs = list.filter((i) => i.invoice_number.startsWith(`GZB-INV-${year}-`)).map((i) => Number(i.invoice_number.slice(-6)))
  assert.equal(new Set(list.map((i) => i.invoice_number)).size, list.length)
  assert.equal(Math.max(...seqs), Number(paid.invoice.invoice_number.slice(-6)))
  // إعادة التأكيد لا تنشئ فاتورة ثانية
  await gz.gazabellaApi.confirmJawwalPayment('GAZ-2026-0020', 'JP-RETRY')
  assert.equal((await mock.getInvoices()).data.length, before + 1)
  const full = await mock.getInvoice(paid.invoice.invoice_number)
  assert.equal(full.total, paid.total)
  assert.match(full.verify_token, /^[A-Za-z0-9]{16,80}$/)
  assert.deepEqual(Object.keys(await mock.verifyInvoice(full.verify_token)).sort(), ['currency', 'invoice_number', 'issued_at', 'status', 'total'])

  // طلب دفع عند الاستلام (وضع العرض فقط) — لا فاتورة حتى بعد «الدفع»
  const p = (await mock.getProducts({})).data.find((x) => x.in_stock)
  await mock.addToCart(p.id, 1)
  const cod = await mock.checkout({ name: 'اختبار', phone: '0599000000', address: 'عنوان', payment_method: 'cod' })
  assert.equal(cod.invoice, null)
  await gz.gazabellaApi.confirmJawwalPayment(cod.order_number, 'x')
  assert.equal((await mock.getOrder(cod.order_number)).invoice, null)
  assert.equal((await mock.getInvoices()).data.length, before + 1)
})

test('mock: new order numbers never collide with demo orders', async () => {
  const p = (await mock.getProducts({})).data.find((x) => x.in_stock)
  await mock.addToCart(p.id, 1)
  const order = await mock.checkout({ name: 'اختبار', phone: '0599000000', address: 'عنوان', payment_method: 'jawwal_pay' })
  assert.ok(!fx.DEMO_ORDER_NUMBERS.includes(order.order_number), order.order_number)
})

test('front API (mock): list/detail/verify sourced as demo, unknown numbers and bad tokens are 404', async () => {
  const list = await invoices.listInvoices()
  assert.equal(list.demo, true)
  assert.ok(list.data.meta.years.includes(2026) && list.data.meta.years.includes(2025))
  const y2025 = await invoices.listInvoices(2025)
  assert.ok(y2025.data.data.every((i) => i.issued_at.startsWith('2025')))
  const one = await invoices.getInvoice(list.data.data[0].invoice_number)
  assert.equal(one.data.invoice_number, list.data.data[0].invoice_number)
  await assert.rejects(invoices.getInvoice('GZB-INV-2026-999999'), (e) => e.response?.status === 404)
  await assert.rejects(invoices.getInvoice('../orders/1'), (e) => e.response?.status === 404)
  await assert.rejects(invoices.verifyInvoice('x'), (e) => e.response?.status === 404)
  assert.deepEqual(await invoices.downloadInvoicePdf(one.data.invoice_number, true), { kind: 'print' })
})

test('mock customer API: invoices expose no store identity (D-12)', async () => {
  const list = await invoices.listInvoices()
  assert.deepEqual(scanForLeaks(list, { storeNames: STORE_NAMES }), [])
  for (const s of list.data.data) assert.deepEqual(scanForLeaks(await invoices.getInvoice(s.invoice_number), { storeNames: STORE_NAMES }), [])
})

test('API: normalizes invoice payloads, rejects invalid amounts, drops unknown payment methods', async () => {
  const raw = {
    invoice_number: 'GZB-INV-2026-000200', order_number: 'GAZ-2026-0300', status: 'weird', issued_at: '2026-10-01T10:00:00Z', total: 50, credited_total: null,
    payment_methods: ['jawwal_pay', 'cod'], items_count: 1, first_item: 'سيروم',
    seller: { name: 'Gazabella', address: { ar: 'خان يونس' } }, customer: { name: 'س', phone_masked: '059•••1111' },
    items: [{ id: 1, name: { ar: 'سيروم', en: 'Serum' }, quantity: 1, unit_price: 45, line_total: 45 }],
    subtotal: 45, delivery_fee: 5, payments: [{ method: 'jawwal_pay', amount: 50, reference: 'JP-1', paid_at: '2026-10-01T10:00:00Z' }, { method: 'cod', amount: 1, paid_at: '' }],
    credit_notes: [], verify_token: 'abcdefghijklmnop1234',
  }
  const inv = apiInvoices.normalizeInvoice(raw)
  assert.equal(inv.status, 'issued'); assert.equal(inv.total, '50.00'); assert.equal(inv.credited_total, '0.00')
  assert.deepEqual(inv.payment_methods, ['jawwal_pay']); assert.equal(inv.payments.length, 1)
  assert.deepEqual(inv.first_item, { ar: 'سيروم', en: 'سيروم' }); assert.deepEqual(inv.seller.address, { ar: 'خان يونس', en: 'خان يونس' })
  assert.throws(() => apiInvoices.normalizeInvoice({ ...raw, total: -1 }))
  assert.throws(() => apiInvoices.normalizeInvoice({ ...raw, invoice_number: '<script>' }))

  // الطلب: undefined = الخادم لا يدعم الفواتير بعد · null = لم تصدر
  assert.equal(gz.normalizeInvoiceRef(undefined), undefined)
  assert.equal(gz.normalizeInvoiceRef(null), null)
  assert.deepEqual(gz.normalizeInvoiceRef({ invoice_number: 'GZB-INV-2026-000200', status: 'credited', issued_at: 'x' }), { invoice_number: 'GZB-INV-2026-000200', status: 'credited', issued_at: 'x' })

  // المسارات والمعاملات الموثقة + رفض حفظ رد ليس PDF
  const seen = []
  apiClient.defaults.adapter = async (config) => {
    seen.push(`${config.url}|${config.params?.locale ?? ''}|${config.responseType ?? ''}`)
    if (config.url.endsWith('/pdf')) return { data: new Blob(['<html>'], { type: 'text/html' }), status: 200, statusText: 'OK', headers: {}, config }
    return { data: { data: raw }, status: 200, statusText: 'OK', headers: {}, config }
  }
  assert.equal((await apiInvoices.getInvoice('GZB-INV-2026-000200')).demo, false)
  await assert.rejects(apiInvoices.downloadInvoicePdf('GZB-INV-2026-000200', false), /تعذّر تجهيز ملف الفاتورة/)
  assert.deepEqual(seen, ['/invoices/GZB-INV-2026-000200||', '/invoices/GZB-INV-2026-000200/pdf|ar|blob'])
})
