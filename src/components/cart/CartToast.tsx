import { useEffect } from 'react'
import { useCartStore, type CartToastInfo } from '../../stores/cartStore'
import { Icon } from '../ui/Icon'
import { ProductVisual } from '../product/ProductVisual'

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
    <aside
      role="status"
      aria-live="polite"
      aria-label="إشعار إضافة للسلة"
      className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%_-_2rem)] max-w-md animate-fade-in pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-stone-900/95 p-3 sm:p-3.5 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* صورة المنتج المصغرة بنظام الأمان الذاتي */}
          <div className="size-12 rounded-xl overflow-hidden bg-white/10 shrink-0 border border-white/15 shadow-xs">
            <ProductVisual
              src={cartToast.thumbnailUrl || null}
              alt={cartToast.productName}
              className="size-full"
            />
          </div>

          {/* تفاصيل الإشعار */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[var(--gold)]">
              <span className="inline-block size-2 rounded-full bg-emerald-400" />
              <span>تمت الإضافة للسلة بنجاح ✨</span>
            </div>
            <h4 className="font-extrabold text-xs sm:text-sm text-white truncate mt-0.5" title={cartToast.productName}>
              {cartToast.productName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-300">
              {cartToast.variantName && (
                <span className="truncate max-w-[120px] sm:max-w-[150px]">{cartToast.variantName}</span>
              )}
              {cartToast.price && (
                <span className="font-mono font-bold text-amber-300">
                  {Number(cartToast.price).toFixed(2)} ₪
                </span>
              )}
            </div>
          </div>

          {/* زر عرض السلة لفتح الدرج عند الرغبة */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenCart}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] px-3 py-2 text-xs font-black text-white shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Icon name="bag" className="size-3.5" />
              <span>عرض السلة</span>
            </button>

            {/* زر الإغلاق المباشر */}
            <button
              type="button"
              onClick={hideCartToast}
              aria-label="إغلاق الإشعار"
              className="grid size-7 place-items-center rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        </div>

        {/* شريط التقدم الزمني الدقيق بالأسفل */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className="toast-progress h-full bg-[var(--gold)]"
          />
        </div>
      </div>
    </aside>
  )
}
