import { plural, t } from '../i18n'
import { isMvp0Api } from '../lib/apiContract'
import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { gazabellaApi, isMockMode, type ProductFilters } from '../api/gazabella'
import { CategoryTiles, HomeIntro, HomeShowcase } from '../components/home/HomeSections'
import { useWishlist } from '../hooks/useWishlist'
import { CatalogFilters } from '../components/product/CatalogFilters'
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard'
import { EmptyState, ErrorState } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatPrice } from '../lib/format'
import { activeFilterCount, clearFilters, clearSearch, readCatalog, removeFilter, sanitizeCatalogParams, setCatalogParam } from '../lib/catalogParams'
import type { Category } from '../types/api'

/** كلمة العدّ بعد الرقم: 1 منتج · 2 منتج · 5 منتجات · 15 منتجاً */
const COUNT_FORMS = { one: 'منتج', two: 'منتج', few: 'منتجات', many: 'منتجاً' }

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)
  const wishlist = useWishlist()
  useEffect(() => { if (!params.has('store')) return; const next = new URLSearchParams(params); next.delete('store'); setParams(next, {replace:true,state:{preserveScroll:true}}) }, [params, setParams])
  // قيم رابط لا يمكن تطبيقها تُزال من الرابط نفسه (replace) فلا يختلف الرابط عمّا يُعرض
  useEffect(() => { const clean = sanitizeCatalogParams(params); if (clean) setParams(clean, { replace: true, state: { preserveScroll: true } }) }, [params, setParams])
  // حالة الكتالوج من الرابط بعد التحقق: البحث بلا مسافات طرفية، وقيم السعر/الفرز/الصفحة غير الصالحة لا تُرسل للخادم
  const state = readCatalog(params)
  const { category, sub, search, page } = state
  const savedOnly = !isMvp0Api() && params.get('saved') === 'true'
  const validSort = state.sort
  const categoriesData = useQuery({ queryKey: ['categories'], queryFn: gazabellaApi.getCategories, staleTime: 300_000 })
  // Resolve slug → category_id for API mode
  const resolvedCategorySlug = sub || category || undefined
  const resolvedCategoryId = !isMockMode() && resolvedCategorySlug
    ? (() => {
        const flat = (categoriesData.data ?? []).flatMap((c) => [c, ...(c.children ?? [])])
        return flat.find((c) => c.slug === resolvedCategorySlug)?.id
      })()
    : undefined
  const filters: ProductFilters = {
    ...(isMockMode() ? { category_slug: resolvedCategorySlug } : { category_id: resolvedCategoryId }),
    search: search || undefined,
    sort: validSort,
    min_price: state.minPrice,
    max_price: state.maxPrice,
    collection_id: state.collection,
    page,
    per_page: 12,
  }
  const products = useQuery({ queryKey: ['products', filters], queryFn: () => gazabellaApi.getProducts(filters), enabled: !state.priceRangeInvalid && (!resolvedCategorySlug || isMockMode() || resolvedCategoryId !== undefined), placeholderData: keepPreviousData, staleTime: 60_000 })
  const currentCategory = categoriesData.data?.find((c) => c.slug === category)
  const active = Boolean(params.has('all') || params.has('collection') || category || sub || params.has('search') || validSort || state.minPrice !== undefined || state.maxPrice !== undefined || savedOnly || page > 1)
  const CatalogTitle = active ? 'h1' : 'h2'
  const lastPage = products.data?.meta?.last_page
  // صفحة بعد آخر صفحة (رابط قديم أو تغيّر عدد النتائج): ننتقل لآخر صفحة موجودة بدل «لا نتائج» مضللة
  useEffect(() => {
    if (!lastPage || products.isPlaceholderData || page <= lastPage || !(products.data?.meta?.total)) return
    const next = new URLSearchParams(params); if (lastPage > 1) next.set('page', String(lastPage)); else next.delete('page')
    setParams(next, { replace: true, state: { preserveScroll: true } })
  }, [lastPage, page, params, products.data, products.isPlaceholderData, setParams])
  function setFilter(name: string, value: string) { setParams(setCatalogParam(params, name, value), {state:{preserveScroll:true}}) }
  function goToPage(n: number) { const next = new URLSearchParams(params); if (n > 1) next.set('page', String(n)); else next.delete('page'); navigate({ search: '?' + next.toString(), hash: '#products' }) }
  const filterCount = activeFilterCount(state)
  const priceLabel = t('السعر: {min} – {max}', { min: formatPrice(state.minPrice ?? 0), max: state.maxPrice === undefined ? t('بلا حد') : formatPrice(state.maxPrice) })
  const chips: { key: 'category' | 'sub' | 'price' | 'collection'; label: string }[] = [
    ...(category ? [{key:'category' as const,label:categoriesData.data?.find((c) => c.slug === category)?.name || category}] : []),
    ...(sub ? [{key:'sub' as const,label:currentCategory?.children?.find((c) => c.slug === sub)?.name || sub}] : []),
    ...(state.minPrice !== undefined || state.maxPrice !== undefined ? [{key:'price' as const,label:priceLabel}] : []),
  ]
  const unknownCategory = !isMockMode() && !!resolvedCategorySlug && categoriesData.isSuccess && resolvedCategoryId === undefined
  const shownCount = unknownCategory ? 0 : savedOnly ? (wishlist.query.data ?? []).length : products.data?.meta?.total ?? 0
  const list = unknownCategory ? [] : savedOnly ? wishlist.query.data ?? [] : products.data?.data ?? []
  const home = !active && !isMockMode() && !isMvp0Api()
  return <>
    {home && <HomeIntro />}
    {!active && (isMockMode() || isMvp0Api()) && <section className="container-page editorial-hero">
      <div className="editorial-hero__copy"><span className="eyebrow">{t('اختيارات تشبهكِ')}</span><h1>{t('تفاصيل صغيرة.')}<br /><em>{t('جمال كل يوم.')}</em></h1><p>{t('عناية، عطور وهدايا من متاجر مختارة.')}<br /><span className="hero-description-more">{t('اكتشفي ما تحبينه في تجربة واحدة، أقرب إليكِ.')}</span></p><Link to="/#products" className="btn-primary">{t('تسوّقي المنتجات')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link><div className="hero-note"><span className="tiny-dot" /> {t('من خانيونس، بكل حب')}</div></div>
      <div className="editorial-hero__image"><img src="/images/hero-beauty.webp" alt={t('تشكيلة Gazabella للعناية والعطور')} fetchPriority="high" /><span className="hero-edition">THE GAZABELLA EDIT <span>01 / BEAUTY</span></span></div>
    </section>}
    {!active && isMockMode() && <div className="container-page service-strip"><span><Icon name="truck" className="size-4" /> {t('سلة واحدة، توصيل موحّد')}</span><span><Icon name="sparkle" className="size-4" /> {t('اختيارات بعناية')}</span><span><Icon name="shield" className="size-4" /> {t('تجربة واضحة من البداية')}</span></div>}
    <CategoryTiles categories={categoriesData.data ?? []} loading={categoriesData.isPending} current={category} compact={!home} />
    {home && <HomeShowcase />}
    {savedOnly && !wishlist.authenticated && <div className="container-page py-6"><Link className="btn-primary" to="/auth?next=%2F%3Fsaved%3Dtrue">{t('سجّلي الدخول لعرض المفضلة')}</Link></div>}
    {savedOnly && wishlist.query.isError && <div className="container-page"><ErrorState message={getApiErrorMessage(wishlist.query.error)} onRetry={() => void wishlist.query.refetch()} /></div>}
    {categoriesData.isError && <div className="container-page"><ErrorState message={getApiErrorMessage(categoriesData.error)} onRetry={() => void categoriesData.refetch()} /></div>}
    {!home && <section id="products" className="container-page catalog-section">
      <div className="section-heading"><div>{!home && <span className="eyebrow">{active ? t('اختياراتكِ، بطريقتكِ') : 'THE EVERYDAY EDIT'}</span>}<CatalogTitle>{savedOnly ? t('محفوظاتكِ') : search ? t('نتائج «{search}»', { search: search }) : currentCategory?.children?.find((c) => c.slug === sub)?.name || currentCategory?.name || ((home || active) ? t('كل المنتجات') : t('مختارات تستحق مكانًا لديكِ'))}</CatalogTitle><p>{state.priceRangeInvalid || (products.isError && !products.data) ? null : unknownCategory || products.data ? (shownCount ? <><span className="num">{shownCount}</span> {plural(shownCount, COUNT_FORMS)}</> : t('لا نتائج'))  : t('نجهّز مختاراتكِ…')}{products.isFetching && !products.isLoading ? t(' · جارٍ التحديث') : ''}</p></div><Link className="text-link" to="/?sort=-created_at#products">{t('وصل حديثًا')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link></div>
      <div className="catalog-toolbar"><button ref={filterButton} className={`filter-toggle ${filterCount ? 'has-count' : ''}`} disabled={savedOnly} aria-expanded={filtersOpen} aria-label={filterCount ? t('تصفية، {n} مطبّقة', { n: filterCount }) : undefined} onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" className="size-4" /> {t('تصفية')}{!!filterCount && <span className="filter-count num" aria-hidden="true">{filterCount}</span>}</button>{!isMvp0Api() && <button className={`filter-toggle ${savedOnly ? 'active' : ''}`} aria-pressed={savedOnly} onClick={() => setFilter('saved', savedOnly ? '' : 'true')}><Icon name="heart" className="size-4" /> {t('المحفوظات')}</button>}<label className="sort-label">{t('ترتيب حسب')} <select disabled={savedOnly} aria-label={t('ترتيب المنتجات')} value={validSort || ''} onChange={(e) => setFilter('sort', e.target.value)}><option value="">{t('المختارات')}</option><option value="-created_at">{t('الأحدث')}</option><option value="price">{t('السعر: الأقل أولًا')}</option><option value="-price">{t('السعر: الأعلى أولًا')}</option></select></label></div>
      {filtersOpen && <CatalogFilters key={params.toString()} categories={categoriesData.data || []} onClose={() => { setFiltersOpen(false); requestAnimationFrame(() => filterButton.current?.focus({ preventScroll: true })) }} />}
      {(!!search || !!chips.length || savedOnly) && <div className="active-filters" aria-label={t('القيود الحالية')}>
        {!!search && <button type="button" className="chip-search" onClick={() => setParams(clearSearch(params), {state:{preserveScroll:true}})} aria-label={t('مسح البحث «{search}»', { search })}><Icon name="search" className="size-3.5" /> <bdi>{search}</bdi> ×</button>}
        {chips.map((chip) => <button type="button" key={chip.key} onClick={() => setParams(removeFilter(params, chip.key), {state:{preserveScroll:true}})} aria-label={t('إزالة فلتر {label}', { label: chip.label })}><bdi>{chip.label}</bdi> ×</button>)}
        {savedOnly && <button type="button" onClick={() => setFilter('saved', '')} aria-label={t('إزالة فلتر {label}', { label: t('المحفوظات') })}>{t('المحفوظات')} ×</button>}
        {!!chips.length && <button type="button" className="chip-clear" onClick={() => setParams(clearFilters(params), {state:{preserveScroll:true}})}>{t('مسح الفلاتر')}</button>}
      </div>}
      {state.priceRangeInvalid && <div className="catalog-notice" role="alert"><p>{t('الحد الأدنى للسعر أكبر من الحد الأعلى، فلم نعرض نتائج.')}</p><button type="button" className="text-link" onClick={() => setParams(removeFilter(params, 'price'), {state:{preserveScroll:true}})}>{t('إزالة فلتر السعر')}</button><button type="button" className="text-link" onClick={() => setFiltersOpen(true)}>{t('تعديل السعر')}</button></div>}
      {(savedOnly ? wishlist.authenticated && wishlist.query.isPending : !products.data && !state.priceRangeInvalid && (products.isLoading || (!!resolvedCategorySlug && categoriesData.isPending))) ? <div className="catalog-grid" aria-label={t('جارٍ تحميل المنتجات')}>{Array.from({length: 8}, (_, i) => <ProductCardSkeleton key={i} />)}</div> : !savedOnly && !products.data && products.isError ? <ErrorState message={getApiErrorMessage(products.error)} onRetry={() => void products.refetch()} /> : state.priceRangeInvalid ? null : !list.length ? (savedOnly ? <EmptyState title={t('لم نجد منتجات مطابقة')} message={t('جرّبي قسمًا آخر أو وسّعي نطاق السعر. يمكنكِ أيضًا مسح التصفية.')} /> : <CatalogEmpty search={search} filterCount={filterCount} categories={categoriesData.data ?? []} onClearSearch={() => setParams(clearSearch(params), {state:{preserveScroll:true}})} onClearFilters={() => setParams(clearFilters(params), {state:{preserveScroll:true}})} />) : <div className={`catalog-grid${products.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={products.isFetching}>{list.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
      {!savedOnly && !unknownCategory && products.data && products.data.meta.last_page > 1 && <nav className="pagination" aria-label={t('صفحات المنتجات')}><button disabled={page === 1 || products.isPlaceholderData} onClick={() => goToPage(page - 1)}>{t('السابق')}</button><span><span className="num">{page}</span> / <span className="num">{products.data.meta.last_page}</span></span><button disabled={page >= products.data.meta.last_page || products.isPlaceholderData} onClick={() => goToPage(page + 1)}>{t('التالي')}</button></nav>}
    </section>}
    {!active && isMockMode() && <section className="container-page collection-editorial"><img src="/images/products/bridal-robe.webp" alt={t('تشكيلة العروس')} loading="lazy" /><div><span className="eyebrow">{t('للحظات التي تبقى')}</span><h2>{t('ليومكِ الأجمل،')}<br />{t('تفاصيل على ذوقكِ.')}</h2><p>{t('اكتشفي تشكيلة العروس والعطور والهدايا، واجمعي اختياراتكِ المفضلة في طلب واحد.')}</p><Link to="/?category=bridal#products" className="btn-primary">{t('اكتشفي تشكيلة العروس')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link></div></section>}
    {!home && <section className="container-page closing-note"><Icon name="sparkle" className="size-6" /><h2>{t('الجمال أقرب مما تتخيّلين.')}</h2><p>{t('متاجر متعددة. تجربة واحدة. Gazabella.')}</p></section>}
  </>
}

/** لا نتائج: نوضح السبب (البحث أو الفلاتر) ونعرض مخرجًا حقيقيًا — إزالة القيد أو أقسام موجودة فعلًا */
function CatalogEmpty({ search, filterCount, categories, onClearSearch, onClearFilters }: { search: string; filterCount: number; categories: Category[]; onClearSearch: () => void; onClearFilters: () => void }) {
  const title = search ? t('لا نتائج لـ «{search}»', { search }) : t('لا منتجات ضمن هذه الفلاتر')
  const message = search && filterCount ? t('جرّبي إزالة الفلاتر أو تعديل عبارة البحث.') : search ? t('جرّبي كلمة أخرى أو تصفّحي الأقسام.') : t('جرّبي إزالة بعض الفلاتر أو تصفّحي قسمًا آخر.')
  return <div className="catalog-empty" role="status">
    <h2><bdi>{title}</bdi></h2>
    <p>{message}</p>
    <div className="catalog-empty__actions">
      {!!filterCount && <button type="button" className="btn-primary" onClick={onClearFilters}>{t('مسح الفلاتر')}</button>}
      {!!search && <button type="button" className={filterCount ? 'btn-ghost' : 'btn-primary'} onClick={onClearSearch}>{t('مسح البحث وعرض كل المنتجات')}</button>}
    </div>
    {!!categories.length && <nav className="catalog-empty__cats" aria-label={t('تصفّحي الأقسام')}><p>{t('أو تصفّحي الأقسام:')}</p><div>{categories.slice(0, 8).map((c) => <Link key={c.id} to={`/?category=${encodeURIComponent(c.slug)}#products`}>{c.name}</Link>)}</div></nav>}
  </div>
}
