import { useMutation } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'
import { queryClient } from '../../lib/queryClient'
import { useCartStore } from '../../stores/cartStore'
// import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ProductVisual } from './ProductVisual'
import { Icon } from '../ui/Icon'
import { formatPrice } from '../../lib/format'
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
  const price = product.price
  const previous = product.discount_price ?? null
  const discount = previous && previous < price ? Math.round(((price - previous) / price) * 100) : 0

  const add = useMutation({
    mutationFn: () => gazabellaApi.addToCart(product.id, 1),
    onSuccess: () => {
      // invalidate حتى السلة تجيب بيانات كاملة ومحدثة من الـ backend
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      useCartStore.getState().showCartToast({
        productName: product.name,
        thumbnailUrl: imageUrl,
        price: previous ?? price,
      })
    },
  })

  return (
    <article className="catalog-card">
      <div className="catalog-card__image">
        <Link to={`/products/${product.slug}`} aria-label={`عرض ${product.name}`}>
          <ProductVisual src={imageUrl} alt={product.name} />
        </Link>
        {discount > 0 && (
          <span className="catalog-discount">−<span className="num">{discount}%</span></span>
        )}
        <button
          className={`wishlist-button ${saved ? 'is-saved' : ''}`}
          aria-label={saved ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
          aria-pressed={saved}
          disabled={wishlist.toggle.isPending}
          onClick={() => wishlist.toggleProduct(product.slug)}
        >
          <Icon name="heart" className="size-4" />
        </button>
        {!product.in_stock && <span className="sold-out-label">غير متوفر حاليًا</span>}
      </div>
      <div className="catalog-card__body">
        <span className="catalog-category">{product.category?.name}</span>
        <Link className="catalog-name" to={`/products/${product.slug}`}>{product.name}</Link>
        <div className="catalog-price">
          {discount > 0 && previous && (
            <del className="line-through text-gray-400 text-sm">
              <span className="num">{formatPrice(price)}</span>
            </del>
          )}
          <b><span className="num">{formatPrice(previous ?? price)}</span></b>
        </div>
        <Link className="catalog-action" to={`/products/${product.slug}`}>
          {product.in_stock ? 'اكتشفي المنتج' : 'عرض التفاصيل'}
          <Icon name="arrow" className="size-4 rotate-180" />
        </Link>
        <button
          className="btn-primary quick-add"
          disabled={!product.in_stock || add.isPending}
          onClick={() => add.mutate()}
        >
          {add.isPending ? 'جارٍ الإضافة…' : 'أضيفي للسلة +'}
        </button>
        {wishlist.toggle.isError && <p role="alert" className="field-error">{getApiErrorMessage(wishlist.toggle.error)}</p>}
        {add.isError && (
          <p role="alert" className="field-error">{getApiErrorMessage(add.error)}</p>
        )}
      </div>
    </article>
  )
}
