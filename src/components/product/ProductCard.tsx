import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProductBrief } from '../../types/api'
import { ProductVisual } from './ProductVisual'
import { Icon } from '../ui/Icon'
import { money } from '../../lib/format'

export function ProductCard({ product }: { product: ProductBrief }) {
  const [saved, setSaved] = useState(() => { try { return localStorage.getItem(`gazabella_wishlist_${product.id}`) === 'true' } catch { return false } })
  const price = Number(product.min_price)
  const previous = Number(product.compare_at_price)
  const discount = previous > price ? Math.round((previous - price) / previous * 100) : 0
  return <article className="catalog-card">
    <div className="catalog-card__image">
      <Link to={`/products/${product.slug}`} aria-label={`عرض ${product.name}`}><ProductVisual src={product.thumbnail_url} alt={product.name} /></Link>
      {discount > 0 && <span className="catalog-discount">−{discount}%</span>}
      <button className={`wishlist-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'إزالة من المفضلة' : 'حفظ في المفضلة'} aria-pressed={saved} onClick={() => { const next = !saved; setSaved(next); try { localStorage.setItem(`gazabella_wishlist_${product.id}`, String(next)) } catch { /* Storage may be unavailable. */ } window.dispatchEvent(new Event('gazabella-wishlist')) }}><Icon name="heart" className="size-4" /></button>
      {!product.is_available && <span className="sold-out-label">غير متوفر حاليًا</span>}
    </div>
    <div className="catalog-card__body"><span className="catalog-category">{product.category.name}</span><Link className="catalog-name" to={`/products/${product.slug}`}>{product.name}</Link><div className="catalog-price">{product.min_price !== product.max_price && <small>من</small>}<b>{money(product.min_price)}</b>{discount > 0 && <del>{money(previous)}</del>}</div><Link className="catalog-action" to={`/products/${product.slug}`}>{product.is_available ? 'اكتشفي المنتج' : 'عرض التفاصيل'}<Icon name="arrow" className="size-4 rotate-180" /></Link></div>
  </article>
}
