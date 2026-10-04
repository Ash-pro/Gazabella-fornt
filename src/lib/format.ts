import { dateLocale } from '../i18n'
export function formatPrice(value: string | number): string {
  const amount = Number(value) || 0
  const hasFraction = !Number.isInteger(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount)
  return `₪${formatted}`
}

export const money = formatPrice

export function normalizePhone(value: string) {
  const digits = value.trim().replace(/[٠-٩]/g, (n) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n))).replace(/[\s()-]/g, '')
  return digits.startsWith('0') ? `+970${digits.slice(1)}` : digits.startsWith('970') ? `+${digits}` : digits
}

/** تاريخ/وقت بلغة الواجهة (أرقام لاتينية دائماً) */
export function formatDate(value: string | number | Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(dateLocale(), options).format(date)
}
