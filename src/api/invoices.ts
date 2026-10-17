/**
 * INV — فواتير المبيعات (العقد والبرومت الكامل للباك اند: Docs/INVOICES_BACKEND_PROMPT_AR.md).
 *   GET /invoices?year=&page=&per_page=   ← فواتير صاحبة الحساب فقط
 *   GET /invoices/{number}                 ← التفاصيل الكاملة (404 لغير المالكة)
 *   GET /invoices/{number}/pdf?locale=     ← application/pdf
 *   GET /invoices/verify/{token}           ← عام: رقم/تاريخ/إجمالي/حالة فقط
 * وضع العرض: بيانات تجريبية موسومة demo=true، والـ PDF عبر طباعة المتصفح.
 */
import axios from 'axios'
import { t, getLocale } from '../i18n'
import { apiClient } from '../lib/apiClient'
import { demoFixtures, isMissingEndpoint, withDemo, type Sourced } from '../lib/demo'
import type {
  Bilingual, CreditNote, Invoice, InvoiceLine, InvoiceList, InvoicePayment, InvoicePaymentMethod,
  InvoiceStatus, InvoiceSummary, InvoiceVerification,
} from '../types/api'

const isMockMode = (): boolean => import.meta.env.VITE_DATA_SOURCE === 'mock'

/** التبويب يظهر في وضع العرض، أو بعد تفعيل الباك اند: VITE_INVOICES=true */
export const invoicesEnabled = (): boolean => demoFixtures() || import.meta.env.VITE_INVOICES === 'true'

/** GZB-INV-2026-000123 · GZB-CN-2026-000009 — أي رقم آخر يُرفض قبل الطلب */
export const INVOICE_NUMBER = /^GZB-(INV|CN)-\d{4}-\d{6}$/
const VERIFY_TOKEN = /^[A-Za-z0-9]{16,80}$/

const notFound = () => Object.assign(new Error(t('لم نجد هذه الفاتورة.')), { response: { status: 404 } })

const mock = () => import('../mock/mockServices').then((m) => m.mockServices)
const fixtures = () => import('../fixtures/invoices')

// ── تطبيع الردود: الخادم مصدر الحقيقة، لكن لا نسمح لرد ناقص بكسر الصفحة أو عرض مبالغ غير صالحة ──
const STATUSES: InvoiceStatus[] = ['issued', 'partially_credited', 'credited']
const METHODS: InvoicePaymentMethod[] = ['jawwal_pay', 'wallet']

function amount(value: unknown): string {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(n) || n < 0) throw new Error(t('بيانات الفاتورة الواردة من الخادم غير مكتملة.'))
  return n.toFixed(2)
}
const optAmount = (value: unknown): string | null => (value === null || value === undefined || value === '' ? null : amount(value))
const text = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value))
function bilingual(value: unknown): Bilingual {
  if (value && typeof value === 'object') {
    const v = value as Partial<Bilingual>
    const ar = text(v.ar) || text(v.en)
    return { ar, en: text(v.en) || ar }
  }
  const s = text(value)
  return { ar: s, en: s }
}
const optBilingual = (value: unknown): Bilingual | null => (value == null || value === '' ? null : bilingual(value))
const status = (value: unknown): InvoiceStatus => (STATUSES.includes(value as InvoiceStatus) ? (value as InvoiceStatus) : 'issued')
const methods = (value: unknown): InvoicePaymentMethod[] => (Array.isArray(value) ? value.filter((m): m is InvoicePaymentMethod => METHODS.includes(m)) : [])
const list = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter((v) => v && typeof v === 'object') : [])

function summary(raw: Record<string, unknown>): InvoiceSummary {
  const number = text(raw.invoice_number)
  if (!INVOICE_NUMBER.test(number)) throw new Error(t('بيانات الفاتورة الواردة من الخادم غير مكتملة.'))
  return {
    invoice_number: number,
    order_number: text(raw.order_number),
    status: status(raw.status),
    issued_at: text(raw.issued_at),
    currency: 'ILS',
    total: amount(raw.total),
    credited_total: optAmount(raw.credited_total) ?? '0.00',
    payment_methods: methods(raw.payment_methods),
    items_count: Number(raw.items_count) || 0,
    first_item: optBilingual(raw.first_item),
  }
}

export function normalizeInvoice(raw: Record<string, unknown>): Invoice {
  const seller = (raw.seller ?? {}) as Record<string, unknown>
  const customer = (raw.customer ?? {}) as Record<string, unknown>
  const items: InvoiceLine[] = list(raw.items).map((i, index) => ({
    id: Number(i.id) || index + 1,
    name: bilingual(i.name),
    variant: optBilingual(i.variant),
    quantity: Number(i.quantity) || 0,
    unit_price: amount(i.unit_price),
    line_total: amount(i.line_total),
    credited_quantity: Number(i.credited_quantity) || 0,
  }))
  const payments: InvoicePayment[] = list(raw.payments)
    .filter((p) => METHODS.includes(p.method as InvoicePaymentMethod))
    .map((p) => ({ method: p.method as InvoicePaymentMethod, amount: amount(p.amount), reference: p.reference ? text(p.reference) : null, paid_at: text(p.paid_at) }))
  const credit_notes: CreditNote[] = list(raw.credit_notes).map((c) => ({
    credit_note_number: text(c.credit_note_number),
    issued_at: text(c.issued_at),
    amount: amount(c.amount),
    reason: bilingual(c.reason),
    refunded_to: 'wallet',
    lines: list(c.lines).map((l) => ({ name: bilingual(l.name), quantity: Number(l.quantity) || 0, amount: amount(l.amount) })),
  }))
  return {
    ...summary(raw),
    paid_at: text(raw.paid_at) || text(raw.issued_at),
    verify_token: text(raw.verify_token),
    seller: {
      name: text(seller.name) || 'Gazabella',
      address: optBilingual(seller.address),
      phone: seller.phone ? text(seller.phone) : null,
      email: seller.email ? text(seller.email) : null,
      website: seller.website ? text(seller.website) : null,
    },
    customer: {
      name: text(customer.name),
      phone_masked: customer.phone_masked ? text(customer.phone_masked) : null,
      address: customer.address ? text(customer.address) : null,
    },
    items,
    subtotal: amount(raw.subtotal),
    discount_amount: optAmount(raw.discount_amount),
    coupon_code: raw.coupon_code ? text(raw.coupon_code) : null,
    delivery_fee: amount(raw.delivery_fee ?? 0),
    delivery_fee_original: optAmount(raw.delivery_fee_original),
    payments,
    credit_notes,
  }
}

const MAX_PAGES = 5

async function fetchInvoiceList(year?: number): Promise<InvoiceList> {
  const pageOf = (page: number) =>
    apiClient.get<{ data: Record<string, unknown>[]; meta?: Partial<InvoiceList['meta']> }>('/invoices', { params: { page, per_page: 50, ...(year ? { year } : {}) } }).then((r) => r.data)
  const first = await pageOf(1)
  if (!Array.isArray(first.data)) throw new Error(t('استجابة غير صالحة من الخادم.'))
  const last = Math.min(Math.max(1, Number(first.meta?.last_page) || 1), MAX_PAGES)
  const rest = last > 1 ? await Promise.all(Array.from({ length: last - 1 }, (_, i) => pageOf(i + 2))) : []
  const data = [first, ...rest].flatMap((p) => (Array.isArray(p.data) ? p.data : [])).map(summary)
  const years = Array.isArray(first.meta?.years) ? first.meta.years.map(Number).filter(Number.isInteger) : []
  return { data, meta: { current_page: 1, last_page: 1, per_page: data.length, total: Number(first.meta?.total) || data.length, years } }
}

export function listInvoices(year?: number): Promise<Sourced<InvoiceList>> {
  return withDemo(
    () => fetchInvoiceList(year),
    async () => {
      if (isMockMode()) return (await mock()).getInvoices(year)
      const { DEMO_INVOICES } = await fixtures()
      const { invoiceList } = await import('../mock/mockInvoices')
      return invoiceList(DEMO_INVOICES, year)
    },
  )
}

export function getInvoice(invoiceNumber: string): Promise<Sourced<Invoice>> {
  if (!INVOICE_NUMBER.test(invoiceNumber)) return Promise.reject(notFound())
  return withDemo(
    () => apiClient.get<{ data: Record<string, unknown> }>(`/invoices/${encodeURIComponent(invoiceNumber)}`).then((r) => normalizeInvoice(r.data.data)),
    async () => {
      if (isMockMode()) return (await mock()).getInvoice(invoiceNumber)
      const found = (await fixtures()).findDemoInvoice(invoiceNumber)
      if (!found) throw notFound()
      return found
    },
  )
}

export function verifyInvoice(token: string): Promise<Sourced<InvoiceVerification>> {
  if (!VERIFY_TOKEN.test(token)) return Promise.reject(notFound())
  return withDemo(
    () => apiClient.get<{ data: Record<string, unknown> }>(`/invoices/verify/${encodeURIComponent(token)}`).then((r) => {
      const s = summary({ ...r.data.data, items_count: 0 })
      return { invoice_number: s.invoice_number, issued_at: s.issued_at, currency: s.currency, total: s.total, status: s.status }
    }),
    async () => {
      if (isMockMode()) return (await mock()).verifyInvoice(token)
      const found = (await fixtures()).findDemoInvoiceByToken(token)
      if (!found) throw notFound()
      return { invoice_number: found.invoice_number, issued_at: found.issued_at, currency: found.currency, total: found.total, status: found.status }
    },
  )
}

/** رابط صفحة التحقق المطبوع في الـ QR */
export const invoiceVerifyUrl = (token: string): string => `${window.location.origin}/invoices/verify/${encodeURIComponent(token)}`

export type PdfResult = { kind: 'downloaded' } | { kind: 'print' }

/**
 * تحميل الـ PDF من الخادم (يُولَّد بلغة الواجهة الحالية — INV-5).
 * في وضع العرض أو قبل جاهزية المسار: { kind: 'print' } والصفحة تفتح طباعة المتصفح «حفظ كـ PDF».
 */
export async function downloadInvoicePdf(invoiceNumber: string, demo: boolean): Promise<PdfResult> {
  if (!INVOICE_NUMBER.test(invoiceNumber)) throw notFound()
  if (demo || isMockMode()) return { kind: 'print' }
  let blob: Blob
  try {
    const res = await apiClient.get<Blob>(`/invoices/${encodeURIComponent(invoiceNumber)}/pdf`, {
      params: { locale: getLocale() },
      responseType: 'blob',
      timeout: 45_000,
      headers: { Accept: 'application/pdf' },
    })
    blob = res.data
  } catch (error) {
    if (demoFixtures() && isMissingEndpoint(error)) return { kind: 'print' }
    if (axios.isAxiosError(error) && error.response?.status === 429) throw new Error(t('حمّلتِ الفاتورة عدة مرات خلال وقت قصير. حاولي بعد دقيقة.'))
    throw error
  }
  // لا نحفظ أي رد ليس PDF (صفحة خطأ HTML مثلاً) باسم فاتورة
  if (!(blob instanceof Blob) || !/application\/pdf/i.test(blob.type)) throw new Error(t('تعذّر تجهيز ملف الفاتورة. حاولي مرة أخرى.'))
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `Gazabella-${invoiceNumber}.pdf`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
  return { kind: 'downloaded' }
}
