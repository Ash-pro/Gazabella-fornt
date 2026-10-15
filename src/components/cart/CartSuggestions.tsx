import { t } from '../../i18n'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getCartSuggestions } from '../../api/cartExtras'
import { formatPrice } from '../../lib/format'
import { productPricing } from '../../lib/productPricing'
import type { Cart } from '../../types/api'
import { ProductCard } from '../product/ProductCard'
import { ProductVisual } from '../product/ProductVisual'

/** P2-3 «أضيفي معه» — rail في صفحة السلة، وقائمة مختصرة في السلة الجانبية */
export function CartSuggestions({ cart, compact = false, onNavigate }: { cart: Cart; compact?: boolean; onNavigate?: () => void }) {
  const ids = cart.items.map((i) => i.product_id).sort().join(',')
  const query = useQuery({ queryKey: ['cart-suggestions', ids], queryFn: () => getCartSuggestions(cart, compact ? 3 : 6), enabled: cart.items.length > 0, staleTime: 5 * 60_000, retry: false })
  const list = query.data ?? []
  if (!list.length) return null

  if (compact) return (
    <section className="cart-suggest cart-suggest--compact" aria-labelledby="cart-suggest-title">
      <h3 id="cart-suggest-title">{t('أضيفي معه')}</h3>
      <ul>
        {list.map((p) => (
          <li key={p.id}>
            <Link to={`/products/${encodeURIComponent(p.slug)}`} onClick={onNavigate}>
              <span className="cart-suggest__img"><ProductVisual src={p.images?.[0]?.url ?? null} alt="" /></span>
              <span className="cart-suggest__name">{p.name}</span>
              <b className="num">{formatPrice(productPricing(p).current)}</b>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
  return (
    <section className="cart-suggest" aria-labelledby="cart-suggest-title">
      <h2 id="cart-suggest-title" className="text-xl font-extrabold">{t('أضيفي معه')}</h2>
      <p className="mt-1 text-sm text-[var(--text-2)]">{t('اختيارات تكمّل روتينكِ')}</p>
      <div className="hm-rail mt-5">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </section>
  )
}
