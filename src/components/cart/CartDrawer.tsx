import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { syncCart, useProceedToCheckout } from '../../hooks/useCartActions'
import { getApiErrorMessage } from '../../lib/apiClient'
import { money } from '../../lib/format'
import { useCartStore } from '../../stores/cartStore'
import { ProductVisual } from '../product/ProductVisual'
import { Dialog } from '../ui/Dialog'
import { ErrorState, PageLoader } from '../ui/AsyncState'
import { Icon } from '../ui/Icon'

export function CartDrawer() {
  const open = useCartStore((state) => state.isDrawerOpen)
  const close = useCartStore((state) => state.closeDrawer)
  const cart = useQuery({ queryKey: ['cart'], queryFn: gazabellaApi.getCart, enabled: open })
  const update = useMutation({ mutationFn: ({id, quantity}: {id: number; quantity: number}) => gazabellaApi.updateCartItem(id, quantity), onSuccess: syncCart })
  const remove = useMutation({ mutationFn: gazabellaApi.removeCartItem, onSuccess: syncCart })
  const proceed = useProceedToCheckout()
  const busy = update.isPending || remove.isPending || proceed.isPending

  if (!open) return null

  return <Dialog title="اختياراتكِ في السلة" sheet onClose={close}>
    <div className="flex-1 overflow-y-auto p-5">
      {cart.isLoading ? <PageLoader label="نحمّل السلة…" /> : cart.isError ? <ErrorState message={getApiErrorMessage(cart.error)} onRetry={() => void cart.refetch()} /> : !cart.data?.items.length ? <div className="py-14 text-center"><Icon name="bag" className="mx-auto size-12 text-[var(--primary)]" /><h3 className="mt-5 text-xl font-bold">مساحة لاختياراتكِ القادمة</h3><p className="my-3 text-sm text-[var(--text-2)]">اكتشفي شيئًا تحبينه وأضيفيه هنا.</p><Link className="btn-primary mt-3" to="/#products" onClick={close}>اكتشفي المنتجات</Link></div> : cart.data.items.map((item) => <article key={item.id} className="flex gap-4 border-b border-[var(--border)] py-5 first:pt-0">
        <Link onClick={close} to="/#products" className="h-28 w-24 shrink-0 overflow-hidden rounded-lg"><ProductVisual src={item.thumbnail_url} alt={item.product_name} /></Link>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-6">{item.product_name}</h3>
          <p className="mt-1 text-xs text-[var(--text-3)]">{item.variant_name}</p>
          <div className="cart-item-price my-2">{item.compare_at_price && Number(item.compare_at_price) > Number(item.unit_price) && <del className="line-through text-gray-400 text-sm"><span className="num">{money(Number(item.compare_at_price) * item.quantity)}</span></del>}<b className="block text-sm"><span className="num">{money(item.subtotal)}</span></b></div>
          <div className="flex items-center justify-between"><div className="quantity-control quantity-control--small"><button disabled={busy || item.quantity <= 1} aria-label={`تقليل كمية ${item.product_name}`} onClick={() => update.mutate({ id: item.id, quantity: item.quantity - 1 })}>−</button><span className="num">{item.quantity}</span><button disabled={busy || item.quantity >= 10} aria-label={`زيادة كمية ${item.product_name}`} onClick={() => update.mutate({ id: item.id, quantity: item.quantity + 1 })}>+</button></div><button className="icon-button" disabled={busy} aria-label={`حذف ${item.product_name}`} onClick={() => remove.mutate(item.id)}><Icon name="trash" className="size-4" /></button></div>
        </div>
      </article>)}
      {(update.isError || remove.isError || proceed.isError) && <p className="field-error" role="alert">{getApiErrorMessage(update.error || remove.error || proceed.error)}</p>}
    </div>
    {!!cart.data?.items.length && <div className="border-t border-[var(--border)] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"><div className="mb-2 flex justify-between text-base"><b>المجموع الفرعي</b><b><span className="num">{money(cart.data.subtotal)}</span></b></div><p className="mb-5 text-xs text-[var(--text-3)]">تظهر رسوم التوصيل قبل تأكيد الطلب.</p><button className="btn-primary w-full" disabled={busy} onClick={() => proceed.mutate()}>{proceed.isPending ? 'نتحقق من التوافر…' : 'متابعة إلى التوصيل والدفع'}<Icon name="arrow" className="size-4 rotate-180" /></button><Link className="mt-3 block py-2 text-center text-sm underline underline-offset-4" to="/cart" onClick={close}>عرض السلة كاملة</Link></div>}
  </Dialog>
}
