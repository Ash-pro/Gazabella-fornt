import { t } from '../i18n'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getGuides } from '../api/loyalty'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { DemoBadge } from '../components/ui/DemoBadge'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage, getImageUrl } from '../lib/apiClient'
import { formatDate } from '../lib/format'
import { useSeo } from '../lib/seo'
import { NotFoundPage } from './NotFoundPage'

/** P4-2 أدلة الجمال — قائمة المقالات */
export function GuidesPage() {
  useSeo({ title: t('أدلة الجمال'), description: t('نصائح عملية للعناية بالبشرة والعطور والمكياج من فريق Gazabella.') })
  const query = useQuery({ queryKey: ['guides'], queryFn: getGuides, retry: false, staleTime: 10 * 60_000 })
  if (query.isPending) return <PageLoader />
  if (query.isError) {
    if ((query.error as { response?: { status?: number } })?.response?.status === 404) return <NotFoundPage />
    return <div className="container-page py-12"><ErrorState message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} /></div>
  }
  const list = query.data.data
  return (
    <main id="main-content" className="container-page guides-page">
      <header className="guides-head">
        <p className="hm-kicker">{t('من فريق Gazabella')}</p>
        <h1>{t('أدلة الجمال')} <DemoBadge show={query.data.demo} /></h1>
        <p>{t('نصائح عملية ومختصرة — اختاري ما يناسبكِ واطلبيه بضغطة.')}</p>
      </header>
      <ul className="guides-grid">
        {list.map((g) => {
          const cover = getImageUrl(g.cover_url)
          return (
            <li key={g.slug}>
              <Link to={`/guides/${encodeURIComponent(g.slug)}`} className="guide-card">
                <span className="guide-card__cover">{cover ? <img src={cover} alt="" loading="lazy" /> : <Icon name="sparkle" className="size-10" />}</span>
                <span className="guide-card__tag">{g.tag}</span>
                <b>{g.title}</b>
                <p>{g.excerpt}</p>
                <small><span className="num">{g.reading_minutes}</span> {t('دقائق قراءة')} · {formatDate(g.published_at, { day: 'numeric', month: 'short' })}</small>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
