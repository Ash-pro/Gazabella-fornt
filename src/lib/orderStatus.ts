/**
 * P1-FE-03 · D-21 — مصدر واحد لنصوص حالات الطلب وطرق الدفع في واجهة العميل.
 * العميل يرى 4 حالات رئيسية: تم التأكيد · قيد التجهيز · خرج للتوصيل · تم التسليم (+ ملغي/مسترد).
 */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'تم التأكيد',
  processing: 'قيد التجهيز',
  shipped: 'خرج للتوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  refunded: 'مسترد',
}

export const orderStatusLabel = (status?: string | null): string =>
  ORDER_STATUS_LABEL[status ?? ''] ?? 'قيد المعالجة'

export const isCashOnDelivery = (method?: string | null): boolean =>
  method === 'cod' || method === 'cash_on_delivery'

/** يقبل تسمية الخادم (cod) وتسمية البيانات القديمة (cash_on_delivery) */
export const paymentMethodLabel = (method?: string | null): string =>
  isCashOnDelivery(method) ? 'الدفع عند الاستلام' : method === 'jawwal_pay' ? 'جوال باي' : '—'
