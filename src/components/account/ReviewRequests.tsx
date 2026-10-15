import { t } from '../../i18n'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../../lib/apiClient'
import { markReviewed } from '../../lib/reviewed'
import type { Order } from '../../types/api'
import { ReviewForm } from '../product/ReviewForm'
import { ReviewThanks } from '../product/ReviewThanks'
import { Icon } from '../ui/Icon'

type Item = Order['items'][number]

/** P4-1 «قيّمي مشترياتكِ» — في صفحة الطلب المُسلَّم ولوحة الحساب */
export function ReviewRequests({ items, title = t('قيّمي مشترياتكِ'), compact = false }: { items: Item[]; title?: string; compact?: boolean }) {
  const [active, setActive] = useState<Item | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [thanks, setThanks] = useState<{ rating: number; name: string } | null>(null)
  const list = items.filter((i) => i.product_slug && !done.includes(i.product_slug))
  if (!list.length && !done.length) return null
  return (
    <section className={`review-req${compact ? ' review-req--compact' : ''}`} aria-labelledby="review-req-title">
      <h2 id="review-req-title"><Icon name="star" className="size-5" /> {title}</h2>
      {!list.length ? <p className="review-req__done" role="status"><Icon name="check" className="size-4" /> {t('شكراً! تقييماتكِ تساعد غيركِ يختار صح.')}</p> : (
        <ul>
          {list.map((i) => {
            const img = getImageUrl(i.image_url)
            return (
              <li key={i.id}>
                <span className="review-req__img">{img ? <img src={img} alt="" loading="lazy" /> : <Icon name="package" className="size-5" />}</span>
                <Link to={`/products/${encodeURIComponent(i.product_slug!)}`} className="review-req__name">{i.product_name}</Link>
                <button type="button" className="btn-ghost" onClick={() => setActive(i)}>{t('قيّمي')}</button>
              </li>
            )
          })}
        </ul>
      )}
      {active && <ReviewForm slug={active.product_slug!} productName={active.product_name} productImage={active.image_url} onClose={() => setActive(null)} onDone={(stars) => { markReviewed(active.product_slug!); setDone((d) => [...d, active.product_slug!]); setThanks({ rating: stars, name: active.product_name }); setActive(null) }} />}
      {thanks && <ReviewThanks rating={thanks.rating} productName={thanks.name} onClose={() => setThanks(null)} />}
    </section>
  )
}
