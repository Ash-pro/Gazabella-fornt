/**
 * INV — محاكاة إصدار الفواتير في وضع Mock (نفس قواعد الباك اند):
 *  · تصدر فقط لطلب مدفوع (payment_status = paid) عبر جوال باي/المحفظة — لا فواتير للدفع عند الاستلام (INV-2)
 *  · فاتورة واحدة لكل طلب (idempotent) وصورة ثابتة لا تتغير بعد الإصدار
 *  · ترقيم متسلسل لكل سنة GZB-INV-YYYY-NNNNNN
 */
import type { Invoice, InvoiceList, InvoiceRef, InvoiceSummary, InvoiceVerification, Order } from '../types/api'
import { DEMO_INVOICES, DEMO_SELLER, maskPhone } from '../fixtures/invoices'

const KEY = 'gazabella_mock_invoices'
/** الفواتير التجريبية الثابتة تنتهي عند 000131 لسنة 2026 — المحاكاة تكمل بعدها */
const FIRST_SEQUENCE = 140

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2)

function readIssued(): Invoice[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Invoice[]) : []
  } catch {
    return []
  }
}

function saveIssued(list: Invoice[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* التخزين غير متاح — تستمر المحاكاة بلا حفظ */ }
}

function randomToken(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return 'demo' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const isInvoiceable = (order: Order) =>
  order.payment_status === 'paid' && order.payment_method === 'jawwal_pay' && order.status !== 'cancelled'

export const toRef = (inv: Pick<Invoice, 'invoice_number' | 'status' | 'issued_at'>): InvoiceRef =>
  ({ invoice_number: inv.invoice_number, status: inv.status, issued_at: inv.issued_at })

/** مرجع فاتورة الطلب إن صدرت، أو null — بلا إصدار */
export function findMockInvoiceRef(order: Order): InvoiceRef | null {
  if (order.invoice) return order.invoice
  const found = readIssued().find((i) => i.order_number === order.order_number)
  return found ? toRef(found) : null
}

/** يصدر فاتورة لطلب مدفوع (مرة واحدة فقط) ويعيد مرجعها، أو null إن لم يكن الطلب قابلاً للفوترة */
export function issueMockInvoice(order: Order): InvoiceRef | null {
  const existing = findMockInvoiceRef(order)
  if (existing) return existing
  if (!isInvoiceable(order)) return null
  const issued = readIssued()

  // طلبات Mock القديمة المدفوعة بلا paid_at: تاريخ الطلب نفسه
  const paidAt = order.paid_at || order.created_at || new Date().toISOString()
  const year = new Date(paidAt).getFullYear()
  const prefix = `GZB-INV-${year}-`
  const used = [...DEMO_INVOICES, ...issued].filter((i) => i.invoice_number.startsWith(prefix)).map((i) => Number(i.invoice_number.slice(prefix.length)) || 0)
  const next = Math.max(FIRST_SEQUENCE - 1, ...used) + 1

  const total = Number(order.total) || 0
  const walletPart = Math.min(Number(order.wallet_applied) || 0, total)
  const items = order.items.map((item) => ({
    id: item.id,
    name: { ar: item.product_name, en: item.product_name },
    variant: item.variant_name ? { ar: item.variant_name, en: item.variant_name } : null,
    quantity: item.quantity,
    unit_price: money(Number(item.unit_price)),
    line_total: money(Number(item.subtotal)),
    credited_quantity: 0,
  }))
  const invoice: Invoice = {
    invoice_number: prefix + String(next).padStart(6, '0'),
    order_number: order.order_number,
    status: 'issued',
    issued_at: paidAt,
    paid_at: paidAt,
    currency: 'ILS',
    total: money(total),
    credited_total: '0.00',
    payment_methods: [...(walletPart > 0 ? ['wallet' as const] : []), ...(total - walletPart > 0 ? ['jawwal_pay' as const] : [])],
    items_count: order.items.length,
    first_item: items[0]?.name ?? null,
    verify_token: randomToken(),
    seller: DEMO_SELLER,
    customer: { name: order.name, phone_masked: maskPhone(order.phone), address: order.address || null },
    items,
    subtotal: money(Number(order.subtotal)),
    discount_amount: order.discount_amount && Number(order.discount_amount) > 0 ? money(Number(order.discount_amount)) : null,
    coupon_code: null,
    delivery_fee: money(Number(order.delivery_fee)),
    delivery_fee_original: order.delivery_fee_original ?? null,
    payments: [
      ...(walletPart > 0 ? [{ method: 'wallet' as const, amount: money(walletPart), reference: null, paid_at: paidAt }] : []),
      ...(total - walletPart > 0 ? [{ method: 'jawwal_pay' as const, amount: money(total - walletPart), reference: order.payment_reference ?? null, paid_at: paidAt }] : []),
    ],
    credit_notes: [],
  }
  saveIssued([invoice, ...issued])
  return toRef(invoice)
}

/** كل فواتير الحساب في Mock: الثابتة + الصادرة من طلبات المحاكاة (تُصدر عند القراءة لأي طلب مدفوع بلا فاتورة) */
export function allMockInvoices(orders: Order[]): Invoice[] {
  for (const order of orders) issueMockInvoice(order)
  const seen = new Set<string>()
  return [...readIssued(), ...DEMO_INVOICES]
    .filter((i) => (seen.has(i.invoice_number) ? false : (seen.add(i.invoice_number), true)))
    .sort((a, b) => Date.parse(b.issued_at) - Date.parse(a.issued_at))
}

export const toSummary = (inv: Invoice): InvoiceSummary => ({
  invoice_number: inv.invoice_number,
  order_number: inv.order_number,
  status: inv.status,
  issued_at: inv.issued_at,
  currency: inv.currency,
  total: inv.total,
  credited_total: inv.credited_total,
  payment_methods: inv.payment_methods,
  items_count: inv.items_count,
  first_item: inv.first_item,
})

export function invoiceList(all: Invoice[], year?: number): InvoiceList {
  const years = [...new Set(all.map((i) => new Date(i.issued_at).getFullYear()))].sort((a, b) => b - a)
  const data = (year ? all.filter((i) => new Date(i.issued_at).getFullYear() === year) : all).map(toSummary)
  return { data, meta: { current_page: 1, last_page: 1, per_page: Math.max(data.length, 1), total: data.length, years } }
}

export const toVerification = (inv: Invoice): InvoiceVerification =>
  ({ invoice_number: inv.invoice_number, issued_at: inv.issued_at, currency: inv.currency, total: inv.total, status: inv.status })
