import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { useCartStore } from '../stores/cartStore'
import { queryClient } from '../lib/queryClient'
import { ProductVisual } from '../components/product/ProductVisual'
import { ErrorState } from '../components/ui/AsyncState'
import { Dialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { money } from '../lib/format'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  return <ProductContent key={slug} slug={slug} />
}

function ProductContent({ slug }: { slug: string }) {
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const [zoom, setZoom] = useState(false)

  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: () => gazabellaApi.getProduct(slug),
    enabled: !!slug,
  })
  const product = query.data

  const limit = (isMockMode() ? Math.min(10, product?.stock ?? 0) : product?.stock ?? 0)

  const add = useMutation({
    mutationFn: () => gazabellaApi.addToCart(product!.id, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      const primaryImg = (product!.images ?? []).find((i) => i.is_primary)?.url ?? (product!.images ?? [])[0]?.url ?? null
      useCartStore.getState().showCartToast({
        productName: product!.name,
        thumbnailUrl: primaryImg,
        price: product!.discount_price ?? product!.price,
      })
    },
  })

  if (query.isLoading) return (
    <div className="container-page product-detail-skeleton">
      <div className="skel-image" />
      <div>
        <div className="skel-line skel-line--title" />
        <div className="skel-line skel-line--price" />
        <div className="skel-line skel-line--short" />
        <div className="skel-line" />
        <div className="skel-line" style={{ width: '65%' }} />
        <div className="skel-btn" />
      </div>
    </div>
  )

  if (query.isError || !product)
    return (
      <div className="container-page">
        <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      </div>
    )

  const image = (product.images ?? [])[imageIndex] ?? (product.images ?? [])[0]
  const displayPrice = product.discount_price ?? product.price
  const originalPrice = product.discount_price ? product.price : null
  const disabled = add.isPending || !product.in_stock || quantity > limit

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => add.mutate()}
      className="btn-primary flex-1"
    >
      <Icon name="bag" className="size-4" />
      {add.isPending ? 'نضيف اختياركِ…' : !product.in_stock ? 'غير متوفر حاليًا' : 'أضيفي إلى السلة'}
    </button>
  )

  return (
    <div className="container-page product-detail">
      <nav className="product-breadcrumb" aria-label="مسار الصفحة">
        <Link to="/">الرئيسية</Link>
        <span>/</span>
        <Link to={`/?category=${product.category?.slug}#products`}>{product.category?.name}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <div className="detail-layout">
        <div className="detail-gallery">
          <button
            className="detail-main-image"
            onClick={() => setZoom(true)}
            aria-label="تكبير صورة المنتج"
          >
            <ProductVisual src={image?.url ?? null} alt={image?.alt_text ?? product.name} priority />
            <span><Icon name="eye" className="size-4" /> عرض الصورة</span>
          </button>
          {(product.images ?? []).length > 1 && (
            <div className="detail-thumbnails">
              {(product.images ?? []).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  aria-label={`عرض الصورة ${i + 1}`}
                  aria-pressed={imageIndex === i}
                >
                  <ProductVisual src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-copy">
          <span className="eyebrow">{product.category?.name}</span>
          <h1>{product.name}</h1>
          <p className="detail-description">
            {product.description ?? 'اكتشفي تفاصيل هذا المنتج الرائع.'}
          </p>

          <div className="detail-price">
            {originalPrice && (
              <del className="line-through text-gray-400 text-sm">
                <span className="num">{money(originalPrice)}</span>
              </del>
            )}
            <b><span className="num">{money(displayPrice)}</span></b>
            <span className={product.in_stock ? 'in-stock' : 'out-stock'}>
              {product.in_stock ? 'متوفر' : 'غير متوفر'}
            </span>
          </div>

          <div className="detail-buy">
            <div className="quantity-control">
              <button
                disabled={quantity <= 1 || add.isPending}
                aria-label="تقليل الكمية"
                onClick={() => setQuantity((q) => q - 1)}
              >−</button>
              <span className="num">{quantity}</span>
              <button
                disabled={quantity >= limit || add.isPending}
                aria-label="زيادة الكمية"
                onClick={() => setQuantity((q) => q + 1)}
              >+</button>
            </div>
            {button}
          </div>

          {add.isError && (
            <p className="field-error" role="alert">{getApiErrorMessage(add.error)}</p>
          )}

          <div className="detail-benefits">
            <p><Icon name="truck" className="size-4" /> تُحدد إمكانية التوصيل عند إتمام الطلب</p>
            <p><Icon name="clock" className="size-4" /> إضافة المنتج للسلة لا تحجز المخزون</p>
          </div>

          <details className="product-information" open>
            <summary>تفاصيل المنتج</summary>
            <p>{product.description}</p>
          </details>
          <details className="product-information">
            <summary>التوصيل والاستلام</summary>
            <p>إتمام الطلب متاح بعد تأكيد إمكانية التوصيل ورسومه.</p>
          </details>
        </div>
      </div>

      <div className="product-sticky">
        <div>
          <small>{product.name}</small>
          <b><span className="num">{money(displayPrice)}</span></b>
        </div>
        {button}
      </div>

      {zoom && (
        <Dialog title={product.name} onClose={() => setZoom(false)}>
          <div className="aspect-square">
            <ProductVisual
              src={image?.url ?? null}
              alt={product.name}
              priority
              className="!object-contain"
            />
          </div>
        </Dialog>
      )}
    </div>
  )
}
