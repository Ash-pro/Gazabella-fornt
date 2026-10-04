import type { PaymentMethodCode, PaymentMethodOption } from '../types/api'

/**
 * D-01 — الإطلاق بالدفع عند الاستلام فقط.
 * يُستخدم عندما لا يعيد الخادم `payment_methods` (باك اند قبل C-P1-01) — عرض مؤقت حتى جاهزية الـ API.
 */
export const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { code: 'cod', label: 'الدفع نقداً عند الاستلام' },
]

/** وضع Mock فقط: الطريقتان لعرض السلوك الكامل، وجوال باي موسوم «تجريبي» */
export const MOCK_PAYMENT_METHODS: PaymentMethodOption[] = [
  { code: 'cod', label: 'الدفع نقداً عند الاستلام' },
  { code: 'jawwal_pay', label: 'جوال باي', is_sandbox: true },
]

const KNOWN: PaymentMethodCode[] = ['cod', 'jawwal_pay']

/** يُبقي الطرق المعروفة فقط، ويرجع للافتراضي إذا كانت القائمة فارغة أو غائبة */
export function resolvePaymentMethods(fromServer?: PaymentMethodOption[] | null): PaymentMethodOption[] {
  const list = (fromServer ?? []).filter(m => KNOWN.includes(m.code))
  return list.length ? list : DEFAULT_PAYMENT_METHODS
}

const LABELS: Record<PaymentMethodCode, PaymentMethodOption> = {
  cod: { code: 'cod', label: 'الدفع نقداً عند الاستلام' },
  jawwal_pay: { code: 'jawwal_pay', label: 'جوال باي' },
}

/**
 * G-02 — طرق الدفع من `/settings → policies.payment_methods` (مثل ["cod"]).
 * الطرق غير المعروفة تُهمل، والقائمة الفارغة/الغائبة ترجع للافتراضي (الدفع عند الاستلام).
 */
export function paymentOptionsFromCodes(codes?: readonly string[] | null): PaymentMethodOption[] {
  const seen = new Set<string>()
  const list = (codes ?? []).filter((c): c is PaymentMethodCode => KNOWN.includes(c as PaymentMethodCode) && !seen.has(c) && !!seen.add(c)).map((c) => LABELS[c])
  return list.length ? list : DEFAULT_PAYMENT_METHODS
}
