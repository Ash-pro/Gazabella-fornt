import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { getApiErrorMessage } from '../../lib/apiClient'
import { ProductVisual } from '../product/ProductVisual'
import { ErrorState, PageLoader } from '../ui/AsyncState'
import { Icon } from '../ui/Icon'
import type { Banner } from '../../types/api'

function bannerLink(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  if (value === '/products') return '/#products'
  if (value.startsWith('/categories/')) return '/?category=' + encodeURIComponent(value.slice(12)) + '#products'
  return value
}

function BannerSlider({ slides }: { slides: Banner[] }) {
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(() => document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const active = index % slides.length
  const playing = slides.length > 1 && !paused && !hovered && !hidden && !reducedMotion
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
  function select(next: number) { setPaused(true); setIndex((next + slides.length) % slides.length) }
  return <section className="container-page banner-showcase" aria-label="مختارات Gazabella" aria-roledescription="عارض شرائح" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setPaused(true)}>
    <div className="banner-stage" aria-live={playing ? 'off' : 'polite'}>
      {slides.map((banner, position) => <div key={banner.id} className={`banner-slide ${position === active ? 'is-active' : ''} ${!banner.image_url ? 'banner-slide--text' : ''}`} aria-hidden={position !== active} inert={position !== active} role="group" aria-roledescription="شريحة" aria-label={`${position + 1} من ${slides.length}`}>
        <div className="banner-copy">
          <span className="banner-kicker"><span /> GAZABELLA EDIT</span>
          <span className="banner-category">{banner.type === 'hero' ? 'جمال يرافق يومكِ' : 'للحظاتكِ المميزة'}</span>
          {position === 0 ? <h1>{banner.title}</h1> : <h2>{banner.title}</h2>}
          {banner.subtitle && <p>{banner.subtitle}</p>}
          {bannerLink(banner.link_url) && <Link className="banner-cta" to={bannerLink(banner.link_url)!}>{banner.link_label || 'اكتشفي المنتجات'}<span><Icon name="arrow" className="size-5 rotate-180" /></span></Link>}
          <span className="banner-signature">تفاصيل تختارينها. جمال يشبهكِ.</span>
        </div>
        {banner.image_url && <div className="banner-art" onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null }} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientX; if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 55) select(active + (end > touchStart.current ? 1 : -1)); touchStart.current = null }} onTouchCancel={() => { touchStart.current = null }}><div className="banner-image-frame"><ProductVisual src={banner.image_url} alt={banner.title || ''} priority={position === 0} /></div><span className="banner-art-label" aria-hidden="true">THE BEAUTY OF EVERYDAY</span><span className="banner-edition" aria-hidden="true">{String(position + 1).padStart(2, '0')}<small>THE EDIT</small></span></div>}
      </div>)}
    </div>
    {slides.length > 1 && <div className="banner-navigation">
      <div className="banner-selectors" aria-label="اختيار البانر">{slides.map((banner, position) => <button type="button" key={banner.id} aria-label={`عرض ${banner.title || `البانر ${position + 1}`}`} aria-current={position === active ? 'true' : undefined} className={position === active ? 'is-active' : ''} onClick={() => select(position)}><span className="banner-selector-number">{String(position + 1).padStart(2, '0')}</span><span>{banner.title || `البانر ${position + 1}`}</span></button>)}</div>
      <div className="banner-controls"><button type="button" aria-label="البانر السابق" onClick={() => select(active - 1)}><Icon name="arrow" className="size-5" /></button><span className="banner-count" dir="ltr">{String(active + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span><button type="button" aria-label="البانر التالي" onClick={() => select(active + 1)}><Icon name="arrow" className="size-5 rotate-180" /></button>{!reducedMotion && <button type="button" className="banner-play" aria-label={paused ? 'تشغيل التبديل التلقائي' : 'إيقاف التبديل التلقائي'} onClick={() => setPaused((value) => !value)}>{paused ? <span aria-hidden="true">▷</span> : <span aria-hidden="true">Ⅱ</span>}</button>}</div>
    </div>}
  </section>
}

export function ApiHome() {
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => gazabellaApi.getBanners() })
  const collections = useQuery({ queryKey: ['collections'], queryFn: gazabellaApi.getCollections })
  if (banners.isPending) return <div className="container-page"><PageLoader /></div>
  if (banners.isError) return <div className="container-page"><ErrorState message={getApiErrorMessage(banners.error)} onRetry={() => void banners.refetch()} /></div>
  const slides = banners.data.filter((banner) => banner.type === 'hero' || banner.type === 'promo')
  return <>
    {!!slides.length && <BannerSlider key={slides.map((slide) => slide.id).join('-')} slides={slides} />}
    {!!collections.data?.length && <nav className="container-page service-strip" aria-label="المجموعات">{collections.data.map((collection) => <Link key={collection.id} to={`/?collection=${collection.id}#products`}>{collection.name}</Link>)}</nav>}
  </>
}
