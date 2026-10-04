import { t } from '../../i18n'
import { isMvp0Api } from '../../lib/apiContract'
import { QuickBuy } from './QuickBuy'
import { Link } from 'react-router-dom'
import { ProductVisual } from './ProductVisual'
import { Icon } from '../ui/Icon'
import { formatPrice } from '../../lib/format'
import { productPricing } from '../../lib/productPricing'
import { getApiErrorMessage } from '../../lib/apiClient'
import { useWishlist } from '../../hooks/useWishlist'
import type { ProductBrief } from '../../types/api'

function getPrimaryImage(product: ProductBrief): string | null {
  const imgs = product.images ?? []
  const primary = imgs.find((img) => img.is_primary)
  return primary?.url ?? imgs[0]?.url ?? null
}

export function ProductCard({ product }: { product: ProductBrief }) {
  const wishlist = useWishlist()
  const saved = wishlist.authenticated && !!wishlist.query.data?.some((item) => item.id === product.id)
  const imageUrl = getPrimaryImage(product)
  const { current, original, percent: discount } = productPricing(product)

  return (
    <article className="catalog-card">
      <div className="catalog-card__image">
        <Link to={`/products/${product.slug}`} aria-label={t('عرض {name}', { name: product.name })}>
          <ProductVisual src={imageUrl} alt={product.name} />
        </Link>
        {discount > 0 && (
          <span className="catalog-discount">−<span className="num">{discount}%</span></span>
        )}
        {!isMvp0Api() && <button
          className={`wishlist-button ${saved ? 'is-saved' : ''}`}
          aria-label={saved ? t('إزالة من المفضلة') : t('حفظ في المفضلة')}
          aria-pressed={saved}
          disabled={wishlist.toggle.isPending}
          onClick={() => wishlist.toggleProduct(product.slug)}
        >
          <Icon name="heart" className="size-4" />
        </button>}
        {!product.in_stock && <span className="sold-out-label">{t('غير متوفر حاليًا')}</span>}
      </div>
      <div className="catalog-card__body">
        <span className="catalog-category">{product.category?.name}</span>
        <Link className="catalog-name" to={`/products/${product.slug}`}>{product.name}</Link>
        <div className="catalog-price">
          {original !== null && (
            <del aria-label={t('السعر السابق')} className="line-through text-gray-400 text-sm">
              <span className="num">{formatPrice(original)}</span>
            </del>
          )}
          <b aria-label={t('السعر الحالي')}><span className="num">{formatPrice(current)}</span></b>
        </div>
        <Link className="catalog-action" to={`/products/${product.slug}`}>
          {product.in_stock ? t('اكتشفي المنتج') : t('عرض التفاصيل')}
          <Icon name="arrow" className="size-4 rtl:rotate-180" />
        </Link>
        <QuickBuy product={product} />
        {wishlist.toggle.isError && <p role="alert" className="field-error">{getApiErrorMessage(wishlist.toggle.error)}</p>}
      </div>
    </article>
  )
}
