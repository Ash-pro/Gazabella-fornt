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

/**
 * بطاقة المنتج: الصورة والاسم يفتحان التفاصيل، وإجراء أساسي واحد (الشراء السريع).
 * الأسعار والخصم من productPricing كما هي — لا منطق تسعير هنا.
 */
export function ProductCard({ product }: { product: ProductBrief }) {
  const wishlist = useWishlist()
  const saved = wishlist.authenticated && !!wishlist.query.data?.some((item) => item.id === product.id)
  const imageUrl = getPrimaryImage(product)
  const { current, original, percent: discount } = productPricing(product)
  const href = `/products/${product.slug}`

  return (
    <article className={`pcard ${product.in_stock ? '' : 'is-out'}`}>
      <div className="pcard__media">
        <Link to={href} aria-label={t('عرض {name}', { name: product.name })} tabIndex={-1}>
          <ProductVisual src={imageUrl} alt={product.name} />
        </Link>
        {discount > 0 && product.in_stock && <span className="pcard__badge">−<span className="num">{discount}%</span></span>}
        {!product.in_stock && <span className="pcard__badge pcard__badge--out">{t('غير متوفر حاليًا')}</span>}
        {!isMvp0Api() && (
          <button type="button" className={`pcard__wish ${saved ? 'is-saved' : ''}`} aria-label={saved ? t('إزالة من المفضلة') : t('حفظ في المفضلة')} aria-pressed={saved}
            disabled={wishlist.toggle.isPending} onClick={() => wishlist.toggleProduct(product.slug)}>
            <Icon name="heart" className="size-[18px]" />
          </button>
        )}
      </div>
      <div className="pcard__body">
        {product.category?.name && <span className="pcard__cat">{product.category.name}</span>}
        <Link className="pcard__name" to={href}>{product.name}</Link>
        <div className="pcard__price">
          <b aria-label={t('السعر الحالي')}><span className="num">{formatPrice(current)}</span></b>
          {original !== null && <del aria-label={t('السعر السابق')}><span className="num">{formatPrice(original)}</span></del>}
        </div>
        <QuickBuy product={product} />
        {wishlist.toggle.isError && <p role="alert" className="field-error">{getApiErrorMessage(wishlist.toggle.error)}</p>}
      </div>
    </article>
  )
}
