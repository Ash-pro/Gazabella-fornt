import { t } from '../../i18n'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { getApiErrorMessage, getImageUrl } from '../../lib/apiClient'
import { formatPrice } from '../../lib/format'
import { useStoreInfo } from '../../hooks/useStoreInfo'
import { ProductCard, ProductCardSkeleton } from '../product/ProductCard'
import { ErrorState } from '../ui/AsyncState'
import { Icon } from '../ui/Icon'
import type { Banner, Category, Collection, ProductBrief } from '../../types/api'

type IconName = Parameters<typeof Icon>[0]['name']

/** روابط البانر تأتي من الخادم: نقبل المسارات الداخلية فقط ونحوّل القديمة منها */
function bannerLink(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  if (value === '/products') return '/#products'
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

function Hero({ slides }: { slides: Banner[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(() => document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const touchStart = useRef<number | null>(null)
  const active = index % slides.length
  const many = slides.length > 1
  const playing = many && !paused && !hovered && !hidden && !reducedMotion

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => setReducedMotion(media.matches)
    const visibility = () => setHidden(document.hidden)
    media.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    return () => { media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % slides.length), 7000)
    return () => window.clearTimeout(timer)
  }, [playing, index, slides.length])

  const select = (next: number) => { setPaused(true); setIndex((next + slides.length) % slides.length) }

  return (
    <section className="container-page hm-hero" aria-label={t('مختارات Gazabella')} aria-roledescription={many ? t('عارض شرائح') : undefined}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setPaused(true)}
      onTouchStart={(e) => { touchStart.current = e.touches[0]?.clientX ?? null }}
      onTouchEnd={(e) => { const end = e.changedTouches[0]?.clientX; if (many && touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 55) select(active + (end > touchStart.current ? 1 : -1)); touchStart.current = null }}>
      <div className="hm-hero__stage" aria-live={playing ? 'off' : 'polite'}>
        {slides.map((banner, position) => {
          const to = bannerLink(banner.link_url)
          const Title = position === 0 ? 'h1' : 'h2'
          return (
            <div key={banner.id} className={`hm-hero__slide ${position === active ? 'is-active' : ''} ${banner.image_url ? '' : 'hm-hero__slide--text'}`} aria-hidden={position !== active} inert={position !== active}
              role={many ? 'group' : undefined} aria-roledescription={many ? t('شريحة') : undefined} aria-label={many ? t('{v1} من {length}', { v1: position + 1, length: slides.length }) : undefined}>
              <div className="hm-hero__copy">
                {banner.title && <Title>{banner.title}</Title>}
                {banner.subtitle && <p>{banner.subtitle}</p>}
                <div className="hm-hero__actions">
                  {to && <Link className="btn-primary" to={to}>{banner.link_label || t('اكتشفي المنتجات')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>}
                  <Link className={to ? 'hm-hero__ghost' : 'btn-primary'} to={{ hash: '#categories' }}>{t('تصفّحي الأقسام')}</Link>
                </div>
              </div>
              {banner.image_url && <div className="hm-hero__art"><Cover src={banner.image_url} priority={position === 0} /></div>}
            </div>
          )
        })}
      </div>
      {many && (
        <div className="hm-hero__nav">
          <button type="button" className="hm-hero__arrow" aria-label={t('البانر السابق')} onClick={() => select(active - 1)}><Icon name="arrow" className="size-4 ltr:rotate-180" /></button>
          <div className="hm-hero__dots" role="group" aria-label={t('اختيار البانر')}>
            {slides.map((banner, position) => <button type="button" key={banner.id} aria-label={t('عرض {v1}', { v1: banner.title || t('البانر {v1}', { v1: position + 1 }) })} aria-current={position === active ? 'true' : undefined} onClick={() => select(position)} />)}
          </div>
          <button type="button" className="hm-hero__arrow" aria-label={t('البانر التالي')} onClick={() => select(active + 1)}><Icon name="arrow" className="size-4 rtl:rotate-180" /></button>
          {!reducedMotion && <button type="button" className="hm-hero__arrow" aria-pressed={paused} aria-label={paused ? t('تشغيل التبديل التلقائي') : t('إيقاف التبديل التلقائي')} onClick={() => setPaused((v) => !v)}><span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span></button>}
        </div>
      )}
    </section>
  )
}

/** أعلى الرئيسية: Hero من بانرات الخادم + مداخل سريعة من المجموعات */
export function HomeIntro() {
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => gazabellaApi.getBanners() })
  const collections = useQuery({ queryKey: ['collections'], queryFn: gazabellaApi.getCollections })
  if (banners.isPending) return <div className="container-page hm-hero hm-hero--skeleton" role="status" aria-label={t('نحمّل المختارات')}><div /></div>
  const all = banners.data ?? []
  const heroes = all.filter((b) => b.type === 'hero')
  // إن لم يوجد بانر رئيسي نرفع أول بانر ترويجي مكانه حتى لا تبدأ الصفحة بلا رسالة
  const slides = heroes.length ? heroes : all.filter((b) => b.type === 'promo').slice(0, 1)
  return <>
    {banners.isError && <div className="container-page"><ErrorState message={getApiErrorMessage(banners.error)} onRetry={() => void banners.refetch()} /></div>}
    {!!slides.length && <Hero key={slides.map((s) => s.id).join('-')} slides={slides} />}
    <Shortcuts collections={collections.data ?? []} />
  </>
}

function Shortcuts({ collections }: { collections: Collection[] }) {
  return (
    <nav className="container-page hm-chips" aria-label={t('مداخل سريعة')}>
      <Link className="hm-chip hm-chip--accent" to="/?sort=-created_at#products"><Icon name="sparkle" className="size-4" />{t('وصل حديثًا')}</Link>
      {collections.map((c) => <Link key={c.id} className="hm-chip" to={`/?collection=${c.id}#products`}>{c.name}</Link>)}
      <Link className="hm-chip" to="/#products">{t('جميع المنتجات')}</Link>
    </nav>
  )
}

// ─────────────────────────────── Categories ───────────────────────────────

export function CategoryTiles({ categories, loading, current, compact }: { categories: Category[]; loading: boolean; current: string; compact: boolean }) {
  if (!loading && !categories.length) return null
  return (
    <section id="categories" className={`container-page hm-section hm-cats ${compact ? 'hm-cats--compact' : ''}`} aria-labelledby="hm-cats-title">
      {!compact && <header className="hm-head"><h2 id="hm-cats-title">{t('تسوّقي حسب القسم')}</h2></header>}
      {compact && <h2 id="hm-cats-title" className="sr-only">{t('الأقسام')}</h2>}
      <nav className="hm-cats__grid" aria-label={t('تسوق حسب الفئة')}>
        {loading && Array.from({ length: 6 }, (_, i) => <span key={i} className="hm-cat hm-cat--skeleton" aria-hidden="true"><span className="hm-cover" /><span className="hm-cat__name" /></span>)}
        {categories.map((c) => (
          <Link key={c.id} to={`/?category=${c.slug}#products`} className="hm-cat" aria-current={current === c.slug ? 'true' : undefined}>
            <Cover src={c.image_url} />
            <span className="hm-cat__name">{c.name}</span>
          </Link>
        ))}
      </nav>
    </section>
  )
}

// ─────────────────────────────── Product rows ───────────────────────────────

function ProductRow({ id, title, to, linkLabel, products, loading, failed = false, onRetry }: { id: string; title: string; to: string; linkLabel: string; products: ProductBrief[]; loading: boolean; failed?: boolean; onRetry?: () => void }) {
  // فشل الجلب يختلف عن غياب المنتجات: الأول يعرض تنبيهًا خفيفًا مع إعادة محاولة، والثاني يخفي القسم
  if (failed && !products.length) return (
    <section className="container-page hm-section" aria-labelledby={id}>
      <header className="hm-head"><h2 id={id}>{title}</h2></header>
      <div className="hm-rowerror" role="alert"><p>{t('تعذّر تحميل هذا القسم الآن.')}</p>{onRetry && <button type="button" onClick={onRetry}>{t('إعادة المحاولة')}</button>}</div>
    </section>
  )
  if (!loading && !products.length) return null
  return (
    <section className="container-page hm-section" aria-labelledby={id}>
      <header className="hm-head"><h2 id={id}>{title}</h2><Link className="hm-more" to={to}>{linkLabel} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link></header>
      <div className="hm-rail" aria-busy={loading}>
        {loading ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />) : products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}

const BUDGETS: Array<{ min?: number; max?: number }> = [{ max: 25 }, { min: 25, max: 50 }, { min: 50, max: 100 }, { min: 100 }]

function BudgetTiles() {
  return (
    <section className="container-page hm-section" aria-labelledby="hm-budget-title">
      <header className="hm-head"><h2 id="hm-budget-title">{t('تسوّقي حسب الميزانية')}</h2></header>
      <div className="hm-budget">
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
    </section>
  )
}

function PromoBand({ banner, collection }: { banner: Banner | null; collection: Collection | null }) {
  const title = banner?.title ?? collection?.name
  if (!title) return null
  const to = banner ? bannerLink(banner.link_url) : `/?collection=${collection!.id}#products`
  const text = banner ? banner.subtitle : collection!.description
  const image = banner ? banner.image_url : collection!.image_url
  return (
    <section className="container-page hm-section" aria-labelledby="hm-promo-title">
      <div className={`hm-promo ${image ? '' : 'hm-promo--text'}`}>
        {image && <div className="hm-promo__art"><Cover src={image} /></div>}
        <div className="hm-promo__copy">
          <h2 id="hm-promo-title">{title}</h2>
          {text && <p>{text}</p>}
          {to && <Link className="btn-primary" to={to}>{banner?.link_label || t('اكتشفي المجموعة')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>}
        </div>
      </div>
    </section>
  )
}

/** معلومات خدمة من إعدادات الخادم فقط — لا وعود غير مدعومة بالبيانات */
function ServiceInfo() {
  const store = useStoreInfo()
  const items: Array<{ icon: IconName; title: string; text: string }> = []
  if (store.zonesFromServer) items.push({ icon: 'truck', title: t('توصيل إلى {n} مناطق', { n: store.deliveryZones.length }), text: t('رسوم التوصيل تبدأ من {fee}', { fee: formatPrice(store.minDeliveryFee) }) })
  if (store.freeDeliveryThreshold !== null) items.push({ icon: 'sparkle', title: t('توصيل مجاني'), text: t('للطلبات من {amount} فأكثر', { amount: formatPrice(store.freeDeliveryThreshold) }) })
  if (store.paymentMethods?.includes('cod')) items.push({ icon: 'dollar', title: t('الدفع عند الاستلام'), text: t('تدفعين نقداً للمندوب عند وصول طلبكِ') })
  if (store.whatsapp) items.push({ icon: 'whatsapp', title: t('دعم عبر واتساب'), text: t('نجيب على استفساراتكِ عن الطلبات والمنتجات') })
  if (items.length < 2) return null
  return (
    <section className="container-page hm-section" aria-label={t('خدماتنا')}>
      <ul className="hm-service">
        {items.map((item) => <li key={item.title}><span><Icon name={item.icon} className="size-5" /></span><div><b>{item.title}</b><p>{item.text}</p></div></li>)}
      </ul>
    </section>
  )
}

const ROW = 4

/** وسط الرئيسية: مختارات، ميزانية، مساحة ترويجية، الجديد، معلومات الخدمة */
export function HomeShowcase() {
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => gazabellaApi.getBanners() })
  const collections = useQuery({ queryKey: ['collections'], queryFn: gazabellaApi.getCollections })
  const featured = useQuery({ queryKey: ['products', { featured: true, per_page: 8 }], queryFn: () => gazabellaApi.getProducts({ featured: true, per_page: 8 }), staleTime: 120_000 })
  const latest = useQuery({ queryKey: ['products', { sort: '-created_at', per_page: 8 }], queryFn: () => gazabellaApi.getProducts({ sort: '-created_at', per_page: 8 }), staleTime: 120_000 })

  const picks = (featured.data?.data ?? []).slice(0, ROW)
  // لا نكرر نفس المنتجات في صفّين: «الجديد» يستبعد ما ظهر في المختارات
  const shown = new Set(picks.map((p) => p.id))
  const fresh = (latest.data?.data ?? []).filter((p) => !shown.has(p.id)).slice(0, ROW)

  const all = banners.data ?? []
  const hasHero = all.some((b) => b.type === 'hero')
  const promos = all.filter((b) => b.type === 'promo')
  // أول بانر ترويجي يُستخدم كـ Hero عند غياب البانر الرئيسي، فلا نعيده هنا
  const promo = (hasHero ? promos[0] : promos[1]) ?? null
  const collection = promo ? null : (collections.data ?? []).find((c) => c.description || c.image_url) ?? null

  return <>
    <ProductRow id="hm-picks-title" title={t('مختارات Gazabella')} to="/#products" linkLabel={t('كل المنتجات')} products={picks} loading={featured.isPending} failed={featured.isError} onRetry={() => void featured.refetch()} />
    <BudgetTiles />
    <PromoBand banner={promo} collection={collection} />
    <ProductRow id="hm-new-title" title={t('وصل حديثًا')} to="/?sort=-created_at#products" linkLabel={t('كل الجديد')} products={fresh.length >= 2 ? fresh : []} loading={latest.isPending || (featured.isPending && !featured.isError)} failed={latest.isError} onRetry={() => void latest.refetch()} />
    <ServiceInfo />
  </>
}
