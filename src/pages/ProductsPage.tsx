import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { gazabellaApi, isMockMode, type ProductFilters } from '../api/gazabella'
import { ApiHome } from '../components/home/ApiHome'
import { useWishlist } from '../hooks/useWishlist'
import { getImageUrl } from '../lib/apiClient'
import { CatalogFilters } from '../components/product/CatalogFilters'
import { ProductCard } from '../components/product/ProductCard'
import { EmptyState, ErrorState } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const wishlist = useWishlist()
  useEffect(() => { if (!params.has('store')) return; const next = new URLSearchParams(params); next.delete('store'); setParams(next, {replace:true,state:{preserveScroll:true}}) }, [params, setParams])
  const category = params.get('category') || ''
  const sub = params.get('sub') || ''
  const search = params.get('search') || ''
  const savedOnly = params.get('saved') === 'true'
  const validSort = ['-created_at', 'created_at', 'price', '-price'].includes(params.get('sort') || '') ? params.get('sort') as ProductFilters['sort'] : undefined
  const numberParam = (name: string) => { const raw = params.get(name); const n = Number(raw); return raw && Number.isFinite(n) && n >= 0 ? n : undefined }
  const page = Math.max(1, Math.floor(numberParam('page') || 1))
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
    min_price: numberParam('min_price'),
    max_price: numberParam('max_price'),
    collection_id: numberParam('collection'),
    page,
    per_page: 12,
  }
  const products = useQuery({ queryKey: ['products', filters], queryFn: () => gazabellaApi.getProducts(filters), enabled: !resolvedCategorySlug || isMockMode() || resolvedCategoryId !== undefined, placeholderData: keepPreviousData, staleTime: 60_000 })
  const currentCategory = categoriesData.data?.find((c) => c.slug === category)
  const active = Boolean(params.has('collection') || category || sub || search || validSort || filters.min_price !== undefined || filters.max_price !== undefined || savedOnly || page > 1)
  const CatalogTitle = active ? 'h1' : 'h2'
  function setFilter(name: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(name, value); else next.delete(name); next.delete('page'); if (name === 'category') next.delete('sub'); setParams(next, {state:{preserveScroll:true},replace:name === 'min_price' || name === 'max_price'}) }
  const chips = [
    ...params.getAll('category').map((value) => ({key:'category',value,label:categoriesData.data?.find((c) => c.slug === value)?.name || value})),
    ...(sub ? [{key:'sub',value:sub,label:currentCategory?.children?.find((c) => c.slug === sub)?.name || sub}] : []),
    ...(filters.min_price !== undefined || filters.max_price !== undefined ? [{key:'price',value:'',label:`السعر: ${filters.min_price ?? 0} ₪ – ${filters.max_price === undefined ? 'بلا حد' : filters.max_price + ' ₪'}`}] : []),
    ...(search ? [{key:'search',value:search,label:search}] : []),
    ...(savedOnly ? [{key:'saved',value:'true',label:'المحفوظات'}] : []),
  ]
  function removeChip(key:string,value:string) {
    const next = new URLSearchParams(params)
    if(key === 'price') { next.delete('min_price'); next.delete('max_price') }
    else {const keep = next.getAll(key).filter((v) => v !== value); next.delete(key); keep.forEach((v) => next.append(key,v))}
    if(key === 'category') next.delete('sub')
    next.delete('page'); setParams(next,{state:{preserveScroll:true}})
  }
  const unknownCategory = !isMockMode() && !!resolvedCategorySlug && categoriesData.isSuccess && resolvedCategoryId === undefined
  const list = unknownCategory ? [] : savedOnly ? wishlist.query.data ?? [] : products.data?.data ?? []
  return <>
    {!active && !isMockMode() && <ApiHome />}
    {!active && isMockMode() && <section className="container-page editorial-hero">
      <div className="editorial-hero__copy"><span className="eyebrow">اختيارات تشبهكِ</span><h1>تفاصيل صغيرة.<br /><em>جمال كل يوم.</em></h1><p>عناية، عطور وهدايا من متاجر مختارة.<br /><span className="hero-description-more">اكتشفي ما تحبينه في تجربة واحدة، أقرب إليكِ.</span></p><Link to="/#products" className="btn-primary">اكتشفي المختارات <Icon name="arrow" className="size-4 rotate-180" /></Link><div className="hero-note"><span className="tiny-dot" /> من خانيونس، بكل حب</div></div>
      <div className="editorial-hero__image"><img src="/images/hero-beauty.webp" alt="تشكيلة Gazabella للعناية والعطور" fetchPriority="high" /><span className="hero-edition">THE GAZABELLA EDIT <span>01 / BEAUTY</span></span></div>
    </section>}
    {!active && isMockMode() && <div className="container-page service-strip"><span><Icon name="truck" className="size-4" /> سلة واحدة، توصيل موحّد</span><span><Icon name="sparkle" className="size-4" /> اختيارات بعناية</span><span><Icon name="shield" className="size-4" /> تجربة واضحة من البداية</span></div>}
    <section id="categories" className="container-page category-section"><div className="section-heading"><h2>لكل جانب من جمالكِ</h2><span>اكتشفي الأقسام</span></div><nav className="category-rail" aria-label="تسوق حسب الفئة">{categoriesData.data?.map((c) => <Link key={c.id} to={`/?category=${c.slug}#products`} className={category === c.slug ? 'category-tile active' : 'category-tile'}><div><img src={getImageUrl(c.image_url) || '/brand/symbol/logo-128.webp'} alt="" loading="lazy" /></div><span>{c.name}</span></Link>)}</nav></section>
    {savedOnly && !wishlist.authenticated && <div className="container-page py-6"><Link className="btn-primary" to="/auth?next=%2F%3Fsaved%3Dtrue">سجّلي الدخول لعرض المفضلة</Link></div>}
    {savedOnly && wishlist.query.isError && <div className="container-page"><ErrorState message={getApiErrorMessage(wishlist.query.error)} onRetry={() => void wishlist.query.refetch()} /></div>}
    {categoriesData.isError && <div className="container-page"><ErrorState message={getApiErrorMessage(categoriesData.error)} onRetry={() => void categoriesData.refetch()} /></div>}
    <section id="products" className="container-page catalog-section">
      <div className="section-heading"><div><span className="eyebrow">{active ? 'اختياراتكِ، بطريقتكِ' : 'THE EVERYDAY EDIT'}</span><CatalogTitle>{savedOnly ? 'محفوظاتكِ' : search ? `نتائج «${search}»` : currentCategory?.children?.find((c) => c.slug === sub)?.name || currentCategory?.name || 'مختارات تستحق مكانًا لديكِ'}</CatalogTitle><p>{products.data ? <><span className="num">{savedOnly ? list.length : products.data?.meta?.total ?? 0}</span> منتج</> : 'نجهّز مختاراتكِ…'}{products.isFetching && !products.isLoading ? ' · جارٍ التحديث' : ''}</p></div><Link className="text-link" to="/?sort=-created_at#products">وصل حديثًا <Icon name="arrow" className="size-4 rotate-180" /></Link></div>
      <div className="catalog-toolbar"><button className="filter-toggle" disabled={savedOnly} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" className="size-4" /> تصفية</button><button className={`filter-toggle ${savedOnly ? 'active' : ''}`} aria-pressed={savedOnly} onClick={() => setFilter('saved', savedOnly ? '' : 'true')}><Icon name="heart" className="size-4" /> المحفوظات</button><label className="sort-label">ترتيب حسب <select disabled={savedOnly} aria-label="ترتيب المنتجات" value={validSort || ''} onChange={(e) => setFilter('sort', e.target.value)}><option value="">المختارات</option><option value="-created_at">الأحدث</option><option value="price">السعر: الأقل أولًا</option><option value="-price">السعر: الأعلى أولًا</option></select></label></div>
      {filtersOpen && <CatalogFilters key={params.toString()} categories={categoriesData.data || []} onClose={() => setFiltersOpen(false)} />}
      {!!chips.length && <div className="active-filters">{chips.map((chip) => <button key={chip.key + chip.value} onClick={() => removeChip(chip.key,chip.value)} aria-label={`إزالة فلتر ${chip.label}`}>{chip.label} ×</button>)}{chips.length > 1 && <button onClick={() => setParams({}, {state:{preserveScroll:true}})}>مسح الكل</button>}</div>}
      {(savedOnly ? wishlist.authenticated && wishlist.query.isPending : !products.data && (products.isLoading || (!!resolvedCategorySlug && categoriesData.isPending))) ? <div className="catalog-grid" aria-label="جارٍ تحميل المنتجات">{Array.from({length: 8}, (_, i) => <div key={i} className="product-skeleton"><div /><span /><span /></div>)}</div> : !savedOnly && !products.data && products.isError ? <ErrorState message={getApiErrorMessage(products.error)} onRetry={() => void products.refetch()} /> : !list.length ? <EmptyState title="لم نجد منتجات مطابقة" message="جرّبي قسمًا آخر أو وسّعي نطاق السعر. يمكنكِ أيضًا مسح التصفية." /> : <div className="catalog-grid" aria-busy={products.isFetching}>{list.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
      {!savedOnly && !unknownCategory && products.data && products.data.meta.last_page > 1 && <nav className="pagination" aria-label="صفحات المنتجات"><button disabled={page === 1 || products.isPlaceholderData} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page - 1)); setParams(next) }}>السابق</button><span><span className="num">{page}</span> / <span className="num">{products.data.meta.last_page}</span></span><button disabled={page >= products.data.meta.last_page || products.isPlaceholderData} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page + 1)); setParams(next) }}>التالي</button></nav>}
    </section>
    {!active && isMockMode() && <section className="container-page collection-editorial"><img src="/images/products/bridal-robe.webp" alt="تشكيلة العروس" loading="lazy" /><div><span className="eyebrow">للحظات التي تبقى</span><h2>ليومكِ الأجمل،<br />تفاصيل على ذوقكِ.</h2><p>اكتشفي تشكيلة العروس والعطور والهدايا، واجمعي اختياراتكِ المفضلة في طلب واحد.</p><Link to="/?category=bridal#products" className="btn-primary">اكتشفي تشكيلة العروس <Icon name="arrow" className="size-4 rotate-180" /></Link></div></section>}
    <section className="container-page closing-note"><Icon name="sparkle" className="size-6" /><h2>الجمال أقرب مما تتخيّلين.</h2><p>متاجر متعددة. تجربة واحدة. Gazabella.</p></section>
  </>
}
