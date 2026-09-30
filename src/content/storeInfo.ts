/**
 * القيم التشغيلية المعروضة للعميلة في صفحات السياسات والتواصل.
 * مصدر واحد — أي تعديل تجاري (رسوم، مناطق، مدة الاسترجاع) يتم هنا فقط.
 * القيم المعلّمة بـ ⚠️ مبدئية وتحتاج اعتماد P1-BIZ-01 قبل الإطلاق.
 * بعد الاعتماد: VITE_POLICIES_APPROVED=true لإخفاء شارة «نسخة أولية».
 */

export interface DeliveryZone {
  name: string
  fee: number
  eta: string
}

export const STORE_INFO = {
  brand: 'Gazabella',
  city: 'خان يونس',
  /** آخر تحديث للسياسات — يُعدّل مع كل تغيير جوهري */
  policiesUpdatedAt: '2026-09-30',
  /** ⚠️ ساعات الدعم */
  supportHours: 'يومياً من 10:00 صباحاً حتى 8:00 مساءً',
  /** ⚠️ زمن الرد المتوقع على واتساب */
  supportResponse: 'خلال ساعة في أوقات الدوام',
  /** D-04: نافذة قبول المتجر للطلب */
  acceptanceWindowMinutes: 30,
  /** ⚠️ مدة طلب الاسترجاع من تاريخ الاستلام (منتج مغلق وغير مستخدم) */
  returnWindowDays: 3,
  /** ⚠️ مهلة الإبلاغ عن منتج تالف أو خاطئ أو منتهي الصلاحية */
  damageReportHours: 24,
  /** ⚠️ مدة الاحتفاظ ببيانات الطلبات */
  dataRetentionMonths: 24,
  /** ⚠️ مناطق التوصيل ورسومها — تطابق قيم الباك اند (D-22) */
  deliveryZones: [
    { name: 'خان يونس — المدينة', fee: 10, eta: 'في نفس اليوم للطلبات المؤكدة قبل 4 مساءً' },
    { name: 'خان يونس — المناطق الشرقية والغربية', fee: 15, eta: 'خلال 24 ساعة' },
    { name: 'رفح ودير البلح', fee: 20, eta: 'خلال 24–48 ساعة' },
  ] satisfies DeliveryZone[],
} as const

/** روابط صفحات المساعدة والسياسات (القائمة الجانبية) */
export const INFO_NAV = [
  { to: '/delivery-info', label: 'التوصيل والرسوم' },
  { to: '/returns', label: 'الاسترجاع والاستبدال' },
  { to: '/privacy', label: 'سياسة الخصوصية' },
  { to: '/terms', label: 'شروط الاستخدام' },
  { to: '/faq', label: 'الأسئلة الشائعة' },
  { to: '/contact', label: 'تواصلي معنا' },
] as const

export const policiesApproved = () => import.meta.env.VITE_POLICIES_APPROVED === 'true'

/** رقم واتساب الدعم بصيغة دولية بدون + (مثال 970599123456) */
export function normalizeWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = String(raw).replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `970${digits.slice(1)}`
  return digits.length >= 11 && digits.length <= 15 ? digits : null
}

/** الأولوية: إعدادات الباك اند (social_links.whatsapp) ثم متغير البيئة */
export function resolveWhatsapp(settingsLinks?: Record<string, string> | null): string | null {
  const fromSettings = settingsLinks?.whatsapp ?? settingsLinks?.WhatsApp
  if (fromSettings) {
    const fromUrl = /wa\.me\/(\d+)/.exec(fromSettings)?.[1]
    return normalizeWhatsapp(fromUrl ?? fromSettings)
  }
  return normalizeWhatsapp(import.meta.env.VITE_SUPPORT_WHATSAPP)
}

export function whatsappLink(number: string, message?: string): string {
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
