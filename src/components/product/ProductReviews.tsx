import { t } from '../../i18n'
import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { getReviews } from '../../api/productExtras'
import { getImageUrl } from '../../lib/apiClient'
import { formatDate } from '../../lib/format'
import { useAuthStore } from '../../stores/authStore'
import type { ReviewSummary } from '../../types/api'
import { DemoBadge } from '../ui/DemoBadge'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { ReviewForm } from './ReviewForm'
import { markReviewed } from '../../lib/reviewed'
import { Stars } from './StarRating'
import { REVIEW_FORMS } from '../../lib/reviewForms'
import { plural } from '../../i18n'

/** P1-1 قسم المراجعات: ملخص + توزيع قابل للتصفية + قائمة بالصور + كتابة مراجعة */
export function ProductReviews({ product, variantId }: { product: { id: number; slug: string; name: string; image: string | null }; variantId?: number }) {
  const [rating, setRating] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [writing, setWriting] = useState(false)
  const [thanks, setThanks] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const loggedIn = Boolean(useAuthStore((s) => s.token))
  const { pathname } = useLocation()

  const query = useQuery({
    queryKey: ['reviews', product.slug, { rating, page }],
    queryFn: () => getReviews(product, { rating, page }),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  })
  // بلا API وبلا وضع العرض: القسم مخفي (R-2)
  if (query.isError || !query.data) return null
  const { data: res, demo } = query.data
  const s = res.summary

  const write = loggedIn
    ? <button type="button" className="btn-ghost" onClick={() => setWriting(true)}><Icon name="star" className="size-4" /> {t('اكتبي تقييمكِ')}</button>
    : <Link className="btn-ghost" to={`/auth?next=${encodeURIComponent(pathname + '#reviews')}`}><Icon name="star" className="size-4" /> {t('سجّلي الدخول للتقييم')}</Link>

  return (
    <section id="reviews" className="reviews" aria-labelledby="reviews-title">
      <header className="reviews__head">
        <h2 id="reviews-title">{t('آراء الزبونات')} <DemoBadge show={demo} /></h2>
        {write}
      </header>

      {thanks && <p className="reviews__thanks" role="status"><Icon name="check" className="size-4" /> {t('شكراً لكِ! يظهر تقييمكِ بعد مراجعة سريعة.')}</p>}

      {s.count === 0 ? (
        <p className="reviews__empty">{t('لا توجد تقييمات بعد — كوني أول من يقيّم هذا المنتج.')}</p>
      ) : (
        <div className="reviews__layout">
          <Summary summary={s} active={rating} onFilter={(n) => { setRating(n); setPage(1) }} />
          <div className="reviews__list" aria-busy={query.isFetching}>
            {rating && <p className="reviews__filter">{t('تعرض تقييمات {n} نجوم', { n: rating })} · <button type="button" className="text-link" onClick={() => { setRating(undefined); setPage(1) }}>{t('عرض الكل')}</button></p>}
            {!res.data.length && <p className="reviews__empty">{t('لا تقييمات بهذا العدد من النجوم.')}</p>}
            {res.data.map((r) => (
              <article key={r.id} className="review">
                <header>
                  <Stars value={r.rating} />
                  {r.title && <b>{r.title}</b>}
                </header>
                <p>{r.body}</p>
                {!!r.photos.length && (
                  <div className="review__photos">
                    {r.photos.map((src) => { const url = getImageUrl(src); return url ? <button key={src} type="button" onClick={() => setPhoto(url)} aria-label={t('تكبير صورة التقييم')}><img src={url} alt="" loading="lazy" /></button> : null })}
                  </div>
                )}
                <footer>
                  <span>{r.author_name}</span>
                  {r.verified_purchase && <span className="review__verified"><Icon name="check" className="size-3.5" /> {t('مشترية مؤكدة')}</span>}
                  {r.variant_name && <span>{r.variant_name}</span>}
                  <time dateTime={r.created_at}>{formatDate(r.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                </footer>
              </article>
            ))}
            {res.meta.last_page > 1 && (
              <nav className="reviews__pager" aria-label={t('صفحات التقييمات')}>
                <button type="button" className="btn-ghost" disabled={page <= 1 || query.isFetching} onClick={() => setPage((p) => p - 1)}>{t('السابق')}</button>
                <span className="num">{page} / {res.meta.last_page}</span>
                <button type="button" className="btn-ghost" disabled={page >= res.meta.last_page || query.isFetching} onClick={() => setPage((p) => p + 1)}>{t('التالي')}</button>
              </nav>
            )}
          </div>
        </div>
      )}

      {writing && <ReviewForm slug={product.slug} productName={product.name} variantId={variantId} onClose={() => setWriting(false)} onDone={() => { markReviewed(product.slug); setWriting(false); setThanks(true) }} />}
      {photo && <Dialog title={t('صورة من التقييم')} onClose={() => setPhoto(null)}><img src={photo} alt="" className="w-full rounded-xl object-contain" /></Dialog>}
    </section>
  )
}

function Summary({ summary, active, onFilter }: { summary: ReviewSummary; active?: number; onFilter: (n?: number) => void }) {
  return (
    <div className="reviews__summary">
      <div className="reviews__score">
        <b className="num">{summary.average.toFixed(1)}</b>
        <Stars value={summary.average} size="size-5" />
        <small>{plural(summary.count, REVIEW_FORMS)}</small>
      </div>
      <ul className="reviews__bars">
        {[5, 4, 3, 2, 1].map((n) => {
          const count = summary.distribution[String(n) as keyof ReviewSummary['distribution']] ?? 0
          const pct = summary.count ? Math.round((count / summary.count) * 100) : 0
          return (
            <li key={n}>
              <button type="button" disabled={!count} aria-pressed={active === n} onClick={() => onFilter(active === n ? undefined : n)} aria-label={t('{n} نجوم: {count} تقييم', { n, count })}>
                <span className="num">{n}</span><Icon name="star" className="size-3.5" />
                <span className="reviews__bar"><span style={{ width: `${pct}%` }} /></span>
                <span className="num reviews__pct">{count}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
