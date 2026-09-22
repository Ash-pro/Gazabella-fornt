import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi } from '../api/gazabella'
import { ProductVisual } from '../components/product/ProductVisual'
import { EmptyState, ErrorState, PageLoader } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { syncCart, useProceedToCheckout } from '../hooks/useCartActions'
import { formatPrice } from '../lib/format'
import type { Cart } from '../types/api'

export function CartPage() {
  const cartQuery = useQuery({ queryKey: ['cart'], queryFn: gazabellaApi.getCart })

  function updateCache(cart: Cart) {
    syncCart(cart)
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => gazabellaApi.updateCartItem(id, quantity),
    onSuccess: updateCache,
  })
  const removeMutation = useMutation({
    mutationFn: gazabellaApi.removeCartItem,
    onSuccess: updateCache,
  })
  const reserveMutation = useProceedToCheckout()
  const busy = updateMutation.isPending || removeMutation.isPending || reserveMutation.isPending

  if (cartQuery.isLoading) return <div className="container-page"><PageLoader label="نجهّز سلتك…" /></div>
  if (cartQuery.isError) return <div className="container-page"><ErrorState message={getApiErrorMessage(cartQuery.error)} onRetry={() => void cartQuery.refetch()} /></div>

  const cart = cartQuery.data
  if (!cart?.items.length) {
    return <div className="container-page"><EmptyState title="سلتك تنتظر اختياراتك" message="اكتشفي المجموعة وأضيفي ما تحبينه." /><div className="text-center"><Link className="btn-primary" to="/">ابدئي التسوق</Link></div></div>
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mb-9">
        {(updateMutation.isError || removeMutation.isError) && <p className="field-error" role="alert">{getApiErrorMessage(updateMutation.error || removeMutation.error)}</p>}
        <span className="eyebrow">اختياراتك</span>
        <h1 className="section-title mt-2">سلة التسوق</h1>
        <p className="mt-2 text-sm text-[var(--text-2)]"><span className="num">{cart.total_items}</span> قطع في سلتك</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-white">
          {cart.items.map((item, index) => (
            <article key={item.id} className={`grid grid-cols-[92px_1fr] gap-4 p-4 sm:grid-cols-[130px_1fr] sm:p-6 ${index ? 'border-t border-[var(--border)]' : ''}`}>
              <div className="aspect-square overflow-hidden rounded-[var(--r-md)]">
                <ProductVisual src={item.thumbnail_url} alt={item.product_name} />
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div><h2 className="font-extrabold leading-6">{item.product_name}</h2><p className="mt-1 text-xs text-[var(--text-2)]">الحجم: {item.variant_name}</p></div>
                  <button type="button" className="text-[var(--text-3)] transition-colors hover:text-[var(--error)]" disabled={busy} onClick={() => removeMutation.mutate(item.id)} aria-label={`حذف ${item.product_name}`}><Icon name="trash" className="size-5" /></button>
                </div>
                <div className="flex items-center justify-between">
                    <div className="quantity-control quantity-control--small">
                      <button type="button" aria-label={`تقليل كمية ${item.product_name}`} disabled={item.quantity <= 1 || busy} onClick={() => updateMutation.mutate({ id: item.id, quantity: item.quantity - 1 })}><Icon name="minus" className="size-3" /></button>
                      <span className="num">{item.quantity}</span>
                      <button type="button" aria-label={`زيادة كمية ${item.product_name}`} disabled={item.quantity >= Math.min(10, item.stock) || busy} onClick={() => updateMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}><Icon name="plus" className="size-3" /></button>
                    </div>
                    <p className="font-mono font-bold"><span className="num">{formatPrice(item.subtotal)}</span></p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="order-summary lg:sticky lg:top-40">
            <h2 className="text-xl font-extrabold">ملخص الطلب</h2>
            <div className="my-6 space-y-4 border-y border-[var(--border)] py-5 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-2)]">المجموع الفرعي</span><span className="font-mono font-bold"><span className="num">{formatPrice(cart.subtotal)}</span></span></div>
              <div className="flex justify-between"><span className="text-[var(--text-2)]">التوصيل</span><span>يُحدد لاحقًا</span></div>
            </div>
            <div className="mb-6 flex items-end justify-between"><span className="font-extrabold">المجموع</span><span className="font-mono text-2xl font-bold text-[var(--primary)]"><span className="num">{formatPrice(cart.subtotal)}</span></span></div>
            <button className="btn-primary w-full" type="button" disabled={reserveMutation.isPending || updateMutation.isPending || removeMutation.isPending} onClick={() => reserveMutation.mutate()}>
            {reserveMutation.isPending ? 'نحجز اختياراتك…' : 'متابعة إلى التوصيل والدفع'}
          </button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-[var(--text-2)]"><Icon name="clock" className="mt-1 size-4 shrink-0" />نتحقق من التوافر قبل المتابعة. يظهر وقت الحجز المتبقي أعلى الصفحة.</p>
          {reserveMutation.isError && <p className="mt-4 rounded-lg bg-[var(--error-bg)] p-3 text-sm text-[var(--error)]">{getApiErrorMessage(reserveMutation.error)}</p>}
        </aside>
      </div>
    </div>
  )
}
