/**
 * بيانات SEO للصفحات الثابتة — مشتركة بين التطبيق (useSeo) و middleware.ts
 * (معاينات واتساب/فيسبوك التي لا تشغّل JavaScript). بدون import.meta هنا.
 */
export interface SeoEntry {
  title: string | null // null = العنوان الافتراضي للموقع
  description: string
  noindex?: boolean
}

export const SITE_NAME = 'Gazabella'
export const DEFAULT_TITLE = 'Gazabella | الجمال أقرب إليك'
export const DEFAULT_DESCRIPTION = 'Gazabella — وجهتكِ الموحدة لمنتجات التجميل والعناية والهدايا في خان يونس. توصيل للبيت ودفع عند الاستلام.'
export const DEFAULT_OG_IMAGE = '/brand/social/og-1200x630.png'
export const OG_LOCALE = 'ar_AR'

/** المفاتيح مسارات دقيقة؛ المسارات الديناميكية (المنتج) تُعالج في مكانها */
export const ROUTE_SEO: Record<string, SeoEntry> = {
  '/': { title: null, description: DEFAULT_DESCRIPTION },
  '/delivery-info': { title: 'التوصيل والرسوم', description: 'مناطق التوصيل ورسومها ومددها، ومتى تكون التوصيلة مجانية، وكيف يعمل كود التسليم.' },
  '/returns': { title: 'الاسترجاع والاستبدال', description: 'سياسة الاسترجاع والاستبدال لمنتجات التجميل والعناية: المنتج التالف أو الخاطئ، ومدة الإرجاع، والاستثناءات.' },
  '/privacy': { title: 'سياسة الخصوصية', description: 'ما البيانات التي نجمعها ولماذا، ومن يراها، وكيف نحميها، وحقوقكِ في الوصول إليها وحذفها.' },
  '/terms': { title: 'شروط الاستخدام', description: 'شروط استخدام Gazabella: الطلب والتأكيد، الأسعار والدفع، الاستلام والإلغاء.' },
  '/faq': { title: 'الأسئلة الشائعة', description: 'أجوبة سريعة عن الطلب والدفع والتوصيل وكود التسليم والاسترجاع.' },
  '/contact': { title: 'تواصلي معنا', description: 'تواصلي مع خدمة عميلات Gazabella عبر واتساب أو الهاتف.' },
  '/cart': { title: 'سلة التسوق', description: DEFAULT_DESCRIPTION, noindex: true },
  '/checkout': { title: 'إتمام الطلب', description: DEFAULT_DESCRIPTION, noindex: true },
  '/checkout/receipt': { title: 'تم استلام طلبكِ', description: DEFAULT_DESCRIPTION, noindex: true },
  '/auth': { title: 'تسجيل الدخول', description: DEFAULT_DESCRIPTION, noindex: true },
  '/profile': { title: 'الملف الشخصي', description: DEFAULT_DESCRIPTION, noindex: true },
  '/orders': { title: 'طلباتي', description: DEFAULT_DESCRIPTION, noindex: true },
  '/orders/lookup': { title: 'تتبع طلب', description: 'تتبعي حالة طلبكِ برقم المرجع.', noindex: true },
}

/** صفحات خاصة لا تُفهرس حتى لو كانت ديناميكية */
export function isPrivatePath(pathname: string): boolean {
  return /^\/(orders|checkout|profile|auth|cart|merchant|delivery)(\/|$)/.test(pathname)
}

export function fullTitle(title: string | null | undefined): string {
  return title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE
}

/** وصف نظيف بطول مناسب لمحركات البحث والمعاينات (≤160 حرفاً) */
export function toMetaDescription(text: string | null | undefined, fallback = DEFAULT_DESCRIPTION): string {
  const clean = (text ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  return clean.length > 160 ? `${clean.slice(0, 157).replace(/\s+\S*$/, '')}…` : clean
}
