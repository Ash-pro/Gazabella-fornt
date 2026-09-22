import { useSearchParams } from 'react-router-dom'
import { Icon } from '../ui/Icon'

interface SubCategoryDef {
  slug: string
  name: string
  emoji: string
  badge?: string
}

interface CategoryMeta {
  title: string
  emoji: string
  subcategories: SubCategoryDef[]
}

const CATEGORY_TAXONOMY: Record<string, CategoryMeta> = {
  skincare: {
    title: 'عناية ونضارة',
    emoji: '🧴',
    subcategories: [
      { slug: 'serums', name: 'سيرومات الإشراقة', emoji: '💧', badge: 'Glow' },
      { slug: 'moisturizers', name: 'كريمات وترطيب عميق', emoji: '🧴' },
      { slug: 'sunscreens', name: 'واقي شمس SPF', emoji: '☀️' },
    ],
  },
  cosmetics: {
    title: 'مكياج ساحر',
    emoji: '💄',
    subcategories: [
      { slug: 'lipsticks', name: 'أحمر شفاه ومحددات', emoji: '💄' },
      { slug: 'foundation', name: 'كريم أساس وكونسيلر', emoji: '🪞' },
      { slug: 'eyeshadow', name: 'باليتات عيون وإضاءة', emoji: '🎨' },
      { slug: 'halal-beauty', name: 'مكياج حلال ومعتمد', emoji: '🌿', badge: 'حلال' },
    ],
  },
  perfumes: {
    title: 'عطور وبخور',
    emoji: '🌸',
    subcategories: [
      { slug: 'oriental-perfumes', name: 'عطور شرقية وعود', emoji: '👑', badge: 'ملكي' },
      { slug: 'french-perfumes', name: 'عطور فرنسية نسائية', emoji: '🌸' },
      { slug: 'body-mists', name: 'معطرات الجسم وخمرية', emoji: '✨' },
    ],
  },
  bridal: {
    title: 'جناح العروس الملكي',
    emoji: '👰',
    subcategories: [
      { slug: 'bridal-boxes', name: 'باقات جهاز العروس', emoji: '👰', badge: 'Best' },
      { slug: 'bridal-robes', name: 'أرواب ومستلزمات الحرير', emoji: '👘' },
      { slug: 'bridal-makeup', name: 'مكياج العروس الثابت', emoji: '💄' },
      { slug: 'bridal-care', name: 'روتين ما قبل الحفل', emoji: '🧴' },
    ],
  },
  'hair-deadsea': {
    title: 'البحر الميت والشعر',
    emoji: '🌿',
    subcategories: [
      { slug: 'deadsea-products', name: 'طين وأملاح البحر الميت', emoji: '🌿', badge: 'طبيعي 100%' },
      { slug: 'hair-masks', name: 'زيوت وماسكات ترميم الشعر', emoji: '💆‍♀️' },
      { slug: 'organic-bath', name: 'روتين الاستحمام العضوي', emoji: '🧼' },
    ],
  },
  gifts: {
    title: 'هدايا فاخرة',
    emoji: '🎁',
    subcategories: [
      { slug: 'gift-boxes', name: 'صناديق وبوكسات المناسبات', emoji: '🎁' },
      { slug: 'gift-builder', name: 'صانع الهدايا التفاعلي', emoji: '🎀', badge: 'تفاعلي' },
      { slug: 'gift-wrapping', name: 'تغليف مخملي وكروت إهداء', emoji: '💌' },
    ],
  },
  'tools-nails': {
    title: 'أدوات وأظافر',
    emoji: '💅',
    subcategories: [
      { slug: 'tools-brushes', name: 'فرش دمج ومكياج', emoji: '🖌️' },
      { slug: 'nails-care', name: 'طلاء وعناية بالأظافر', emoji: '💅' },
    ],
  },
}

interface CuratedCollection {
  id: string
  label: string
  emoji: string
  badge?: string
  apply: (params: URLSearchParams) => void
  isActive: (params: URLSearchParams) => boolean
}

const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    id: 'popular',
    label: 'الأكثر طلباً في غزة',
    emoji: '🔥',
    badge: 'تريند',
    apply: (p) => {
      p.set('sort', 'popular')
      p.delete('category')
      p.delete('sub')
      p.delete('min_price')
      p.delete('max_price')
    },
    isActive: (p) => p.get('sort') === 'popular' && !p.get('category'),
  },
  {
    id: 'newest',
    label: 'وصل حديثاً',
    emoji: '✨',
    badge: 'جديد',
    apply: (p) => {
      p.set('sort', 'newest')
      p.delete('category')
      p.delete('sub')
      p.delete('min_price')
      p.delete('max_price')
    },
    isActive: (p) => p.get('sort') === 'newest' && !p.get('category'),
  },
  {
    id: 'bridal-collection',
    label: 'باقات العروس الملكية',
    emoji: '👰',
    badge: 'Gazabella Bride',
    apply: (p) => {
      p.set('category', 'bridal')
      p.delete('sub')
      p.delete('min_price')
      p.delete('max_price')
    },
    isActive: (p) => p.get('category') === 'bridal',
  },
  {
    id: 'deadsea-collection',
    label: 'كنوز البحر الميت الأصلية',
    emoji: '🌿',
    apply: (p) => {
      p.set('category', 'hair-deadsea')
      p.delete('sub')
      p.delete('min_price')
      p.delete('max_price')
    },
    isActive: (p) => p.get('category') === 'hair-deadsea',
  },
  {
    id: 'gifts-collection',
    label: 'هدايا وبوكسات فاخرة',
    emoji: '🎁',
    apply: (p) => {
      p.set('category', 'gifts')
      p.delete('sub')
      p.delete('min_price')
      p.delete('max_price')
    },
    isActive: (p) => p.get('category') === 'gifts',
  },
]

export function CategoryStoryPills() {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeCategory = searchParams.get('category') || ''
  const activeSub = searchParams.get('sub') || ''
  const activeMinPrice = searchParams.get('min_price') || ''
  const activeMaxPrice = searchParams.get('max_price') || ''
  const activeSort = searchParams.get('sort') || ''

  const categoryMeta = activeCategory ? CATEGORY_TAXONOMY[activeCategory] : null
  const activeFilterCount = [activeSub, activeMinPrice, activeMaxPrice, activeSort].filter(Boolean).length

  function clearAllFilters() {
    const next = new URLSearchParams()
    const search = searchParams.get('search')
    if (search) next.set('search', search)
    setSearchParams(next)
  }

  function setSubCategory(subSlug: string) {
    const next = new URLSearchParams(searchParams)
    if (subSlug) {
      next.set('sub', subSlug)
    } else {
      next.delete('sub')
    }
    setSearchParams(next)
  }

  function setPriceRange(min?: number, max?: number) {
    const next = new URLSearchParams(searchParams)
    if (min !== undefined) {
      next.set('min_price', String(min))
    } else {
      next.delete('min_price')
    }
    if (max !== undefined) {
      next.set('max_price', String(max))
    } else {
      next.delete('max_price')
    }
    setSearchParams(next)
  }

  function setSort(sortValue: string) {
    const next = new URLSearchParams(searchParams)
    if (sortValue) {
      next.set('sort', sortValue)
    } else {
      next.delete('sort')
    }
    setSearchParams(next)
  }

  return (
    <div className="border-y border-[var(--border)] bg-[#FFFDFB]/95 backdrop-blur-md shadow-xs">
      <div className="container-page py-3">
        {/* ── السطر الأول: شريط الفئات الفرعية أو المجموعات الكبرى ── */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1.5 pt-0.5">
          {categoryMeta ? (
            /* في حال اختيار فئة: نعرض اسم الفئة وشريط فروعها الفرعية */
            <>
              {/* شارة الفئة الأم */}
              <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--gold)]/30 bg-amber-50/60 px-3 py-1.5 text-xs font-black text-amber-900 shadow-2xs">
                <span>{categoryMeta.emoji}</span>
                <span>فئة {categoryMeta.title}</span>
              </div>

              <div className="h-5 w-[1px] bg-stone-200 shrink-0 mx-1" />

              {/* زر تصفح الكل في هذه الفئة */}
              <button
                type="button"
                onClick={() => setSubCategory('')}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  !activeSub
                    ? 'bg-gradient-to-r from-[var(--primary)] to-[#831e3f] text-white shadow-sm shadow-[var(--primary)]/20 scale-[1.02]'
                    : 'border border-stone-200/80 bg-white text-[var(--text)] hover:border-[var(--gold)] hover:bg-[#fffbf8]'
                }`}
              >
                <span>✨</span>
                <span>جميع المعروضات</span>
              </button>

              {/* أزرار الفئات الفرعية المتميزة */}
              {categoryMeta.subcategories.map((sub) => {
                const isSelected = activeSub === sub.slug

                return (
                  <button
                    key={sub.slug}
                    type="button"
                    onClick={() => setSubCategory(sub.slug)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[var(--primary)] to-[#831e3f] text-white shadow-sm shadow-[var(--primary)]/20 scale-[1.02]'
                        : 'border border-stone-200/80 bg-white text-[var(--text)] hover:border-[var(--gold)] hover:bg-[#fffbf8]'
                    }`}
                  >
                    <span>{sub.emoji}</span>
                    <span>{sub.name}</span>
                    {sub.badge && (
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-rose-50 text-[var(--primary)]'
                        }`}
                      >
                        {sub.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </>
          ) : (
            /* في الصفحة الرئيسية: شريط المجموعات الحصرية وتريندات المتجر */
            <>
              {/* جميع المنتجات */}
              <button
                type="button"
                onClick={clearAllFilters}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                  !activeCategory && !activeSort && !activeMinPrice && !activeMaxPrice
                    ? 'bg-gradient-to-r from-[var(--primary)] to-[#831e3f] text-white shadow-sm shadow-[var(--primary)]/20 scale-[1.02]'
                    : 'border border-stone-200/80 bg-white text-[var(--text)] hover:border-[var(--gold)] hover:bg-[#fffbf8]'
                }`}
              >
                <span>🌟</span>
                <span>جميع المختارات</span>
              </button>

              <div className="h-5 w-[1px] bg-stone-200 shrink-0 mx-1" />

              {/* بطاقات المجموعات المختارة */}
              {CURATED_COLLECTIONS.map((col) => {
                const isSelected = col.isActive(searchParams)

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams)
                      if (isSelected) {
                        clearAllFilters()
                      } else {
                        col.apply(next)
                        setSearchParams(next)
                      }
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[var(--primary)] to-[#831e3f] text-white shadow-sm shadow-[var(--primary)]/20 scale-[1.02]'
                        : 'border border-stone-200/80 bg-white text-[var(--text)] hover:border-[var(--gold)] hover:bg-[#fffbf8]'
                    }`}
                  >
                    <span>{col.emoji}</span>
                    <span>{col.label}</span>
                    {col.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100/70 text-amber-900'
                        }`}
                      >
                        {col.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* ── السطر الثاني: شريط الفلاتر الذكية (السعر والترتيب ومسح الفلاتر) ── */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-200/60 pt-2.5 text-xs">
          {/* قسم فلاتر الأسعار */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="shrink-0 text-[11px] font-black tracking-wider text-[var(--gold)] ml-1">
              نطاق السعر:
            </span>

            <button
              type="button"
              onClick={() => setPriceRange(undefined, undefined)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                !activeMinPrice && !activeMaxPrice
                  ? 'bg-stone-900 text-white font-black'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              الكل
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeMaxPrice === '50' && !activeMinPrice) setPriceRange(undefined, undefined)
                else setPriceRange(undefined, 50)
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                activeMaxPrice === '50' && !activeMinPrice
                  ? 'bg-[var(--gold)] text-white font-black shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <span>💰</span>
              <span>أقل من 50 ₪</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeMinPrice === '50' && activeMaxPrice === '100') setPriceRange(undefined, undefined)
                else setPriceRange(50, 100)
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                activeMinPrice === '50' && activeMaxPrice === '100'
                  ? 'bg-[var(--gold)] text-white font-black shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <span>💎</span>
              <span>50 - 100 ₪</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeMinPrice === '100') setPriceRange(undefined, undefined)
                else setPriceRange(100, undefined)
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                activeMinPrice === '100'
                  ? 'bg-[var(--gold)] text-white font-black shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <span>👑</span>
              <span>أكثر من 100 ₪</span>
            </button>
          </div>

          {/* قسم الترتيب ومسح الفلاتر النشطة */}
          <div className="flex items-center gap-2 mr-auto">
            {/* أزرار الفرز السريع */}
            <div className="flex items-center gap-1 bg-stone-100/90 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setSort(activeSort === 'popular' ? '' : 'popular')}
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeSort === 'popular'
                    ? 'bg-white text-[var(--primary)] shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="الفرز حسب الأكثر طلباً"
              >
                🔥 الأكثر طلباً
              </button>

              <button
                type="button"
                onClick={() => setSort(activeSort === 'price_asc' ? '' : 'price_asc')}
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeSort === 'price_asc'
                    ? 'bg-white text-[var(--primary)] shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="الفرز من الأقل سعراً للأعلى"
              >
                🏷️ الأقل سعراً
              </button>
            </div>

            {/* زر مسح الفلاتر يظهر إذا كان هناك أي فلتر نشط */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                title="مسح وتصفير جميع الفلاتر"
              >
                <Icon name="close" className="size-3" />
                <span>مسح الكل ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
