import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { gazabellaApi, type ProductFilters } from '../api/gazabella'
import { CatalogFilters } from '../components/product/CatalogFilters'
import { ProductCard } from '../components/product/ProductCard'
import { EmptyState, ErrorState } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [, setWishlistVersion] = useState(0)
  useEffect(() => { const changed = () => setWishlistVersion((v) => v + 1); window.addEventListener('gazabella-wishlist', changed); return () => window.removeEventListener('gazabella-wishlist', changed) }, [])
  useEffect(() => { if (!params.has('store')) return; const next = new URLSearchParams(params); next.delete('store'); setParams(next, {replace:true,state:{preserveScroll:true}}) }, [params, setParams])
  const category = params.get('category') || ''
  const sub = params.get('sub') || ''
  const search = params.get('search') || ''
  const savedOnly = params.get('saved') === 'true'
  const validSort = ['newest', 'popular', 'price_asc', 'price_desc'].includes(params.get('sort') || '') ? params.get('sort') as ProductFilters['sort'] : undefined
  const numberParam = (name: string) => { const raw = params.get(name); const n = Number(raw); return raw && Number.isFinite(n) && n >= 0 ? n : undefined }
  const page = Math.max(1, Math.floor(numberParam('page') || 1))
  const filters: ProductFilters = { category_slug: sub || (params.getAll('category').length === 1 ? category : undefined), category_slugs: !sub && params.getAll('category').length > 1 ? params.getAll('category') : undefined, search: search || undefined, sort: validSort, min_price: numberParam('min_price'), max_price: numberParam('max_price'), page, per_page: 12 }
  const categories = useQuery({ queryKey: ['categories'], queryFn: gazabellaApi.getCategories })
  const products = useQuery({ queryKey: ['products', filters], queryFn: () => gazabellaApi.getProducts(filters), placeholderData: keepPreviousData })
  const currentCategory = categories.data?.find((c) => c.slug === category)
  const active = Boolean(category || sub || search || validSort || filters.min_price !== undefined || filters.max_price !== undefined || savedOnly || page > 1)
  const CatalogTitle = active ? 'h1' : 'h2'
  function setFilter(name: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(name, value); else next.delete(name); next.delete('page'); if (name === 'category') next.delete('sub'); setParams(next, {state:{preserveScroll:true},replace:name === 'min_price' || name === 'max_price'}) }
  function isSaved(id: number) { try { return localStorage.getItem(`gazabella_wishlist_${id}`) === 'true' } catch { return false } }
  const chips = [
    ...params.getAll('category').map((value) => ({key:'category',value,label:categories.data?.find((c) => c.slug === value)?.name || value})),
    ...(sub ? [{key:'sub',value:sub,label:currentCategory?.children.find((c) => c.slug === sub)?.name || sub}] : []),
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
  const list = products.data?.data.filter((p) => !savedOnly || isSaved(p.id)) || []
  return <>
    {!active && <section className="container-page editorial-hero">
      <div className="editorial-hero__copy"><span className="eyebrow">اختيارات تشبهكِ</span><h1>تفاصيل صغيرة.<br /><em>جمال كل يوم.</em></h1><p>عناية، عطور وهدايا من متاجر مختارة.<br /><span className="hero-description-more">اكتشفي ما تحبينه في تجربة واحدة، أقرب إليكِ.</span></p><Link to="/#products" className="btn-primary">اكتشفي المختارات <Icon name="arrow" className="size-4 rotate-180" /></Link><div className="hero-note"><span className="tiny-dot" /> من خانيونس، بكل حب</div></div>
      <div className="editorial-hero__image"><img src="/images/hero-beauty.webp" alt="تشكيلة Gazabella للعناية والعطور" fetchPriority="high" /><span className="hero-edition">THE GAZABELLA EDIT <span>01 / BEAUTY</span></span></div>
    </section>}
    {!active && <div className="container-page service-strip"><span><Icon name="truck" className="size-4" /> سلة واحدة، توصيل موحّد</span><span><Icon name="sparkle" className="size-4" /> اختيارات بعناية</span><span><Icon name="shield" className="size-4" /> تجربة واضحة من البداية</span></div>}
    <section id="categories" className="container-page category-section"><div className="section-heading"><h2>لكل جانب من جمالكِ</h2><span>اكتشفي الأقسام</span></div><nav className="category-rail" aria-label="تسوق حسب الفئة">{categories.data?.map((c) => <Link key={c.id} to={`/?category=${c.slug}#products`} className={category === c.slug ? 'category-tile active' : 'category-tile'}><div><img src={c.image_url || '/brand/symbol/logo-128.webp'} alt="" loading="lazy" /></div><span>{c.name}</span></Link>)}</nav></section>
    <section id="products" className="container-page catalog-section">
      <div className="section-heading"><div><span className="eyebrow">{active ? 'اختياراتكِ، بطريقتكِ' : 'THE EVERYDAY EDIT'}</span><CatalogTitle>{savedOnly ? 'محفوظاتكِ في هذه النتائج' : search ? `نتائج «${search}»` : currentCategory?.children.find((c) => c.slug === sub)?.name || currentCategory?.name || 'مختارات تستحق مكانًا لديكِ'}</CatalogTitle><p>{products.data ? <><span className="num">{savedOnly ? list.length : products.data.meta.total}</span> منتج</> : 'نجهّز مختاراتكِ…'}{products.isFetching && !products.isLoading ? ' · جارٍ التحديث' : ''}</p></div><Link className="text-link" to="/?sort=newest#products">وصل حديثًا <Icon name="arrow" className="size-4 rotate-180" /></Link></div>
      <div className="catalog-toolbar"><button className="filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" className="size-4" /> تصفية</button><button className={`filter-toggle ${savedOnly ? 'active' : ''}`} aria-pressed={savedOnly} onClick={() => setFilter('saved', savedOnly ? '' : 'true')}><Icon name="heart" className="size-4" /> المحفوظات</button><label className="sort-label">ترتيب حسب <select aria-label="ترتيب المنتجات" value={validSort || ''} onChange={(e) => setFilter('sort', e.target.value)}><option value="">المختارات</option><option value="newest">الأحدث</option><option value="popular">الأكثر طلبًا</option><option value="price_asc">السعر: الأقل أولًا</option><option value="price_desc">السعر: الأعلى أولًا</option></select></label></div>
      {filtersOpen && <CatalogFilters categories={categories.data || []} onClose={() => setFiltersOpen(false)} />}
      {!!chips.length && <div className="active-filters">{chips.map((chip) => <button key={chip.key + chip.value} onClick={() => removeChip(chip.key,chip.value)} aria-label={`إزالة فلتر ${chip.label}`}>{chip.label} ×</button>)}{chips.length > 1 && <button onClick={() => setParams({}, {state:{preserveScroll:true}})}>مسح الكل</button>}</div>}
      {!products.data && products.isLoading ? <div className="catalog-grid" aria-label="جارٍ تحميل المنتجات">{Array.from({length: 8}, (_, i) => <div key={i} className="product-skeleton"><div /><span /><span /></div>)}</div> : !products.data && products.isError ? <ErrorState message={getApiErrorMessage(products.error)} onRetry={() => void products.refetch()} /> : !list.length ? <EmptyState title="لم نجد منتجات مطابقة" message="جرّبي قسمًا آخر أو وسّعي نطاق السعر. يمكنكِ أيضًا مسح التصفية." /> : <div className="catalog-grid" aria-busy={products.isFetching}>{list.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
      {products.data && products.data.meta.last_page > 1 && <nav className="pagination" aria-label="صفحات المنتجات"><button disabled={page === 1 || products.isPlaceholderData} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page - 1)); setParams(next) }}>السابق</button><span><span className="num">{page}</span> / <span className="num">{products.data.meta.last_page}</span></span><button disabled={page >= products.data.meta.last_page || products.isPlaceholderData} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page + 1)); setParams(next) }}>التالي</button></nav>}
    </section>
    {!active && <section className="container-page collection-editorial"><img src="/images/products/bridal-robe.webp" alt="تشكيلة العروس" loading="lazy" /><div><span className="eyebrow">للحظات التي تبقى</span><h2>ليومكِ الأجمل،<br />تفاصيل على ذوقكِ.</h2><p>اكتشفي تشكيلة العروس والعطور والهدايا، واجمعي اختياراتكِ المفضلة في طلب واحد.</p><Link to="/?category=bridal#products" className="btn-primary">اكتشفي تشكيلة العروس <Icon name="arrow" className="size-4 rotate-180" /></Link></div></section>}
    <section className="container-page closing-note"><Icon name="sparkle" className="size-6" /><h2>الجمال أقرب مما تتخيّلين.</h2><p>متاجر متعددة. تجربة واحدة. Gazabella.</p></section>
  </>
}
