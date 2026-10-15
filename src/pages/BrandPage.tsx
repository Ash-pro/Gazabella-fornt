import { t } from '../i18n'
import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getBrand, getBrandProducts } from '../api/discovery'
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard'
import { EmptyState, ErrorState, PageLoader } from '../components/ui/AsyncState'
import { DemoBadge } from '../components/ui/DemoBadge'
import { getApiErrorMessage, getImageUrl } from '../lib/apiClient'
import { useSeo } from '../lib/seo'
import { NotFoundPage } from './NotFoundPage'

/** P3-1 صفحة الماركة: الهوية + المنتجات */
export function BrandPage() {
  const { slug = '' } = useParams()
  const [page, setPage] = useState(1)
  const brand = useQuery({ queryKey: ['brand', slug], queryFn: () => getBrand(slug), enabled: !!slug, retry: false, staleTime: 10 * 60_000 })
  const b = brand.data?.data
  const products = useQuery({ queryKey: ['brand-products', b?.id, page], queryFn: () => getBrandProducts(b!, page), enabled: !!b, placeholderData: keepPreviousData })
  useSeo(b ? { title: b.name, description: b.description ?? t('منتجات {name} الأصلية على Gazabella', { name: b.name }), image: b.logo_url, noindex: !!brand.data?.demo } : null)

  if (brand.isPending) return <PageLoader />
  if (brand.isError) {
    if ((brand.error as { response?: { status?: number } })?.response?.status === 404) return <NotFoundPage />
    return <div className="container-page py-12"><ErrorState message={getApiErrorMessage(brand.error)} onRetry={() => void brand.refetch()} /></div>
  }
  const logo = getImageUrl(b!.logo_url)
  const res = products.data?.data
  const list = res?.data ?? []
  const last = res?.meta?.last_page ?? 1

  return (
    <main id="main-content" className="container-page brand-page">
      <nav className="brand-page__crumbs" aria-label={t('مسار الصفحة')}><Link to="/">{t('الرئيسية')}</Link> / <Link to="/#brands">{t('الماركات')}</Link> / <span aria-current="page">{b!.name}</span></nav>
      <header className="brand-hero">
        <span className="brand-hero__logo">{logo ? <img src={logo} alt="" /> : <span aria-hidden="true">{b!.name.trim().charAt(0)}</span>}</span>
        <div>
          <h1>{b!.name} <DemoBadge show={!!brand.data?.demo} /></h1>
          {b!.description && <p>{b!.description}</p>}
        </div>
      </header>
      <section className="brand-page__products" aria-labelledby="brand-products-title">
        <h2 id="brand-products-title">{t('منتجات {name}', { name: b!.name })} <DemoBadge show={!brand.data?.demo && !!products.data?.demo} /></h2>
        {products.isPending ? <div className="catalog-grid">{Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
          : products.isError ? <ErrorState message={getApiErrorMessage(products.error)} onRetry={() => void products.refetch()} />
          : !list.length ? <EmptyState title={t('لا منتجات لهذه الماركة الآن')} message={t('نضيف منتجات جديدة باستمرار — تابعينا.')} />
          : <div className={`catalog-grid${products.isPlaceholderData ? ' is-stale' : ''}`}>{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
        {last > 1 && (
          <nav className="pagination" aria-label={t('صفحات المنتجات')}>
            <button disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>{t('السابق')}</button>
            <span><span className="num">{page}</span> / <span className="num">{last}</span></span>
            <button disabled={page >= last} onClick={() => setPage((n) => n + 1)}>{t('التالي')}</button>
          </nav>
        )}
      </section>
    </main>
  )
}
