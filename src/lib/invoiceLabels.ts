import { t, getLocale } from '../i18n'
import type { Bilingual, InvoicePaymentMethod, InvoiceStatus } from '../types/api'

/** INV-5: الاسم المحفوظ بلغة الواجهة الحالية (والعربية احتياطاً) */
export const pick = (value: Bilingual | null | undefined): string => (value ? (getLocale() === 'en' ? value.en || value.ar : value.ar || value.en) : '')

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  issued: 'مدفوعة',
  partially_credited: 'مسترد جزئياً',
  credited: 'مستردة بالكامل',
}
export const invoiceStatusLabel = (s: InvoiceStatus) => t(INVOICE_STATUS_LABEL[s] ?? INVOICE_STATUS_LABEL.issued)

const METHOD_LABEL: Record<InvoicePaymentMethod, string> = { jawwal_pay: 'جوال باي', wallet: 'محفظة Gazabella' }
export const invoiceMethodLabel = (m: InvoicePaymentMethod) => t(METHOD_LABEL[m] ?? 'جوال باي')
