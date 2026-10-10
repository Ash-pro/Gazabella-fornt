import { t } from '../../i18n'
import { useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { getApiErrorMessage, getImageUrl } from '../../lib/apiClient'
import { formatPrice } from '../../lib/format'
import { useStoreInfo } from '../../hooks/useStoreInfo'
import { useReveal } from '../../hooks/useReveal'
import { ALL_PRODUCTS } from '../../lib/routes'
import { ProductCard, ProductCardSkeleton } from '../product/ProductCard'
import { ErrorState } from '../ui/AsyncState'
import { Icon } from '../ui/Icon'
import type { Banner, Category, Collection, ProductBrief } from '../../types/api'

type IconName = Parameters<typeof Icon>[0]['name']

/** روابط البانر تأتي من الخادم: نقبل المسارات الداخلية فقط ونحوّل القديمة منها */
function bannerLink(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  if (value === '/products') return ALL_PRODUCTS
  if (value.startsWith('/categories/')) return '/?category=' + encodeURIComponent(value.slice(12)) + '#products'
  return value
}

/** صورة من الخادم داخل إطار ثابت الأبعاد؛ عند غيابها أو تعذّرها يبقى الإطار ببديل هادئ */
function Cover({ src, priority = false, children }: { src: string | null; priority?: boolean; children?: ReactNode }) {
  const [failed, setFailed] = useState<string | null>(null)
  const url = getImageUrl(src)
  if (!url || failed === url) return <span className="hm-cover hm-cover--empty" aria-hidden="true">{children ?? <img src="/brand/symbol/logo-128.webp" alt="" width="64" height="64" loading="lazy" />}</span>
  return <span className="hm-cover"><img src={url} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => setFailed(url)} /></span>
}

// ───────────────────────────────── Hero ─────────────────────────────────

/**
 * بانر تحريري غير متماثل: عنوان قوي ومساحة بصرية بطبقات (شكل ليلكي، قوس الصورة، لمسة توتية).
 * بلا تبديل تلقائي: عند تعدد البانرات تنقّل يدوي فقط. دون صورة يبقى التكوين متماسكًا برمز العلامة.
 */
function Hero({ slides, tagline }: { slides: Banner[]; tagline?: string | null }) {
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  const active = index % slides.length
  const many = slides.length > 1
  const banner = slides[active]
  const to = bannerLink(banner.link_url)
  const select = (next: number) => setIndex((next + slides.length) % slides.length)
  return (
    <section className="container-page hm-hero" aria-label={t('مختارات Gazabella')} aria-roledescription={many ? t('عارض شرائح') : undefined}
      onTouchStart={(e) => { touchStart.current = e.touches[0]?.clientX ?? null }}
      onTouchEnd={(e) => { const end = e.changedTouches[0]?.clientX; if (many && touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 55) select(active + (end > touchStart.current ? 1 : -1)); touchStart.current = null }}>
      <div className="hm-hero__stage">
        <article key={banner.id} className={`hm-hero__slide ${banner.image_url ? '' : 'is-textonly'}`}
          aria-roledescription={many ? t('شريحة') : undefined} aria-label={many ? t('{v1} من {length}', { v1: active + 1, length: slides.length }) : undefined}>
          <div className="hm-hero__copy">
            {tagline && <p className="hm-hero__kicker">{tagline}</p>}
            {banner.title && (active === 0 ? <h1 className="hm-hero__title">{banner.title}</h1> : <h2 className="hm-hero__title">{banner.title}</h2>)}
            {banner.subtitle && <p className="hm-hero__lead">{banner.subtitle}</p>}
            <div className="hm-hero__actions">
              {to && <Link className="btn-primary hm-cta" to={to}>{banner.link_label || t('اكتشفي المنتجات')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>}
              <Link className={to ? 'hm-link' : 'btn-primary hm-cta'} to={{ hash: '#categories' }}>{t('تصفّحي الأقسام')} {to && <Icon name="arrow" className="size-4 rtl:rotate-180" />}</Link>
            </div>
          </div>
          <div className="hm-hero__visual" aria-hidden="true">
            <span className="hm-hero__shape hm-hero__shape--lilac" />
            <span className="hm-hero__shape hm-hero__shape--berry" />
            <div className="hm-hero__frame">
              {banner.image_url ? <Cover src={banner.image_url} priority={active === 0} /> : <span className="hm-cover hm-cover--empty hm-hero__mark"><img src="/brand/symbol/logo-256.webp" alt="" width="128" height="128" /></span>}
            </div>
          </div>
        </article>
      </div>
      {many && (
        <div className="hm-hero__nav">
          <button type="button" className="icon-button" aria-label={t('البانر السابق')} onClick={() => select(active - 1)}><Icon name="arrow" className="size-4 ltr:rotate-180" /></button>
          <span className="num" aria-live="polite">{active + 1} / {slides.length}</span>
          <button type="button" className="icon-button" aria-label={t('البانر التالي')} onClick={() => select(active + 1)}><Icon name="arrow" className="size-4 rtl:rotate-180" /></button>
        </div>
      )}
    </section>
  )
}

/** أعلى الرئيسية: Hero من بانرات الخادم + مداخل سريعة من المجموعات */
export function HomeIntro() {
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => gazabellaApi.getBanners() })
  const collections = useQuery({ queryKey: ['collections'], queryFn: gazabellaApi.getCollections })
  const settings = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings })
  // أثناء التحميل: هيكل بارتفاع البانر نفسه، والمداخل السريعة ظاهرة من البداية — فلا ينزاح ما تحتها عند وصول البانرات
  if (banners.isPending) return <>
    <div className="container-page hm-hero hm-hero--skeleton" role="status" aria-label={t('نحمّل المختارات')}><div /></div>
    <Shortcuts collections={collections.data ?? []} />
  </>
  const all = banners.data ?? []
  const heroes = all.filter((b) => b.type === 'hero')
  // إن لم يوجد بانر رئيسي نرفع أول بانر ترويجي مكانه حتى لا تبدأ الصفحة بلا رسالة
  const slides = heroes.length ? heroes : all.filter((b) => b.type === 'promo').slice(0, 1)
  return <>
    {banners.isError && <div className="container-page hm-hero hm-hero--error"><ErrorState message={getApiErrorMessage(banners.error)} onRetry={() => void banners.refetch()} /></div>}
    {!!slides.length && <Hero key={slides.map((s) => s.id).join('-')} slides={slides} tagline={settings.data?.tagline} />}
    <Shortcuts collections={collections.data ?? []} />
  </>
}

function Shortcuts({ collections }: { collections: Collection[] }) {
  return (
    <nav className="container-page hm-chips" aria-label={t('مداخل سريعة')}>
      <Link className="hm-chip hm-chip--accent" to="/?sort=-created_at#products"><Icon name="sparkle" className="size-4" />{t('وصل حديثًا')}</Link>
      {collections.map((c) => <Link key={c.id} className="hm-chip" to={`/?collection=${c.id}#products`}>{c.name}</Link>)}
      <Link className="hm-chip" to={ALL_PRODUCTS}>{t('جميع المنتجات')}</Link>
    </nav>
  )
}

// ─────────────────────────────── Categories ───────────────────────────────

/** مداخل اكتشاف: بلاطات بألوان متناوبة وصورة القسم من الخادم (أو رمز العلامة عند غيابها) */
export function CategoryTiles({ categories, loading, current, compact }: { categories: Category[]; loading: boolean; current: string; compact: boolean }) {
  const reveal = useReveal<HTMLElement>()
  if (!loading && !categories.length) return null
  return (
    <section ref={compact ? undefined : reveal} id="categories" className={`container-page hm-section hm-cats ${compact ? 'hm-cats--compact' : ''}`} aria-labelledby="hm-cats-title">
      {!compact && <header className="hm-head"><div><p className="hm-kicker">{t('اكتشفي')}</p><h2 id="hm-cats-title">{t('تسوّقي حسب القسم')}</h2></div></header>}
      {compact && <h2 id="hm-cats-title" className="sr-only">{t('الأقسام')}</h2>}
      <nav className="hm-cats__grid" aria-label={t('تسوق حسب الفئة')}>
        {loading && Array.from({ length: 6 }, (_, i) => <span key={i} className="hm-cat hm-cat--skeleton" aria-hidden="true"><span className="hm-cat__art"><span className="hm-cover" /></span><span className="hm-cat__name" /></span>)}
        {categories.map((c) => (
          <Link key={c.id} to={`/?category=${c.slug}#products`} className="hm-cat" aria-current={current === c.slug ? 'true' : undefined}>
            <span className="hm-cat__art"><Cover src={c.image_url} /></span>
            <span className="hm-cat__name">{c.name}{!compact && <Icon name="arrow" className="hm-cat__arrow size-4 rtl:rotate-180" />}</span>
          </Link>
        ))}
      </nav>
    </section>
  )
}

// ─────────────────────────────── Product rows ───────────────────────────────

function ProductRow({ id, kicker, title, to, linkLabel, products, loading, layout, failed = false, onRetry }: { id: string; kicker?: string; title: string; to: string; linkLabel: string; products: ProductBrief[]; loading: boolean; layout: 'grid' | 'rail'; failed?: boolean; onRetry?: () => void }) {
  const reveal = useReveal<HTMLElement>()
  const rail = useRef<HTMLDivElement>(null)
  const scroll = (dir: 1 | -1) => {
    const el = rail.current
    if (!el) return
    const rtl = getComputedStyle(el).direction === 'rtl'
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const head = <header className="hm-head"><div>{kicker && <p className="hm-kicker">{kicker}</p>}<h2 id={id}>{title}</h2></div>{!failed && <div className="hm-head__tools">{layout === 'rail' && !loading && products.length > 2 && <span className="hm-rail-nav"><button type="button" className="icon-button" aria-label={t('السابق')} onClick={() => scroll(-1)}><Icon name="arrow" className="size-4 ltr:rotate-180" /></button><button type="button" className="icon-button" aria-label={t('التالي')} onClick={() => scroll(1)}><Icon name="arrow" className="size-4 rtl:rotate-180" /></button></span>}<Link className="hm-more" to={to}>{linkLabel} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link></div>}</header>
  // فشل الجلب يختلف عن غياب المنتجات: الأول يعرض تنبيهًا خفيفًا مع إعادة محاولة، والثاني يخفي القسم
  if (failed && !products.length) return (
    <section className="container-page hm-section" aria-labelledby={id}>
      {head}
      <div className="hm-rowerror" role="alert"><p>{t('تعذّر تحميل هذا القسم الآن.')}</p>{onRetry && <button type="button" onClick={onRetry}>{t('إعادة المحاولة')}</button>}</div>
    </section>
  )
  if (!loading && !products.length) return null
  return (
    <section ref={reveal} className={`container-page hm-section hm-products hm-products--${layout}`} aria-labelledby={id}>
      {head}
      <div ref={rail} className={layout === 'rail' ? 'hm-rail' : 'hm-grid'} aria-busy={loading}>
        {loading ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />) : products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}

const BUDGETS: Array<{ min?: number; max?: number }> = [{ max: 25 }, { min: 25, max: 50 }, { min: 50, max: 100 }, { min: 100 }]

function BudgetTiles() {
  const reveal = useReveal<HTMLElement>()
  return (
    <section ref={reveal} className="container-page hm-section" aria-labelledby="hm-budget-title">
      <div className="hm-budget">
        <header className="hm-budget__head"><p className="hm-kicker">{t('على قدّ ميزانيتكِ')}</p><h2 id="hm-budget-title">{t('تسوّقي حسب الميزانية')}</h2></header>
        <div className="hm-budget__list">
          {BUDGETS.map(({ min, max }) => {
            const query = new URLSearchParams()
            if (min !== undefined) query.set('min_price', String(min))
            if (max !== undefined) query.set('max_price', String(max))
            return (
              <Link key={`${min}-${max}`} className="hm-budget__tile" to={`/?${query.toString()}#products`}>
                <small>{min === undefined ? t('حتى') : t('من')}</small>
                <b>{min === undefined ? <span className="num">{formatPrice(max!)}</span> : max === undefined ? <><span className="num">{formatPrice(min)}</span> {t('فأكثر')}</> : <span className="num">{formatPrice(min)} – {formatPrice(max)}</span>}</b>
                <Icon name="arrow" className="size-4 rtl:rotate-180" />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** قسم تحريري: بانر ترويجي أو مجموعة من الخادم، بتكوين منقسم وصورة في قوس */
function PromoBand({ banner, collection }: { banner: Banner | null; collection: Collection | null }) {
  const reveal = useReveal<HTMLElement>()
  const title = banner?.title ?? collection?.name
  if (!title) return null
  const to = banner ? bannerLink(banner.link_url) : `/?collection=${collection!.id}#products`
  const text = banner ? banner.subtitle : collection!.description
  const image = banner ? banner.image_url : collection!.image_url
  return (
    <section ref={reveal} className="container-page hm-section" aria-labelledby="hm-promo-title">
      <div className={`hm-edit ${image ? '' : 'hm-edit--text'}`}>
        <div className="hm-edit__copy">
          <p className="hm-kicker">{banner ? t('من Gazabella') : t('مجموعة')}</p>
          <h2 id="hm-promo-title">{title}</h2>
          {text && <p className="hm-edit__lead">{text}</p>}
          {to && <Link className="hm-edit__cta" to={to}>{banner?.link_label || t('اكتشفي المجموعة')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>}
        </div>
        {image && <div className="hm-edit__art" aria-hidden="true"><span className="hm-edit__ring" /><div className="hm-edit__frame"><Cover src={image} /></div></div>}
      </div>
    </section>
  )
}

/** معلومات خدمة من إعدادات الخادم فقط — لا وعود غير مدعومة بالبيانات */
function ServiceInfo() {
  const reveal = useReveal<HTMLElement>()
  const store = useStoreInfo()
  const items: Array<{ icon: IconName; title: string; text: string }> = []
  if (store.zonesFromServer) items.push({ icon: 'truck', title: t('توصيل إلى {n} مناطق', { n: store.deliveryZones.length }), text: t('رسوم التوصيل تبدأ من {fee}', { fee: formatPrice(store.minDeliveryFee) }) })
  if (store.freeDeliveryThreshold !== null) items.push({ icon: 'sparkle', title: t('توصيل مجاني'), text: t('للطلبات من {amount} فأكثر', { amount: formatPrice(store.freeDeliveryThreshold) }) })
  if (store.paymentMethods?.includes('cod')) items.push({ icon: 'dollar', title: t('الدفع عند الاستلام'), text: t('تدفعين نقداً للمندوب عند وصول طلبكِ') })
  if (store.whatsapp) items.push({ icon: 'whatsapp', title: t('دعم عبر واتساب'), text: t('نجيب على استفساراتكِ عن الطلبات والمنتجات') })
  if (items.length < 2) return null
  return (
    <section ref={reveal} className="container-page hm-section" aria-label={t('خدماتنا')}>
      <ul className="hm-service">
        {items.map((item) => <li key={item.title}><span><Icon name={item.icon} className="size-5" /></span><div><b>{item.title}</b><p>{item.text}</p></div></li>)}
      </ul>
    </section>
  )
}

/** نهاية الرئيسية: الكتالوج الكامل في صفحته بدل عرضه أسفل الرئيسية */
function AllProductsCta() {
  const reveal = useReveal<HTMLElement>()
  return (
    <section ref={reveal} className="container-page hm-section hm-all" aria-labelledby="hm-all-title">
      <h2 id="hm-all-title">{t('كل ما في Gazabella، في مكان واحد')}</h2>
      <Link className="btn-primary hm-cta" to={ALL_PRODUCTS}>{t('تصفّحي كل المنتجات')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>
    </section>
  )
}

const ROW = 4

/** وسط الرئيسية بعد الأقسام: مختارات، قسم تحريري، الجديد، الميزانية، الكتالوج، الخدمات */
export function HomeShowcase() {
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => gazabellaApi.getBanners() })
  const collections = useQuery({ queryKey: ['collections'], queryFn: gazabellaApi.getCollections })
  const featured = useQuery({ queryKey: ['products', { featured: true, per_page: 8 }], queryFn: () => gazabellaApi.getProducts({ featured: true, per_page: 8 }), staleTime: 120_000 })
  const latest = useQuery({ queryKey: ['products', { sort: '-created_at', per_page: 8 }], queryFn: () => gazabellaApi.getProducts({ sort: '-created_at', per_page: 8 }), staleTime: 120_000 })

  const picks = (featured.data?.data ?? []).slice(0, ROW)
  // لا نكرر نفس المنتجات في صفّين: «الجديد» يستبعد ما ظهر في المختارات
  const shown = new Set(picks.map((p) => p.id))
  const fresh = (latest.data?.data ?? []).filter((p) => !shown.has(p.id)).slice(0, 8)

  const all = banners.data ?? []
  const hasHero = all.some((b) => b.type === 'hero')
  const promos = all.filter((b) => b.type === 'promo')
  // أول بانر ترويجي يُستخدم كـ Hero عند غياب البانر الرئيسي، فلا نعيده هنا
  const promo = (hasHero ? promos[0] : promos[1]) ?? null
  const collection = promo ? null : (collections.data ?? []).find((c) => c.description || c.image_url) ?? null

  return <>
    <ProductRow id="hm-picks-title" kicker={t('اختيارات')} title={t('مختارات Gazabella')} to={ALL_PRODUCTS} linkLabel={t('كل المنتجات')} products={picks} layout="grid" loading={featured.isPending} failed={featured.isError} onRetry={() => void featured.refetch()} />
    <PromoBand banner={promo} collection={collection} />
    <ProductRow id="hm-new-title" kicker={t('جديدنا')} title={t('وصل حديثًا')} to="/?sort=-created_at#products" linkLabel={t('كل الجديد')} products={fresh.length >= 2 ? fresh : []} layout="rail" loading={latest.isPending || (featured.isPending && !featured.isError)} failed={latest.isError} onRetry={() => void latest.refetch()} />
    <BudgetTiles />
    <AllProductsCta />
    <ServiceInfo />
  </>
}
