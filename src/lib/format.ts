export const money = (value: string | number) => new Intl.NumberFormat('ar-PS', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)
export function normalizePhone(value: string) {
  const digits = value.trim().replace(/[٠-٩]/g, (n) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n))).replace(/[\s()-]/g, '')
  return digits.startsWith('0') ? `+970${digits.slice(1)}` : digits.startsWith('970') ? `+${digits}` : digits
}
