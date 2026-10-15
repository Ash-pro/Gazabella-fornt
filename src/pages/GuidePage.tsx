import { t } from '../i18n'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { gazabellaApi } from '../api/gazabella'
import { getGuide } from '../api/loyalty'
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard'
import { ShareSheet } from '../components/share/ShareSheet'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { DemoBadge } from '../components/ui/DemoBadge'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatDate } from '../lib/format'
import { useSeo } from '../lib/seo'
import type { GuideBlock } from '../types/api'
import { NotFoundPage } from './NotFoundPage'
import { useState } from 'react'

/** P4-2 مقال دليل — كتل منظمة (لا HTML من الخادم) + منتجات مرتبطة قابلة للشراء */
export function GuidePage() {
  const { slug = '' } = useParams()
  const [sharing, setSharing] = useState(false)
  const query = useQuery({ queryKey: ['guide', slug], queryFn: () => getGuide(slug), enabled: !!slug, retry: false, staleTime: 10 * 60_000 })
  const g = query.data?.data
  useSeo(g ? { title: g.title, description: g.excerpt, type: 'article', noindex: !!query.data?.demo } : null)
  if (query.isPending) return <PageLoader />
  if (query.isError) {
    if ((query.error as { response?: { status?: number } })?.response?.status === 404) return <NotFoundPage />
    return <div className="container-page py-12"><ErrorState message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} /></div>
  }
  return (
    <main id="main-content" className="container-page guide">
      <nav className="guide__crumbs" aria-label={t('مسار الصفحة')}><Link to="/">{t('الرئيسية')}</Link> / <Link to="/guides">{t('أدلة الجمال')}</Link></nav>
      <article>
        <header className="guide__head">
          <span className="guide-card__tag">{g!.tag}</span>
          <h1>{g!.title} <DemoBadge show={!!query.data?.demo} /></h1>
          <p className="guide__lead">{g!.excerpt}</p>
          <div className="guide__meta">
            <small><span className="num">{g!.reading_minutes}</span> {t('دقائق قراءة')} · {formatDate(g!.published_at)}</small>
            <button type="button" className="btn-ghost" onClick={() => setSharing(true)}><Icon name="share" className="size-4" /> {t('شاركي الدليل')}</button>
          </div>
        </header>
        {g!.blocks.map((b, i) => <Block key={i} block={b} />)}
      </article>
      {sharing && <ShareSheet content={{ url: window.location.href.split('?')[0], title: g!.title, text: g!.excerpt, campaign: 'guide' }} lines={g!.blocks.flatMap((b) => (b.type === 'steps' ? b.items : [])).slice(0, 6)} onClose={() => setSharing(false)} />}
    </main>
  )
}

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case 'h2': return <h2 className="guide__h2">{block.text}</h2>
    case 'p': return <p className="guide__p">{block.text}</p>
    case 'tip': return <aside className="guide__tip"><Icon name="sparkle" className="size-5 shrink-0" /><p>{block.text}</p></aside>
    case 'steps': return <ol className="guide__steps">{block.items.map((s, i) => <li key={i}><span className="num">{i + 1}</span><p>{s}</p></li>)}</ol>
    case 'products': return <GuideProducts title={block.title} category={block.category_slug} />
  }
}

function GuideProducts({ title, category }: { title?: string; category?: string }) {
  const categories = useQuery({ queryKey: ['categories'], queryFn: gazabellaApi.getCategories, staleTime: 300_000 })
  const id = category ? categories.data?.flatMap((c) => [c, ...(c.children ?? [])]).find((c) => c.slug === category)?.id : undefined
  const products = useQuery({
    queryKey: ['products', { guide: category ?? 'featured', category_id: id }],
    queryFn: () => gazabellaApi.getProducts(id ? { category_id: id, in_stock: true, per_page: 4 } : { featured: true, in_stock: true, per_page: 4 }),
    enabled: !category || !categories.isPending,
    staleTime: 120_000,
  })
  const list = products.data?.data ?? []
  if (!products.isPending && !list.length) return null
  return (
    <section className="guide__products" aria-label={title ?? t('منتجات مرتبطة')}>
      <h2 className="guide__h2">{title ?? t('منتجات مرتبطة')}</h2>
      <div className="hm-grid">{products.isPending ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />) : list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </section>
  )
}
