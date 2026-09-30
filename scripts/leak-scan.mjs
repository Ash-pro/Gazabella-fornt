#!/usr/bin/env node
/**
 * P1-QA-02 — فحص تسريب هوية المتجر على API حقيقي (محلي / Staging / إنتاج).
 *
 *   node scripts/leak-scan.mjs --base http://127.0.0.1:8000/api/v1 [--token <sanctum>] [--stores "متجر أ,متجر ب"]
 *   (أو المتغيرات LEAK_SCAN_BASE_URL · LEAK_SCAN_TOKEN · LEAK_SCAN_STORE_NAMES)
 *
 * يفحص: /products · /products/{slug} · /cart (ضيف) · /orders · /orders/{order_number} (بتوكن)
 * يخرج بالرمز 1 عند أي مخالفة — مناسب لـ CI الليلي.
 */
import { randomUUID } from 'node:crypto'
import { scanForLeaks, formatFindings } from '../tests/lib/leakScan.mjs'

const arg = (name) => { const i = process.argv.indexOf('--' + name); return i > -1 ? process.argv[i + 1] : undefined }
const base = (arg('base') ?? process.env.LEAK_SCAN_BASE_URL ?? '').replace(/\/$/, '')
const token = arg('token') ?? process.env.LEAK_SCAN_TOKEN
const storeNames = (arg('stores') ?? process.env.LEAK_SCAN_STORE_NAMES ?? '').split(',').map((s) => s.trim()).filter(Boolean)
if (!base) { console.error('حدّد --base أو LEAK_SCAN_BASE_URL'); process.exit(2) }

const guest = randomUUID()
async function get(path, auth = false) {
  const headers = { Accept: 'application/json', 'Accept-Language': 'ar', 'X-Guest-UUID': guest }
  if (auth && token) headers.Authorization = 'Bearer ' + token
  const res = await fetch(base + path, { headers })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

let failed = 0, checked = 0
function check(label, body) {
  checked++
  const findings = scanForLeaks(body, { storeNames })
  console.log(formatFindings(label, findings))
  if (findings.length) failed++
}

const products = await get('/products?per_page=50')
check(`GET /products (${products.status})`, products.body)
const slug = products.body?.data?.[0]?.slug
if (slug) { const d = await get('/products/' + encodeURIComponent(slug)); check(`GET /products/${slug} (${d.status})`, d.body) }
const cart = await get('/cart'); check(`GET /cart ضيف (${cart.status})`, cart.body)
if (token) {
  const orders = await get('/orders', true); check(`GET /orders (${orders.status})`, orders.body)
  const num = orders.body?.data?.[0]?.order_number
  if (num) { const o = await get('/orders/' + encodeURIComponent(num), true); check(`GET /orders/${num} (${o.status})`, o.body) }
  const me = await get('/auth/me', true); check(`GET /auth/me (${me.status})`, me.body)
} else console.log('ℹ️  بدون --token: تم تخطي /orders و/auth/me')

console.log(`\n${failed ? '❌' : '✅'} ${checked - failed}/${checked} ردود نظيفة`)
process.exit(failed ? 1 : 0)
