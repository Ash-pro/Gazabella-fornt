/**
 * INV — بيانات العرض التجريبي للفواتير (R-1: تظهر فقط في وضع العرض/Mock وموسومة «عرض تجريبي»).
 * كل الفواتير مدفوعة بجوال باي أو المحفظة (INV-2)، بلا ضريبة (INV-1)، وبلا أي أثر للمتاجر (D-12).
 * المبالغ تُحسب برمجياً من البنود — لا أرقام مكتوبة يدوياً قد تختل.
 */
import type { Bilingual, CreditNote, Invoice, InvoicePayment, InvoiceSeller, Order } from '../types/api'

export const DEMO_SELLER: InvoiceSeller = {
  name: 'Gazabella',
  address: { ar: 'خان يونس، فلسطين', en: 'Khan Younis, Palestine' },
  phone: null,
  email: null,
  website: null,
}

const CUSTOMER = { name: 'أمل النجار', phone: '0591234567', address: 'خان يونس، حي الأمل، شارع النصر، مقابل المدرسة الثانوية' }

/** يخفي منتصف الرقم: 0591234567 → 059•••4567 */
export function maskPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/[^\d]/g, '')
  if (digits.length < 7) return null
  return `${digits.slice(0, 3)}•••${digits.slice(-4)}`
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2)
const plusMinutes = (iso: string, m: number) => new Date(Date.parse(iso) + m * 60_000).toISOString()

interface LineSpec { name: Bilingual; variant?: Bilingual; qty: number; price: number; image: string; slug: string }
interface CreditSpec { number: string; at: string; line: number; qty: number; reason: Bilingual }
interface InvoiceSpec {
  invoice: string
  order: string
  orderId: number
  createdAt: string
  lines: LineSpec[]
  delivery: number
  deliveryOriginal?: number
  coupon?: { code: string; percent: number }
  wallet?: number
  jawwalRef: string
  token: string
  credit?: CreditSpec
}

const SPECS: InvoiceSpec[] = [
  {
    invoice: 'GZB-INV-2025-000087', order: 'GAZ-2025-0412', orderId: 9412, createdAt: '2025-12-14T11:20:00+02:00',
    lines: [
      { name: { ar: 'زيت عطر الورد المخملي', en: 'Velvet Rose Perfume Oil' }, variant: { ar: '50 مل', en: '50 ml' }, qty: 1, price: 95, image: '/demo/products/velvet-rose-perfume-oil-50ml-1.webp', slug: 'velvet-rose-perfume-oil-50ml' },
      { name: { ar: 'تونر ماء الورد للوجه', en: 'Rosewater Facial Toner' }, variant: { ar: '200 مل', en: '200 ml' }, qty: 1, price: 32, image: '/demo/products/rosewater-facial-toner-1.webp', slug: 'rosewater-facial-toner' },
    ],
    delivery: 10, jawwalRef: 'JP-25121411AXQ7', token: 'demo7Qm2vK9xR4tLp8Wc3Zb6Hn1',
  },
  {
    invoice: 'GZB-INV-2026-000101', order: 'GAZ-2026-0006', orderId: 9006, createdAt: '2026-08-06T10:05:00+03:00',
    lines: [
      { name: { ar: 'سيروم أوريليا للإشراقة', en: 'Aurelia Brightening Serum' }, variant: { ar: '30 مل', en: '30 ml' }, qty: 2, price: 58, image: '/demo/products/aurelia-brightening-serum-1.webp', slug: 'aurelia-brightening-serum' },
      { name: { ar: 'باليتة ظلال Gaza Glow', en: 'Gaza Glow Eyeshadow Palette' }, variant: { ar: 'درجات وردية', en: 'Rose tones' }, qty: 1, price: 74, image: '/demo/products/gaza-glow-eyeshadow-palette-1.webp', slug: 'gaza-glow-eyeshadow-palette' },
      { name: { ar: 'مسكارا مكثفة مقاومة للماء', en: 'Volumizing Waterproof Mascara' }, variant: { ar: 'أسود', en: 'Black' }, qty: 1, price: 39, image: '/demo/products/volumizing-mascara-waterproof-1.webp', slug: 'volumizing-mascara-waterproof' },
      { name: { ar: 'كريم اليدين والأظافر بزبدة الشيا', en: 'Shea Butter Hand & Nail Cream' }, variant: { ar: '75 مل', en: '75 ml' }, qty: 2, price: 18.5, image: '/demo/products/shea-butter-hand-nail-cream-1.webp', slug: 'shea-butter-hand-nail-cream' },
    ],
    delivery: 5, jawwalRef: 'JP-26080610K3MD', token: 'demoP4nW8sY2cF6jQ1vT9rG5Lx3',
  },
  {
    invoice: 'GZB-INV-2026-000108', order: 'GAZ-2026-0009', orderId: 9009, createdAt: '2026-08-23T18:42:00+03:00',
    lines: [
      { name: { ar: 'عطر أورورا', en: 'Aurora Eau de Parfum' }, variant: { ar: '100 مل', en: '100 ml' }, qty: 1, price: 145, image: '/demo/products/aurora-eau-de-parfum-1.webp', slug: 'aurora-eau-de-parfum' },
      { name: { ar: 'حجر غوا شا من الكوارتز الوردي', en: 'Rose Quartz Gua Sha Stone' }, qty: 1, price: 35, image: '/demo/products/rose-quartz-gua-sha-stone-1.webp', slug: 'rose-quartz-gua-sha-stone' },
    ],
    delivery: 5, coupon: { code: 'GAZA10', percent: 10 }, jawwalRef: 'JP-26082318R8VB', token: 'demoK8dZ3mH6wN1qS5xB9tE2Jy7',
  },
  {
    invoice: 'GZB-INV-2026-000117', order: 'GAZ-2026-0011', orderId: 9011, createdAt: '2026-09-04T13:15:00+03:00',
    lines: [
      { name: { ar: 'صندوق هدايا العروس من Gazabella', en: 'Gazabella Bridal Gift Box' }, variant: { ar: 'الإصدار الذهبي', en: 'Gold edition' }, qty: 1, price: 320, image: '/demo/products/gazabella-bridal-gift-box-1.webp', slug: 'gazabella-bridal-gift-box' },
      { name: { ar: 'طقم فرش مكياج من الخيزران', en: 'Bamboo Makeup Brush Set' }, variant: { ar: '12 قطعة', en: '12 pieces' }, qty: 1, price: 48, image: '/demo/products/bamboo-makeup-brush-set-12pc-1.webp', slug: 'bamboo-makeup-brush-set-12pc' },
    ],
    delivery: 0, deliveryOriginal: 10, jawwalRef: 'JP-26090413T2PN', token: 'demoB2xV7kQ4mR9cW1sL6nD3Hf8',
  },
  {
    invoice: 'GZB-INV-2026-000124', order: 'GAZ-2026-0012', orderId: 9012, createdAt: '2026-09-27T09:30:00+03:00',
    lines: [
      { name: { ar: 'سيروم حمض الهيالورونيك', en: 'Hyaluronic Acid Serum' }, variant: { ar: '50 مل', en: '50 ml' }, qty: 1, price: 62, image: '/demo/products/hyaluronic-acid-serum-1.webp', slug: 'hyaluronic-acid-serum' },
      { name: { ar: 'بودرة التثبيت الحريرية', en: 'Silk Setting Powder' }, variant: { ar: 'شفافة', en: 'Translucent' }, qty: 1, price: 44, image: '/demo/products/silk-setting-powder-1.webp', slug: 'silk-setting-powder' },
    ],
    delivery: 8, wallet: 40, jawwalRef: 'JP-26092709W5HC', token: 'demoR6tM1yC8pK3vX5nZ2qF9Wb4',
  },
  {
    invoice: 'GZB-INV-2026-000131', order: 'GAZ-2026-0013', orderId: 9013, createdAt: '2026-10-09T16:10:00+03:00',
    lines: [
      { name: { ar: 'عطر صلب بالعنبر والمسك', en: 'Amber Musk Solid Perfume' }, qty: 1, price: 42, image: '/demo/products/amber-musk-solid-perfume-1.webp', slug: 'amber-musk-solid-perfume' },
      { name: { ar: 'محدد الحواجب الدقيق (ثنائي)', en: 'Precision Brow Definer Duo' }, variant: { ar: 'بني فاتح', en: 'Light brown' }, qty: 2, price: 27, image: '/demo/products/precision-brow-definer-duo-1.webp', slug: 'precision-brow-definer-duo' },
      { name: { ar: 'تونر ماء الورد للوجه', en: 'Rosewater Facial Toner' }, variant: { ar: '200 مل', en: '200 ml' }, qty: 1, price: 32, image: '/demo/products/rosewater-facial-toner-1.webp', slug: 'rosewater-facial-toner' },
    ],
    delivery: 5, jawwalRef: 'JP-26100916N4GS', token: 'demoH3wQ9bL5xT2mV8cR1kP6Zs7',
    credit: {
      number: 'GZB-CN-2026-000009', at: '2026-10-10T08:45:00+03:00', line: 1, qty: 1,
      reason: { ar: 'نفدت الكمية قبل التجهيز — أُعيد المبلغ إلى محفظتكِ', en: 'Ran out of stock before packing — refunded to your wallet' },
    },
  },
]

function build(spec: InvoiceSpec): { invoice: Invoice; order: Order } {
  const subtotal = spec.lines.reduce((s, l) => s + l.qty * l.price, 0)
  const discount = spec.coupon ? Math.round(subtotal * spec.coupon.percent) / 100 : 0
  const total = subtotal - discount + spec.delivery
  const paidAt = plusMinutes(spec.createdAt, 3)
  const walletPart = Math.min(spec.wallet ?? 0, total)
  const payments: InvoicePayment[] = [
    ...(walletPart > 0 ? [{ method: 'wallet' as const, amount: money(walletPart), reference: null, paid_at: paidAt }] : []),
    ...(total - walletPart > 0 ? [{ method: 'jawwal_pay' as const, amount: money(total - walletPart), reference: spec.jawwalRef, paid_at: paidAt }] : []),
  ]
  const creditLine = spec.credit ? spec.lines[spec.credit.line] : null
  const credit: CreditNote | null = spec.credit && creditLine
    ? {
      credit_note_number: spec.credit.number,
      issued_at: spec.credit.at,
      amount: money(creditLine.price * spec.credit.qty),
      reason: spec.credit.reason,
      refunded_to: 'wallet',
      lines: [{ name: creditLine.name, quantity: spec.credit.qty, amount: money(creditLine.price * spec.credit.qty) }],
    }
    : null
  const credited = credit ? Number(credit.amount) : 0
  const invoice: Invoice = {
    invoice_number: spec.invoice,
    order_number: spec.order,
    status: credited <= 0 ? 'issued' : credited >= total ? 'credited' : 'partially_credited',
    issued_at: paidAt,
    paid_at: paidAt,
    currency: 'ILS',
    total: money(total),
    credited_total: money(credited),
    payment_methods: payments.map((p) => p.method),
    items_count: spec.lines.length,
    first_item: spec.lines[0]?.name ?? null,
    verify_token: spec.token,
    seller: DEMO_SELLER,
    customer: { name: CUSTOMER.name, phone_masked: maskPhone(CUSTOMER.phone), address: CUSTOMER.address },
    items: spec.lines.map((l, i) => ({
      id: spec.orderId * 10 + i,
      name: l.name,
      variant: l.variant ?? null,
      quantity: l.qty,
      unit_price: money(l.price),
      line_total: money(l.qty * l.price),
      credited_quantity: spec.credit?.line === i ? spec.credit.qty : 0,
    })),
    subtotal: money(subtotal),
    discount_amount: discount > 0 ? money(discount) : null,
    coupon_code: spec.coupon?.code ?? null,
    delivery_fee: money(spec.delivery),
    delivery_fee_original: spec.deliveryOriginal != null ? money(spec.deliveryOriginal) : null,
    payments,
    credit_notes: credit ? [credit] : [],
  }
  const at = (m: number) => plusMinutes(spec.createdAt, m)
  const order: Order = {
    id: spec.orderId,
    order_number: spec.order,
    status: 'delivered',
    items: spec.lines.map((l, i) => ({
      id: spec.orderId * 10 + i,
      product_name: l.name.ar,
      variant_name: l.variant?.ar ?? null,
      unit_price: money(l.price),
      quantity: l.qty,
      subtotal: money(l.qty * l.price),
      image_url: l.image,
      product_slug: l.slug,
      reviewed: true,
    })),
    subtotal: money(subtotal),
    discount_amount: discount > 0 ? money(discount) : undefined,
    delivery_fee: money(spec.delivery),
    delivery_fee_original: spec.deliveryOriginal != null ? money(spec.deliveryOriginal) : null,
    delivery_waiver: spec.deliveryOriginal != null ? { reason: 'free_threshold', label: 'توصيل مجاني للطلبات الكبيرة' } : null,
    total: money(total),
    name: CUSTOMER.name,
    email: '',
    phone: CUSTOMER.phone,
    address: CUSTOMER.address,
    notes: null,
    payment_method: 'jawwal_pay',
    payment_status: 'paid',
    payment_reference: spec.jawwalRef,
    paid_at: paidAt,
    wallet_applied: walletPart > 0 ? money(walletPart) : null,
    tracking: [
      { status: 'pending', note: 'تم استلام طلبكِ', created_at: spec.createdAt },
      { status: 'confirmed', note: 'تم تأكيد الدفع عبر جوال باي', created_at: at(3) },
      { status: 'processing', note: 'جهّزنا طلبكِ وغلّفناه', created_at: at(70) },
      { status: 'shipped', note: 'خرج الطلب مع المندوب', created_at: at(150) },
      { status: 'delivered', note: 'تم تسليم الطلب', created_at: at(210) },
    ],
    can_cancel: false,
    invoice: { invoice_number: invoice.invoice_number, status: invoice.status, issued_at: invoice.issued_at },
    created_at: spec.createdAt,
  }
  return { invoice, order }
}

const BUILT = SPECS.map(build)

/** الفواتير التجريبية — الأحدث أولاً */
export const DEMO_INVOICES: Invoice[] = BUILT.map((b) => b.invoice).sort((a, b) => Date.parse(b.issued_at) - Date.parse(a.issued_at))

/** طلبات مكتملة مطابقة للفواتير — تُزرع في بيانات Mock حتى تظهر في «طلباتي» مع زر الفاتورة */
export const DEMO_INVOICE_ORDERS: Order[] = BUILT.map((b) => b.order)

/** طلب بانتظار دفع جوال باي (بلا فاتورة بعد) + طلب أُلغي قبل الدفع (بلا فاتورة أبداً) */
export function demoUnpaidOrders(now = Date.now()): Order[] {
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString()
  const base = {
    name: CUSTOMER.name, email: '', phone: CUSTOMER.phone, address: CUSTOMER.address, notes: null,
    payment_method: 'jawwal_pay', delivery_fee: '5.00', invoice: null, paid_at: null,
  } as const
  return [
    {
      ...base, id: 9020, order_number: 'GAZ-2026-0020', status: 'pending', payment_status: 'pending',
      items: [{ id: 90200, product_name: 'زيت عطر الورد المخملي', variant_name: '50 مل', unit_price: '95.00', quantity: 1, subtotal: '95.00', image_url: '/demo/products/velvet-rose-perfume-oil-50ml-1.webp', product_slug: 'velvet-rose-perfume-oil-50ml' }],
      subtotal: '95.00', total: '100.00', can_cancel: true,
      tracking: [{ status: 'pending', note: 'طلب تجريبي — بانتظار تأكيد دفع جوال باي', created_at: iso(40 * 60_000) }],
      created_at: iso(40 * 60_000),
    },
    {
      ...base, id: 9021, order_number: 'GAZ-2026-0021', status: 'cancelled', payment_status: 'failed',
      items: [{ id: 90210, product_name: 'بودرة التثبيت الحريرية', variant_name: 'شفافة', unit_price: '44.00', quantity: 1, subtotal: '44.00', image_url: '/demo/products/silk-setting-powder-1.webp', product_slug: 'silk-setting-powder' }],
      subtotal: '44.00', total: '49.00', can_cancel: false,
      tracking: [
        { status: 'pending', note: 'تم استلام طلبكِ', created_at: iso(3 * 86_400_000) },
        { status: 'cancelled', note: 'أُلغي الطلب لعدم إتمام الدفع', created_at: iso(3 * 86_400_000 - 30 * 60_000) },
      ],
      created_at: iso(3 * 86_400_000),
    },
  ]
}

/** أرقام الطلبات التجريبية — حتى يتجاوزها ترقيم طلبات Mock الجديدة */
export const DEMO_ORDER_NUMBERS: readonly string[] = [...DEMO_INVOICE_ORDERS.map((o) => o.order_number), 'GAZ-2026-0020', 'GAZ-2026-0021']

export const findDemoInvoice = (number: string): Invoice | undefined => DEMO_INVOICES.find((i) => i.invoice_number === number)
export const findDemoInvoiceByToken = (token: string): Invoice | undefined => DEMO_INVOICES.find((i) => i.verify_token === token)
