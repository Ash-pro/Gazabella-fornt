import { t } from '../i18n'
import { ALL_PRODUCTS } from '../lib/routes'
import { isMvp0Api } from '../lib/apiContract'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { gazabellaApi } from '../api/gazabella'
import { useCartStore } from '../stores/cartStore'
import { queryClient } from '../lib/queryClient'
import { RelatedProducts } from '../components/product/RelatedProducts'
import { SupportLink } from '../components/support/SupportLink'
import { ProductVisual } from '../components/product/ProductVisual'
import { imageSrcSet } from '../lib/images'
import { ErrorState } from '../components/ui/AsyncState'
import { Dialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { money } from '../lib/format'
import { productPricing } from '../lib/productPricing'
import { productItem, track } from '../lib/analytics'
import { useSeo } from '../lib/seo'
import { useStoreInfo } from '../hooks/useStoreInfo'
import { formatPrice } from '../lib/format'
import { toMetaDescription } from '../content/seo'
import { getImageUrl } from '../lib/apiClient'
import { recordViewed } from '../lib/recentlyViewed'
import { demoFixtures } from '../lib/demo'
import { ProductReviews } from '../components/product/ProductReviews'
import { Stars } from '../components/product/StarRating'
import { REVIEW_FORMS } from '../lib/reviewForms'
import { plural } from '../i18n'
import { VariantSwatches } from '../components/product/VariantSwatches'
import { BackInStock } from '../components/product/BackInStock'
import { ShareButton } from '../components/product/ShareButton'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  return <ProductContent key={slug} slug={slug} />
}

function ProductContent({ slug }: { slug: string }) {
  const [variantId, setVariantId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  // حالة كل صورة حسب رابطها: التكبير متاح فقط لصورة حُمّلت فعلًا (لا لصورة مفقودة أو فاشلة أو ما زالت تُحمَّل).
  // الحالة محلية لهذا المنتج (المكوّن مُفتاحه slug) فتُصفَّر تلقائيًا عند الانتقال لمنتج آخر
  const [imageStatus, setImageStatus] = useState<Record<string, 'ok' | 'failed'>>({})
  const noteImage = (status: 'ok' | 'failed', url: string | null) => { if (url) setImageStatus((m) => (m[url] === status ? m : { ...m, [url]: status })) }

  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: () => gazabellaApi.getProduct(slug),
    enabled: !!slug,
  })
  const product = query.data
  const description = product?.description?.trim() ?? ''
  const summary = summarize(description)
  const hasFullDescription = description.length > summary.length
  // N-05: «شاهدتِ مؤخراً» على الجهاز فقط
  useEffect(() => { if (product) recordViewed(product) }, [product])
  const store = useStoreInfo()
  const zoneNames = store.deliveryZones.map((z) => z.name).join(t('، '))

  const variant = product?.variants?.find(v => v.id === variantId) ?? product?.variants?.find(v => v.available_quantity > 0) ?? product?.variants?.[0]
  const limit = Math.min(10, variant?.available_quantity ?? product?.stock ?? 0)

  const add = useMutation({
    mutationFn: () => gazabellaApi.addToCart(isMvp0Api() ? variant!.id : product!.id, quantity),
    onSuccess: () => {
      const unit = productPricing(product!, variant).current
      track('add_to_cart', { items: [productItem(product!, { quantity, variant: variant?.name, price: unit })], value: unit * quantity })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      const primaryImg = (product!.images ?? []).find((i) => i.is_primary)?.url ?? (product!.images ?? [])[0]?.url ?? null
      useCartStore.getState().showCartToast({
        productName: product!.name,
        thumbnailUrl: primaryImg,
        price: productPricing(product!, variant).current,
        variantName: variant?.name,
      })
    },
  })

  const seoPrice = product ? productPricing(product, variant).current : 0
  const seoImage = product ? getImageUrl((product.images ?? []).find((i) => i.is_primary)?.url ?? (product.images ?? [])[0]?.url ?? null) : null
  const notFound = (query.error as { response?: { status?: number } } | null)?.response?.status === 404
  useSeo(notFound ? { title: t('المنتج غير متوفر'), noindex: true } : product ? {
    title: product.name,
    description: toMetaDescription(product.description, t('{name} — {v2} من Gazabella بسعر {seoPrice} ₪. توصيل في خان يونس ودفع عند الاستلام.', { name: product.name, v2: product.category?.name ?? 'منتجات التجميل', seoPrice: seoPrice })),
    image: seoImage,
    type: 'product',
    price: { amount: seoPrice, currency: 'ILS' },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      ...(product.description ? { description: toMetaDescription(product.description, product.name) } : {}),
      ...(seoImage ? { image: [seoImage] } : {}),
      sku: String(product.id),
      category: product.category?.name,
      // التقييم في بيانات البحث من مراجعات حقيقية فقط — أبداً من وضع العرض (R-3)
      ...(!demoFixtures() && product.rating_count ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating_avg, reviewCount: product.rating_count } } : {}),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'ILS',
        price: seoPrice.toFixed(2),
        availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: window.location.href.split('?')[0],
      },
    },
  } : null)

  const viewedId = product?.id
  useEffect(() => {
    if (!product) return
    track('view_item', { items: [productItem(product)], value: Number(product.discount_price ?? product.price) || 0 })
  }, [viewedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ارتفاع شريط الشراء الفعلي (يتغير مع النص والتكبير واللغة) كمتغير CSS، ليظهر تنبيه الإضافة فوقه لا عليه
  const stickyRef = useRef<HTMLDivElement>(null)
  const hasProduct = Boolean(query.data)
  useEffect(() => {
    const el = stickyRef.current
    if (!el) return
    const root = document.documentElement
    const apply = () => root.style.setProperty('--buybar-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => { observer.disconnect(); root.style.removeProperty('--buybar-h') }
  }, [hasProduct])

  // هيكل التحميل يستخدم بنية الصفحة نفسها (مسار، معرض، نص) حتى لا ينزاح المحتوى عند وصول البيانات
  if (query.isLoading) return (
    <div key="skeleton" className="container-page product-detail product-detail-skeleton" aria-busy="true">
      <div className="product-breadcrumb" aria-hidden="true"><span>&nbsp;</span></div>
      <div className="detail-layout">
        <div className="detail-gallery"><div className="detail-main-image skel-image" /></div>
        <div className="detail-copy">
          <div className="skel-line skel-line--title" />
          <div className="skel-line skel-line--price" />
          <div className="skel-line skel-line--short" />
          <div className="skel-line" />
          <div className="skel-line" style={{ width: '65%' }} />
          <div className="skel-btn" />
        </div>
      </div>
    </div>
  )

  if (notFound)
    return (
      <div className="container-page py-20 text-center">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[var(--primary-dim)] text-[var(--primary)]"><Icon name="search" className="size-7" /></span>
        <h1 className="text-2xl font-extrabold">{t('هذا المنتج غير متوفر')}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-2)]">{t('ربما نفد أو أُزيل من المتجر، أو أن الرابط غير صحيح. تصفّحي بقية المختارات.')}</p>
        <Link className="btn-primary mt-7" to={ALL_PRODUCTS}>{t('تصفّح المنتجات')}</Link>
      </div>
    )
  if (query.isError || !product)
    return (
      <div className="container-page">
        <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      </div>
    )

  const image = (product.images ?? [])[imageIndex] ?? (product.images ?? [])[0]
  const imageUrl = getImageUrl(variant?.image_url ?? image?.url ?? null)
  const zoomable = !!imageUrl && imageStatus[imageUrl] === 'ok'
  // مفتاح بالرابط: عند تبديل الصورة يُعاد إنشاء العنصر فلا تنتقل حالة فشل صورة سابقة إلى التالية
  // P1-2: صورة المتغير المختار (إن وُجدت) تتقدم على صورة المعرض
  const mainSrc = variant?.image_url ?? image?.url ?? null
  const mainVisual = <ProductVisual key={getImageUrl(mainSrc) ?? 'none'} src={mainSrc} srcSet={imageSrcSet(image)} sizes="(min-width: 1024px) 45vw, 92vw" alt={image?.alt_text ?? product.name} priority onStatus={noteImage} />
  const { current: displayPrice, original: originalPrice, percent } = productPricing(product, variant)
  // P1-3: المخزون الحقيقي للمتغير المختار أو للمنتج — لا أرقام تقديرية
  const remaining = variant ? variant.available_quantity : product.stock
  const available = variant ? variant.available_quantity > 0 : product.in_stock
  const lowStock = available && remaining > 0 && remaining <= 5
  const disabled = add.isPending || !available || quantity > limit

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => add.mutate()}
      className="btn-primary flex-1"
    >
      <Icon name="bag" className="size-4" />
      {add.isPending ? t('جارٍ الإضافة…') : !available ? t('غير متوفر حاليًا') : t('أضيفي إلى السلة')}
    </button>
  )

  return (
    <div className="container-page product-detail">
      <nav className="product-breadcrumb" aria-label={t('مسار الصفحة')}>
        <Link to="/">{t('الرئيسية')}</Link>
        <span>/</span>
        <Link to={`/?category=${product.category?.slug}#products`}>{product.category?.name}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <div className="detail-layout">
        <div className="detail-gallery">
          {zoomable ? (
            <button className="detail-main-image" onClick={() => setZoom(true)} aria-label={t('تكبير صورة المنتج')}>
              {mainVisual}
              <span><Icon name="eye" className="size-4" /> {t('عرض الصورة')}</span>
            </button>
          ) : (
            <div className="detail-main-image">{mainVisual}</div>
          )}
          {(product.images ?? []).length > 1 && (
            <div className="detail-thumbnails">
              {(product.images ?? []).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  aria-label={t('عرض الصورة {v1}', { v1: i + 1 })}
                  aria-pressed={imageIndex === i}
                >
                  <ProductVisual src={img.thumb_url || img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-copy">
          <div className="detail-title">
            <div>
              <span className="eyebrow">{product.category?.name}</span>
              <h1>{product.name}</h1>
            </div>
            <ShareButton title={product.name} url={window.location.href.split('?')[0]} />
          </div>
          {!!product.rating_count && product.rating_avg != null && (
            <a className="detail-rating" href="#reviews"><Stars value={product.rating_avg} /> <b className="num">{product.rating_avg.toFixed(1)}</b> <span>({plural(product.rating_count, REVIEW_FORMS)})</span></a>
          )}
          {/* ملخص قصير هنا، والنص الكامل في «وصف المنتج» فقط إن كان أطول — لا نكرر الفقرة نفسها مرتين */}
          <p className="detail-description">
            {summary || t('اكتشفي تفاصيل هذا المنتج الرائع.')}
          </p>

          <div className="detail-price">
            {originalPrice !== null && (
              <del aria-label={t('السعر السابق')} className="line-through text-gray-400 text-sm">
                <span className="num">{money(originalPrice)}</span>
              </del>
            )}
            <b><span className="num">{money(displayPrice)}</span></b>
            {percent > 0 && <span className="text-[var(--primary)]">{t('خصم')} {percent}%</span>}
            <span className={available ? 'in-stock' : 'out-stock'}>
              {available ? t('متوفر') : t('غير متوفر')}
            </span>
          </div>
          {lowStock && <p className="low-stock" role="status"><Icon name="clock" className="size-4" /> {remaining === 1 ? t('باقي قطعة واحدة فقط') : t('باقي {n} قطع فقط', { n: remaining })}</p>}

          {!!product.variants?.length && <VariantSwatches variants={product.variants} value={variant?.id} onChange={(id) => { setVariantId(id); setQuantity(1) }} />}
          <div className="detail-buy">
            <div className="quantity-control">
              <button
                disabled={quantity <= 1 || add.isPending}
                aria-label={t('تقليل الكمية')}
                onClick={() => setQuantity((q) => q - 1)}
              >−</button>
              <span className="num">{quantity}</span>
              <button
                disabled={quantity >= limit || add.isPending}
                aria-label={t('زيادة الكمية')}
                onClick={() => setQuantity((q) => q + 1)}
              >+</button>
            </div>
            {button}
          </div>

          {!available && (demoFixtures() || import.meta.env.VITE_STOCK_ALERTS === 'true') && <BackInStock key={variant?.id ?? product.id} slug={product.slug} variantId={variant?.id} />}

          {add.isError && (
            <p className="field-error" role="alert">{getApiErrorMessage(add.error)}</p>
          )}

          <div className="detail-benefits">
            <p><Icon name="truck" className="size-4" /> {t('توصيل من')} <span className="num">{formatPrice(store.minDeliveryFee)}</span> {t('حسب المنطقة')}</p>
            <p><Icon name="shield" className="size-4" /> {t('ادفعي نقداً للمندوب بعد فحص طلبك')}</p>
          </div>

          {hasFullDescription && <details className="product-information" open>
            <summary>{t('وصف المنتج')}</summary>
            <p>{product.description}</p>
          </details>}
          {/* P1-5: تبويبات المعلومات — كل قسم يظهر فقط إن وصل حقله */}
          {product.ingredients && <details className="product-information">
            <summary>{t('المكونات')}</summary>
            <p>{product.ingredients}</p>
          </details>}
          {product.how_to_use && <details className="product-information">
            <summary>{t('طريقة الاستخدام')}</summary>
            <p>{product.how_to_use}</p>
          </details>}
          {!!product.specs?.length && <details className="product-information">
            <summary>{t('تفاصيل المنتج')}</summary>
            <dl className="product-specs">{product.specs.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
          </details>}
          <details className="product-information">
            <summary>{t('التوصيل والاستلام')}</summary>
            <p>{t('نوصّل إلى:')} {zoneNames}{t('. رسوم التوصيل من')} <span className="num">{formatPrice(store.minDeliveryFee)}</span> {t('حسب المنطقة وتظهر قبل تأكيد الطلب، والدفع نقداً عند الاستلام.')} <Link className="text-link" to="/delivery-info">{t('تفاصيل التوصيل')}</Link></p>
          </details>
        </div>
      </div>

      <ProductReviews product={{ id: product.id, slug: product.slug, name: product.name, image: (product.images ?? [])[0]?.url ?? null }} variantId={variant?.id} />

      <RelatedProducts product={product} />

      <div ref={stickyRef} className="product-sticky">
        <div>
          <small>{product.name}</small>
          <b><span className="num">{money(displayPrice)}</span></b>
        </div>
        {button}
        <SupportLink className="product-sticky__support" />
      </div>

      {zoom && zoomable && (
        <Dialog title={product.name} onClose={() => setZoom(false)}>
          <div className="aspect-square">
            <ProductVisual
              src={variant?.image_url ?? image?.url ?? null}
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

/** أول جملة (أو ≤ 160 حرفاً عند حد كلمة) — ملخص تحت العنوان، والنص الكامل في «وصف المنتج» */
function summarize(text: string): string {
  if (!text) return ''
  const sentence = /^[\s\S]*?[.!؟?](\s|$)/.exec(text)?.[0]?.trim()
  if (sentence && sentence.length <= 160) return sentence
  if (text.length <= 160) return text
  return `${text.slice(0, 157).replace(/\s+\S*$/, '')}…`
}
