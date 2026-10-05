import { t } from '../../i18n'
import { useState } from 'react'
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
  const searchField = <SearchBox />
  return <>
    {announcement?.title && <aside className="announcement" aria-label={t('إعلان')}>{announcement.title}</aside>}
    <header className="store-header">
      <div className="container-page header-main">
        <button className="icon-button menu-trigger" aria-label={t('فتح التصنيفات')} onClick={() => setMenuOpen(true)}><Icon name="menu" className="size-5" /></button>
        <Link to="/" aria-label={t('Gazabella — الرئيسية')} className="brand-lockup"><img src={getImageUrl(settings?.logo_url) || "/brand/symbol/logo-128.webp"} alt="" width="44" height="44" decoding="async" /><span><b>{settings?.store_name || "Gazabella"}</b><small>{settings ? settings.tagline : t('الجمال، أقرب إليكِ')}</small></span></Link>
        <div className="desktop-search">{searchField}</div>
        <div className="header-actions"><Link className="track-link" to="/track"><Icon name="package" className="size-[18px]" /><span>{t('تتبع طلبك')}</span></Link><LanguageSwitch /><Link className="icon-button" to={token ? '/orders' : '/auth'} aria-label={token ? t('حسابي وطلباتي') : t('تسجيل الدخول')}><Icon name="user" className="size-5" /></Link><button className="icon-button relative" onClick={openDrawer} aria-label={t('السلة، {v1} عناصر', { v1: cart?.total_items ?? 0 })}><Icon name="bag" className="size-5" />{!!cart?.total_items && <span className="cart-count">{cart.total_items}</span>}</button></div>
      </div>
      <div className="container-page mobile-search">{searchField}</div>
      <nav className="container-page header-nav" aria-label={t('التصنيفات الرئيسية')}><Link to="/#products" className={!searchParams.get('category') ? 'active' : ''}>{t('جميع المنتجات')}</Link>{categories?.map((category) => <Link key={category.id} className={searchParams.get('category') === category.slug ? 'active' : ''} to={`/?category=${category.slug}#products`}>{category.name}</Link>)}</nav>
    </header>
    {menuOpen && <Dialog title={t('اكتشفي Gazabella')} sheet onClose={() => setMenuOpen(false)}><div className="p-5 space-y-3"><Link className="menu-category" to="/#products" onClick={() => setMenuOpen(false)}>{t('جميع المنتجات')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>{categories?.map((category) => <details key={category.id} className="category-disclosure"><summary>{category.name}</summary><Link to={`/?category=${category.slug}#products`} onClick={() => setMenuOpen(false)}>{t('كل')} {category.name}</Link>{(category.children ?? []).map((child) => <Link key={child.id} to={`/?category=${category.slug}&sub=${child.slug}#products`} onClick={() => setMenuOpen(false)}>{child.name}</Link>)}</details>)}<Link className="menu-category" to="/track" onClick={() => setMenuOpen(false)}><span className="inline-flex items-center gap-2"><Icon name="package" className="size-4" />{t('تتبع طلبك')}</span> <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link><Link className="btn-primary w-full mt-6" to={token ? '/orders' : '/auth'} onClick={() => setMenuOpen(false)}>{t('حسابي وطلباتي')}</Link></div></Dialog>}
  </>
}
