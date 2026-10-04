import { t } from '../../i18n'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { Icon } from '../ui/Icon'
import { ProductCard } from './ProductCard'

const LIMIT = 4

/**
 * «قد يعجبكِ أيضاً» في صفحة المنتج.
 * لا يوجد حالياً مسار توصيات في الخادم، فنعتمد: منتجات متوفرة من نفس التصنيف،
 * وإن لم تكفِ نُكمل من المنتجات المميّزة. عند توفّر /products/{slug}/related
 * يكفي تبديل getRelatedProducts في طبقة الـ API.
 */
export function RelatedProducts({ product }: { product: { id: number; category?: { id: number; name: string; slug?: string } | null } }) {
  const query = useQuery({
    queryKey: ['products', 'related', product.id],
    queryFn: () => gazabellaApi.getRelatedProducts(product, LIMIT),
    staleTime: 300_000,
  })
  const items = query.data ?? []
  if (!query.isLoading && !items.length) return null

  return (
    <section className="related" aria-labelledby="related-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t('مختارات تكمّل اختياركِ')}</span>
          <h2 id="related-title">{t('قد يعجبكِ أيضاً')}</h2>
        </div>
        {product.category?.slug && (
          <Link className="text-link" to={`/?category=${product.category.slug}#products`}>
            {t('كل منتجات {name}', { name: product.category.name })} <Icon name="arrow" className="size-4 rtl:rotate-180" />
          </Link>
        )}
      </div>
      {query.isLoading
        ? <div className="related-rail" aria-label={t('جارٍ تحميل المنتجات')}>{Array.from({ length: LIMIT }, (_, i) => <div key={i} className="product-skeleton"><div /><span /><span /></div>)}</div>
        : <div className="related-rail">{items.map((item) => <ProductCard key={item.id} product={item} />)}</div>}
    </section>
  )
}
