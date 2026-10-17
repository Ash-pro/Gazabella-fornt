import type { PaymentMethodCode, PaymentMethodOption } from '../types/api'
import { demoFixtures } from './demo'

/**
 * INV-2 — الإطلاق بجوال باي فقط؛ الدفع عند الاستلام لا يُستخدم أبداً في المتجر الحي.
 * يبقى «عند الاستلام» متاحاً في وضع العرض/Mock فقط (VITE_DEMO_FIXTURES=true) لتجربة المسار قبل ربط البوابة.
 * (يحل محل D-01 القديم: الإطلاق بالدفع عند الاستلام.)
 */
export const codAllowed = (): boolean => demoFixtures()

const COD: PaymentMethodOption = { code: 'cod', label: 'الدفع نقداً عند الاستلام' }
const JAWWAL: PaymentMethodOption = { code: 'jawwal_pay', label: 'جوال باي' }

/** الافتراضي في المتجر الحي عند غياب `payment_methods` من الخادم */
export const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [JAWWAL]

/** وضع Mock فقط: الطريقتان لعرض السلوك الكامل، وجوال باي موسوم «تجريبي» */
export const MOCK_PAYMENT_METHODS: PaymentMethodOption[] = [
  COD,
  { ...JAWWAL, is_sandbox: true },
]

const KNOWN: PaymentMethodCode[] = ['cod', 'jawwal_pay']
const allowed = (code: PaymentMethodCode, allowCod: boolean) => KNOWN.includes(code) && (allowCod || code !== 'cod')
/** وضع العرض يحافظ على سلوكه السابق (عند الاستلام)؛ الحي يرجع لجوال باي */
const fallback = (allowCod: boolean): PaymentMethodOption[] => (allowCod ? [COD] : DEFAULT_PAYMENT_METHODS)

/** يُبقي الطرق المعروفة المسموحة فقط، ويرجع للافتراضي إذا كانت القائمة فارغة أو غائبة */
export function resolvePaymentMethods(fromServer?: PaymentMethodOption[] | null, allowCod: boolean = codAllowed()): PaymentMethodOption[] {
  const list = (fromServer ?? []).filter((m) => allowed(m.code, allowCod))
  return list.length ? list : fallback(allowCod)
}

const LABELS: Record<PaymentMethodCode, PaymentMethodOption> = { cod: COD, jawwal_pay: JAWWAL }

/**
 * G-02 — طرق الدفع من `/settings → policies.payment_methods` (مثل ["jawwal_pay"]).
 * الطرق غير المعروفة تُهمل، و«عند الاستلام» يُهمل خارج وضع العرض، والقائمة الفارغة ترجع للافتراضي.
 */
export function paymentOptionsFromCodes(codes?: readonly string[] | null, allowCod: boolean = codAllowed()): PaymentMethodOption[] {
  const seen = new Set<string>()
  const list = (codes ?? [])
    .filter((c): c is PaymentMethodCode => allowed(c as PaymentMethodCode, allowCod) && !seen.has(c) && !!seen.add(c))
    .map((c) => LABELS[c])
  return list.length ? list : fallback(allowCod)
}
