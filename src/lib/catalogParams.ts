/**
 * حالة الكتالوج (البحث والفلاتر والفرز والصفحة) كما في رابط الصفحة — مصدر واحد للقراءة والتعديل،
 * حتى يبقى الرابط والحالة المعروضة وما يُرسل للخادم متطابقة.
 *
 * عقد الـ API (/products) كما تحقّقنا منه: search نص غير فارغ، min_price/max_price أرقام ≥ 0 والأعلى ≥ الأدنى
 * (وإلا 422)، sort ∈ price|created_at|sort_order (مع - للتنازلي)، page خارج النطاق يعيد قائمة فارغة.
 * لذلك لا نرسل أي قيمة لا تحقق هذه الشروط.
 */

export const CATALOG_SORTS = ['-created_at', 'created_at', 'price', '-price'] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]

/** مفاتيح التصفية (ما يزيله «مسح الفلاتر») — البحث والفرز ليسا منها */
export const FILTER_KEYS = ['category', 'sub', 'min_price', 'max_price', 'collection'] as const

/** أي من هذه المفاتيح يعني أن الصفحة صفحة كتالوج/نتائج لا الرئيسية */
const CATALOG_KEYS = ['all', 'search', 'sort', 'page', 'saved', ...FILTER_KEYS]

export interface CatalogState {
  search: string
  category: string
  sub: string
  sort?: CatalogSort
  minPrice?: number
  maxPrice?: number
  /** الحد الأدنى أكبر من الأعلى: لا يُرسل الطلب ونعرض تنبيهًا بدل خطأ خادم */
  priceRangeInvalid: boolean
  collection?: number
  page: number
}

function nonNegative(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

export function readCatalog(params: URLSearchParams): CatalogState {
  const sortRaw = params.get('sort') || ''
  const minPrice = nonNegative(params.get('min_price'))
  const maxPrice = nonNegative(params.get('max_price'))
  const collection = nonNegative(params.get('collection'))
  const page = nonNegative(params.get('page'))
  return {
    search: (params.get('search') || '').trim(),
    category: params.get('category') || '',
    sub: params.get('sub') || '',
    sort: (CATALOG_SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as CatalogSort) : undefined,
    minPrice,
    maxPrice,
    priceRangeInvalid: minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice,
    collection: collection !== undefined && Number.isInteger(collection) ? collection : undefined,
    page: page !== undefined && page >= 1 ? Math.floor(page) : 1,
  }
}

/**
 * يزيل من الرابط القيم التي لا يمكن تطبيقها (بحث فارغ/مسافات، فرز غير معروف، سعر غير رقمي أو سالب، صفحة < 1)
 * حتى يطابق الرابط ما يُعرض فعلًا. يعيد null إن لم يتغير شيء. تعارض الحدّين (أدنى > أعلى) يُترك ليظهر تنبيهه.
 */
export function sanitizeCatalogParams(params: URLSearchParams): URLSearchParams | null {
  const state = readCatalog(params)
  const next = new URLSearchParams(params)
  if (next.has('search') && !state.search) next.delete('search')
  else if (next.has('search') && next.get('search') !== state.search) next.set('search', state.search)
  if (next.has('sort') && !state.sort) next.delete('sort')
  if (next.has('min_price') && state.minPrice === undefined) next.delete('min_price')
  if (next.has('max_price') && state.maxPrice === undefined) next.delete('max_price')
  if (next.has('collection') && state.collection === undefined) next.delete('collection')
  if (next.has('page') && (state.page === 1 || String(state.page) !== next.get('page'))) { if (state.page > 1) next.set('page', String(state.page)); else next.delete('page') }
  if (next.toString() === params.toString()) return null
  return keepCatalog(next)
}

/** عدد الفلاتر المطبّقة (لشارة زر التصفية) — السعر فلتر واحد */
export function activeFilterCount(state: CatalogState): number {
  return (state.category ? 1 : 0) + (state.sub ? 1 : 0) + (state.minPrice !== undefined || state.maxPrice !== undefined ? 1 : 0) + (state.collection !== undefined ? 1 : 0)
}

/** إن لم يبقَ ما يميّز صفحة الكتالوج نُبقي all=1 حتى لا يقفز المستخدم إلى الرئيسية بعد إزالة آخر قيد */
export function keepCatalog(next: URLSearchParams): URLSearchParams {
  if (!CATALOG_KEYS.some((key) => next.has(key))) next.set('all', '1')
  return next
}

/** إزالة كل الفلاتر مع إبقاء البحث والفرز */
export function clearFilters(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params)
  FILTER_KEYS.forEach((key) => next.delete(key))
  next.delete('page')
  return keepCatalog(next)
}

/** إزالة عبارة البحث مع إبقاء الفلاتر والفرز */
export function clearSearch(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete('search')
  next.delete('page')
  return keepCatalog(next)
}

/** إزالة فلتر واحد (السعر يُزال بحدّيه معًا، وإزالة القسم تزيل الفئة الفرعية) */
export function removeFilter(params: URLSearchParams, key: 'category' | 'sub' | 'price' | 'collection'): URLSearchParams {
  const next = new URLSearchParams(params)
  if (key === 'price') { next.delete('min_price'); next.delete('max_price') } else next.delete(key)
  if (key === 'category') next.delete('sub')
  next.delete('page')
  return keepCatalog(next)
}

/** تعيين قيمة (فرز أو فلتر) مع إعادة الترقيم إلى الصفحة الأولى */
export function setCatalogParam(params: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(params)
  if (value) next.set(key, value); else next.delete(key)
  if (key === 'category') next.delete('sub')
  next.delete('page')
  return keepCatalog(next)
}

/** رابط صفحة نتائج عبارة بحث (تبدأ من الصفحة الأولى بلا فلاتر سابقة) */
export function searchHref(term: string): string {
  return '/?' + new URLSearchParams({ search: term.trim() }).toString() + '#products'
}

/** فلاتر السعر بعد التحقق: قيم صالحة فقط، وتُهمل قيمة 0 للحد الأدنى لأنها لا تقيّد شيئًا */
export function priceParams(min: string, max: string): { min_price?: string; max_price?: string; error?: 'negative' | 'range' | 'number' } {
  const parse = (raw: string) => (raw.trim() === '' ? undefined : Number(raw))
  const lo = parse(min)
  const hi = parse(max)
  if ((lo !== undefined && !Number.isFinite(lo)) || (hi !== undefined && !Number.isFinite(hi))) return { error: 'number' }
  if ((lo !== undefined && lo < 0) || (hi !== undefined && hi < 0)) return { error: 'negative' }
  if (lo !== undefined && hi !== undefined && lo > hi) return { error: 'range' }
  return { ...(lo ? { min_price: String(lo) } : {}), ...(hi !== undefined ? { max_price: String(hi) } : {}) }
}
