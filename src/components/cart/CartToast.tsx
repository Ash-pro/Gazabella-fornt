import { t } from '../../i18n'
import { useEffect } from 'react'
import { useCartStore, type CartToastInfo } from '../../stores/cartStore'
import { Icon } from '../ui/Icon'
import { ProductVisual } from '../product/ProductVisual'
import { formatPrice } from '../../lib/format'

const AUTO_DISMISS_MS = 3800

export function CartToast() {
  const cartToast = useCartStore((state) => state.cartToast)
  const toastKey = useCartStore((state) => state.toastKey)

  if (!cartToast) return null

  return <CartToastBanner key={toastKey} cartToast={cartToast} />
}

function CartToastBanner({ cartToast }: { cartToast: CartToastInfo }) {
  const hideCartToast = useCartStore((state) => state.hideCartToast)
  const openDrawer = useCartStore((state) => state.openDrawer)

  useEffect(() => {
    const timer = setTimeout(() => {
      hideCartToast()
    }, AUTO_DISMISS_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [hideCartToast])

  const handleOpenCart = () => {
    hideCartToast()
    openDrawer()
  }


  return (
    <aside role="status" aria-live="polite" aria-label={t('إشعار إضافة للسلة')}
      className="cart-toast fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%_-_2rem)] max-w-md pointer-events-auto">
      <div className="ct">
        <div className="ct__thumb"><ProductVisual src={cartToast.thumbnailUrl || null} alt={cartToast.productName} className="size-full" /></div>
        <div className="ct__copy">
          <p className="ct__status">
            <svg className="ct__check" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 9.4l2.6 2.6L13 6.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>{t('أُضيف إلى سلتكِ')}</span>
          </p>
          <p className="ct__name" title={cartToast.productName}>{cartToast.productName}</p>
          {(cartToast.variantName || cartToast.price) && <p className="ct__meta">{cartToast.variantName && <span>{cartToast.variantName}</span>}{cartToast.price && <span className="num">{formatPrice(cartToast.price)}</span>}</p>}
        </div>
        <div className="ct__actions">
          <button type="button" onClick={handleOpenCart} className="ct__view"><Icon name="bag" className="size-4" /><span>{t('عرض السلة')}</span></button>
          <button type="button" onClick={hideCartToast} aria-label={t('إغلاق الإشعار')} className="ct__close"><Icon name="close" className="size-4" /></button>
        </div>
        <div className="ct__progress" aria-hidden="true"><div className="toast-progress" /></div>
      </div>
    </aside>
  )
}
