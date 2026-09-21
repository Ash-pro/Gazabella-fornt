import { useMutation } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'
import { syncCart } from '../../hooks/useCartActions'
import { useCartStore } from '../../stores/cartStore'
import { Dialog } from '../ui/Dialog'
import type { ProductDetail, ProductBrief } from '../../types/api'
import { getApiErrorMessage } from '../../lib/apiClient'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductVisual } from './ProductVisual'
import { Icon } from '../ui/Icon'
import { formatPrice } from '../../lib/format'

export function ProductCard({ product }: { product: ProductBrief }) {
  const [saved, setSaved] = useState(() => { try { return localStorage.getItem(`gazabella_wishlist_${product.id}`) === 'true' } catch { return false } })
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [variantId, setVariantId] = useState<number | null>(null)
  const add = useMutation({ mutationFn: async (variant: ProductDetail['variants'][number]) => {
    const cart = await gazabellaApi.addToCart(variant.id, 1)
    syncCart(cart)
    useCartStore.getState().showCartToast({productName:product.name,variantName:variant.name,thumbnailUrl:product.thumbnail_url,price:variant.price})
  }, onSuccess: () => setDetail(null) })
  const quick = useMutation({mutationFn: () => gazabellaApi.getProduct(product.slug), onSuccess: (p) => {
    if (p.variants.length === 1) add.mutate(p.variants[0])
    else { setDetail(p); setVariantId(null) }
  }})
  const price = Number(product.min_price) || 0
  const previous = product.compare_at_price ? Number(product.compare_at_price) || 0 : null
  const discount = previous && previous > price ? Math.round(((previous - price) / previous) * 100) : 0
  return <article className="catalog-card">
    <div className="catalog-card__image">
      <Link to={`/products/${product.slug}`} aria-label={`عرض ${product.name}`}><ProductVisual src={product.thumbnail_url} alt={product.name} /></Link>
      {discount > 0 && <span className="catalog-discount">−<span className="num">{discount}%</span></span>}
      <button className={`wishlist-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'إزالة من المفضلة' : 'حفظ في المفضلة'} aria-pressed={saved} onClick={() => { const next = !saved; setSaved(next); try { localStorage.setItem(`gazabella_wishlist_${product.id}`, String(next)) } catch { /* Storage may be unavailable. */ } window.dispatchEvent(new Event('gazabella-wishlist')) }}><Icon name="heart" className="size-4" /></button>
      {!product.is_available && <span className="sold-out-label">غير متوفر حاليًا</span>}
    </div>
    <div className="catalog-card__body"><span className="catalog-category">{product.category.name}</span><Link className="catalog-name" to={`/products/${product.slug}`}>{product.name}</Link><div className="catalog-price">{product.min_price !== product.max_price && <small>من</small>}{discount > 0 && previous && <del className="line-through text-gray-400 text-sm"><span className="num">{formatPrice(previous)}</span></del>}<b><span className="num">{formatPrice(product.min_price)}</span></b></div><Link className="catalog-action" to={`/products/${product.slug}`}>{product.is_available ? 'اكتشفي المنتج' : 'عرض التفاصيل'}<Icon name="arrow" className="size-4 rotate-180" /></Link><button className="btn-primary quick-add" disabled={!product.is_available || quick.isPending || add.isPending} onClick={() => { add.reset(); quick.mutate() }}>{quick.isPending || add.isPending ? 'جارٍ الإضافة…' : 'أضيفي للسلة +'}</button>{(quick.error || add.error) && !detail && <p role="alert" className="field-error">{getApiErrorMessage(quick.error || add.error)}</p>}</div>
    {detail && <Dialog title="اختاري تفاصيل منتجكِ" bottom onClose={() => setDetail(null)}><div className="quick-selector"><h3>{product.name}</h3><div className="variant-options">{detail.variants.map((v) => <button key={v.id} disabled={!v.available_quantity || add.isPending} aria-pressed={variantId === v.id} className={variantId === v.id ? 'selected' : ''} onClick={() => setVariantId(v.id)}>{v.name}<b><span className="num">{formatPrice(v.price)}</span></b>{!v.available_quantity && <small>غير متوفر</small>}</button>)}</div>{add.error && <p role="alert" className="field-error">{getApiErrorMessage(add.error)}</p>}<button className="btn-primary w-full" disabled={!variantId || add.isPending} onClick={() => { const v = detail.variants.find((v) => v.id === variantId); if(v) add.mutate(v) }}>{add.isPending ? 'جارٍ الإضافة…' : 'أضيفي للسلة +'}</button></div></Dialog>}
  </article>
}
