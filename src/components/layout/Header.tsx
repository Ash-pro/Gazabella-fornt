import { t } from '../../i18n'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { useAuthStore } from '../../stores/authStore'
import { getImageUrl } from '../../lib/apiClient'
import { useCartStore } from '../../stores/cartStore'
import { Icon } from '../ui/Icon'
import { SearchBox } from './SearchBox'
import { Dialog } from '../ui/Dialog'
import { LanguageSwitch } from './LanguageSwitch'
import { AccountMenu } from './AccountMenu'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const token = useAuthStore((s) => s.token)
  const openDrawer = useCartStore((s) => s.openDrawer)
  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: gazabellaApi.getCart, staleTime: 30_000 })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: gazabellaApi.getCategories, staleTime: 300_000 })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings })
  const { data: banners } = useQuery({ queryKey: ['banners'], queryFn: () => gazabellaApi.getBanners() })
  const announcement = banners?.find((b) => b.type === 'announcement')
  // الشريط العلوي ثابت الارتفاع وموجود دائمًا: يعرض إعلان الخادم عند توفره، وإلا سطر تعريف ثابت بالمتجر —
  // فلا تنزاح الصفحة عند وصول الإعلان ولا عند غيابه أو فشل جلبه، ودون وعود تجارية غير واردة من البيانات
  const announcementText = announcement?.title?.trim() || ''
  // ارتفاع الهيدر الثابت يتغير مع المقاس واللغة والإعلان؛ نعلنه كمتغير CSS لتعويض الروابط الداخلية (#products…)
  const headerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const apply = () => document.documentElement.style.setProperty('--header-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const searchField = <SearchBox />
  return <>
    <aside className="announcement" aria-label={announcementText ? t('إعلان') : undefined}><span className="announcement__text" title={announcementText || undefined}>{announcementText || t('متاجر متعددة. تجربة واحدة. Gazabella.')}</span></aside>
    <header ref={headerRef} className="store-header">
      <div className="container-page header-main">
        <button className="icon-button menu-trigger" aria-label={t('فتح التصنيفات')} onClick={() => setMenuOpen(true)}><Icon name="menu" className="size-5" /></button>
        <Link to="/" aria-label={t('Gazabella — الرئيسية')} className="brand-lockup"><img src={getImageUrl(settings?.logo_url) || "/brand/symbol/logo-128.webp"} alt="" width="44" height="44" decoding="async" /><span><b>{settings?.store_name || "Gazabella"}</b><small>{settings ? settings.tagline : t('الجمال، أقرب إليكِ')}</small></span></Link>
        <div className="desktop-search">{searchField}</div>
        <div className="header-actions"><Link className="track-link" to="/track"><Icon name="package" className="size-[18px]" /><span>{t('تتبع طلبك')}</span></Link><LanguageSwitch />{token ? <AccountMenu /> : <Link className="icon-button" to="/auth" aria-label={t('تسجيل الدخول')}><Icon name="user" className="size-5" /></Link>}<button className="icon-button relative" onClick={openDrawer} aria-label={t('السلة، {v1} عناصر', { v1: cart?.total_items ?? 0 })}><Icon name="bag" className="size-5" />{!!cart?.total_items && <span className="cart-count">{cart.total_items}</span>}</button></div>
      </div>
      <div className="container-page mobile-search">{searchField}</div>
      <nav className="container-page header-nav" aria-label={t('التصنيفات الرئيسية')}><Link to="/#products" className={!searchParams.get('category') ? 'active' : ''}>{t('جميع المنتجات')}</Link>{categories?.map((category) => <Link key={category.id} className={searchParams.get('category') === category.slug ? 'active' : ''} to={`/?category=${category.slug}#products`}>{category.name}</Link>)}</nav>
    </header>
    {menuOpen && <Dialog title={t('اكتشفي Gazabella')} sheet onClose={() => setMenuOpen(false)}><div className="p-5 space-y-3"><Link className="menu-category" to="/#products" onClick={() => setMenuOpen(false)}>{t('جميع المنتجات')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>{categories?.map((category) => <details key={category.id} className="category-disclosure"><summary>{category.name}</summary><Link to={`/?category=${category.slug}#products`} onClick={() => setMenuOpen(false)}>{t('كل')} {category.name}</Link>{(category.children ?? []).map((child) => <Link key={child.id} to={`/?category=${category.slug}&sub=${child.slug}#products`} onClick={() => setMenuOpen(false)}>{child.name}</Link>)}</details>)}<Link className="menu-category" to="/track" onClick={() => setMenuOpen(false)}><span className="inline-flex items-center gap-2"><Icon name="package" className="size-4" />{t('تتبع طلبك')}</span> <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link><Link className="btn-primary w-full mt-6" to={token ? '/account' : '/auth'} onClick={() => setMenuOpen(false)}>{t('حسابي وطلباتي')}</Link></div></Dialog>}
  </>
}
