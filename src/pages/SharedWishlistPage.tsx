import { t } from '../i18n'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getSharedWishlist } from '../api/loyalty'
import { ProductCard } from '../components/product/ProductCard'
import { EmptyState, ErrorState, PageLoader } from '../components/ui/AsyncState'
import { DemoBadge } from '../components/ui/DemoBadge'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { useSeo } from '../lib/seo'
import { NotFoundPage } from './NotFoundPage'

/** P4-3 قائمة مفضلة مشتركة — للقراءة والشراء فقط (بدون أي بيانات شخصية عن صاحبتها غير الاسم الأول) */
export function SharedWishlistPage() {
  const { token = '' } = useParams()
  const query = useQuery({ queryKey: ['shared-wishlist', token], queryFn: () => getSharedWishlist(token), enabled: !!token, retry: false })
  const w = query.data?.data
  useSeo({ title: w ? t('مفضلات {name}', { name: w.owner_name }) : t('قائمة مفضلات'), noindex: true })
  if (query.isPending) return <PageLoader />
  if (query.isError) {
    if ((query.error as { response?: { status?: number } })?.response?.status === 404) return <NotFoundPage />
    return <div className="container-page py-12"><ErrorState message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} /></div>
  }
  return (
    <main id="main-content" className="container-page shared-wl">
      <header className="shared-wl__head">
        <span className="shared-wl__icon"><Icon name="heart" className="size-7" /></span>
        <h1>{t('مفضلات {name}', { name: w!.owner_name })} <DemoBadge show={!!query.data?.demo} /></h1>
        <p>{t('اختيارات شاركتها معكِ — اكتشفيها واطلبي اللي يعجبكِ بسهولة.')}</p>
      </header>
      {!w!.items.length ? <EmptyState title={t('القائمة فارغة الآن')} message={t('ربما تغيّرت اختياراتها — تصفّحي المختارات.')} /> : <div className="catalog-grid">{w!.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      <aside className="shared-wl__cta">
        <b>{t('اعملي قائمتكِ الخاصة')}</b>
        <p>{t('احفظي ما يعجبكِ بالقلب وشاركيه مع صديقاتكِ أو اطلبيه هدية.')}</p>
        <Link className="btn-primary" to="/">{t('ابدئي التسوق')}</Link>
      </aside>
    </main>
  )
}
