/**
 * بيانات العرض التجريبي لميزات المرحلة 1 (R-1) — لا تُستخدم إلا عند demoFixtures().
 * حتمية حسب معرّف المنتج حتى لا تتغير بين التحديثات. الأسماء والنصوص تجريبية وتُوسم «عرض تجريبي» في الواجهة.
 */
import type { ProductBrief, ProductDetail, ProductReview, ReviewsPage, ReviewSummary } from '../types/api'

const seeded = (seed: number) => { let s = (seed * 9301 + 49297) % 233280; return () => (s = (s * 9301 + 49297) % 233280) / 233280 }

const NAMES = ['سارة م.', 'لينا ع.', 'رهف ك.', 'آية س.', 'دعاء ح.', 'نور أ.', 'هبة ي.', 'منى ر.', 'ريم ب.', 'شهد ج.']
const TEXTS: Array<{ rating: number; title: string; body: string }> = [
  { rating: 5, title: 'أفضل من توقعاتي', body: 'استخدمته أسبوعين والفرق واضح. الملمس خفيف ويمتص بسرعة، والرائحة هادئة.' },
  { rating: 5, title: 'وصل بسرعة', body: 'الطلب وصل بنفس اليوم والتغليف ممتاز. المنتج أصلي وتاريخ الصلاحية بعيد.' },
  { rating: 4, title: 'جميل جداً', body: 'المنتج حلو ومناسب لبشرتي، بس كنت أتمنى يكون الحجم أكبر شوي.' },
  { rating: 5, title: 'رح أطلبه مرة ثانية', body: 'ثاني مرة بطلبه. الدفع عند الاستلام مريح وفحصت الطلب قبل ما أدفع.' },
  { rating: 4, title: 'جودة ممتازة', body: 'النتيجة ممتازة مع الاستخدام اليومي. أنصح فيه للبشرة الحساسة.' },
  { rating: 3, title: 'مقبول', body: 'منتج جيد لكن احتاج وقت أطول حتى ظهرت النتيجة.' },
  { rating: 5, title: 'هدية مثالية', body: 'اشتريته هدية لأختي وانبسطت كثير، والتغليف كان أنيق.' },
]

/** قائمة المراجعات التجريبية لمنتج (حتمية) — منها يُحسب المتوسط والعدد حتى تتطابق البطاقة والصفحة */
function demoList(productId: number, productImage: string | null): ProductReview[] {
  const r = seeded(productId + 7)
  const count = 3 + Math.floor(r() * 16)
  return Array.from({ length: count }, (_, i) => {
    const text = TEXTS[Math.floor(r() * TEXTS.length)]
    const day = 2 + Math.floor(r() * 80)
    return {
      id: productId * 100 + i,
      rating: text.rating,
      title: text.title,
      body: text.body,
      author_name: NAMES[Math.floor(r() * NAMES.length)],
      created_at: new Date(Date.UTC(2026, 9, 15) - day * 86_400_000).toISOString(),
      verified_purchase: r() > 0.2,
      photos: productImage && i % 4 === 1 ? [productImage] : [],
    }
  })
}

export function demoRating(id: number): { rating_avg: number; rating_count: number } {
  const list = demoList(id, null)
  return { rating_avg: Math.round((list.reduce((s, x) => s + x.rating, 0) / list.length) * 10) / 10, rating_count: list.length }
}

export function withDemoRating<T extends ProductBrief>(p: T): T {
  return p.rating_count ? p : { ...p, ...demoRating(p.id) }
}

/** حقول التبويبات التجريبية إن لم تأتِ من الخادم */
export function withDemoDetails(p: ProductDetail): ProductDetail {
  return {
    ...withDemoRating(p),
    ingredients: p.ingredients ?? 'ماء، جلسرين، نياسيناميد ٥٪، فيتامين C مستقر، حمض الهيالورونيك، مستخلص الألوفيرا، عطر خفيف. (نص تجريبي — تُضاف المكونات الفعلية من لوحة الإدارة)',
    how_to_use: p.how_to_use ?? 'ضعي كمية صغيرة على بشرة نظيفة وجافة صباحاً ومساءً، ودلّكي بلطف حتى الامتصاص. استخدمي واقي الشمس نهاراً. (نص تجريبي)',
    specs: p.specs?.length ? p.specs : [
      { label: 'الحجم', value: '30 مل' },
      { label: 'نوع البشرة', value: 'جميع الأنواع' },
      { label: 'بلد المنشأ', value: 'كوريا الجنوبية' },
      { label: 'الصلاحية بعد الفتح', value: '12 شهراً' },
    ],
  }
}

export function demoReviews(productId: number, productImage: string | null, page = 1, rating?: number): ReviewsPage {
  const all = demoList(productId, productImage)
  const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } as ReviewSummary['distribution']
  all.forEach((rv) => { distribution[String(rv.rating) as keyof typeof distribution]++ })
  const filtered = rating ? all.filter((rv) => rv.rating === rating) : all
  const per = 6
  const last = Math.max(1, Math.ceil(filtered.length / per))
  return {
    data: filtered.slice((page - 1) * per, page * per),
    meta: { current_page: page, last_page: last, total: filtered.length },
    summary: { average: demoRating(productId).rating_avg, count: all.length, distribution },
  }
}
