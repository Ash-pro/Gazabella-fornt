import { t } from '../i18n'
/**
 * القيم التشغيلية المعروضة للعميلة في صفحات السياسات والتواصل.
 * المصدر الأساسي: الباك اند — GET /settings (support · policies) و GET /delivery-zones.
 * هذه القيم **احتياط فقط** عند غياب حقل أو تعذّر الاتصال (تُقرأ عبر useStoreInfo).
 * القيم التشغيلية معتمدة في 01/10/2026 (P1-BIZ-01).
 * بعد اعتماد نصوص السياسات: VITE_POLICIES_APPROVED=true لإخفاء شارة «نسخة أولية».
 */

export interface DeliveryZone {
  /** معرّف المنطقة من /delivery-zones (غير موجود في القيم الاحتياطية) */
  id?: number
  name: string
  fee: number
  /** مدة التوصيل المتوقعة بالدقائق (null = غير محددة) */
  etaMinutes: number | null
}

export const STORE_INFO = {
  brand: 'Gazabella',
  city: 'خان يونس',
  /** آخر تحديث للسياسات — يُستبدل بـ policies.updated_at عند توفره */
  policiesUpdatedAt: '2026-10-01',
  supportHours: 'يومياً من 10:00 صباحاً حتى 8:00 مساءً',
  supportResponse: 'خلال ساعة في أوقات الدوام',
  /** D-04: نافذة قبول المتجر للطلب */
  acceptanceWindowMinutes: 30,
  /** ✅ معتمد: مدة طلب الاسترجاع من تاريخ الاستلام (منتج مغلق وغير مستخدم) */
  returnWindowDays: 7,
  /** مهلة الإبلاغ عن منتج تالف أو خاطئ أو منتهي الصلاحية */
  damageReportHours: 24,
  /** مدة الاحتفاظ ببيانات الطلبات */
  dataRetentionMonths: 24,
  /** ✅ معتمد: مناطق التوصيل ورسومها (D-22) — مطابقة لـ /delivery-zones */
  deliveryZones: [
    { name: 'خان يونس', fee: 5, etaMinutes: 45 },
    { name: 'رفح', fee: 8, etaMinutes: 60 },
    { name: 'مدينة غزة', fee: 10, etaMinutes: 90 },
  ] satisfies DeliveryZone[],
} as const

/** 45 → «خلال 45 دقيقة» · 60 → «خلال ساعة» · 90 → «خلال ساعة ونصف» · 120 → «خلال ساعتين» */
export function formatEta(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return t('حسب التغطية')
  const m = Math.round(minutes)
  if (m < 60) return t('خلال {m} دقيقة', { m: m })
  const h = Math.floor(m / 60)
  const rest = m % 60
  const hours = h === 1 ? t('ساعة') : h === 2 ? t('ساعتين') : h <= 10 ? t('{h} ساعات', { h: h }) : t('{h} ساعة', { h: h })
  if (rest === 0) return t('خلال {hours}', { hours: hours })
  if (rest === 30) return t('خلال {hours} ونصف', { hours: hours })
  return t('خلال {hours} و{rest} دقيقة', { hours: hours, rest: rest })
}

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
