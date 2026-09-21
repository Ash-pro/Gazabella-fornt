import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getApiErrorMessage as logoutError } from '../lib/apiClient'
import { gazabellaApi } from '../api/gazabella'
import { EmptyState, ErrorState, PageLoader } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatPrice } from '../lib/format'
import type { OrderStatus } from '../types/api'

const statusLabel: Record<OrderStatus, string> = {
  pending: 'قيد الاستلام',
  confirmed: 'تم التأكيد',
  processing: 'قيد التجهيز',
  shipped: 'في الطريق إليكِ',
  delivered: 'مكتمل',
  cancelled: 'ملغي',
  refunded: 'مسترد',
}

export function OrdersPage() {
  const logout = useMutation({mutationFn: gazabellaApi.logout, onSuccess: () => useAuthStore.getState().clearSession()})
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: () => gazabellaApi.getOrders() })
  if (ordersQuery.isLoading) return <div className="container-page"><PageLoader label="نحمّل طلباتك…" /></div>
  if (ordersQuery.isError) return <div className="container-page"><ErrorState message={getApiErrorMessage(ordersQuery.error)} onRetry={() => void ordersQuery.refetch()} /></div>

  return (
    <div className="container-page py-10 sm:py-14">
      <span className="eyebrow">حسابك ومشترياتك</span>
      <div className="flex items-center justify-between"><h1 className="section-title mt-2">طلباتي</h1><button className="btn-ghost" disabled={logout.isPending} onClick={() => logout.mutate()}>تسجيل الخروج</button></div>{logout.isError && <p className="field-error">{logoutError(logout.error)}</p>}
      <div className="mt-8 grid gap-4">
        {!ordersQuery.data?.data.length && <EmptyState title="لا توجد طلبات بعد" message="عندما تتمين أول طلب سيظهر هنا بكل تفاصيله." />}
        {ordersQuery.data?.data.map((order) => (
          <Link to={`/orders/${order.order_number}`} key={order.id} className="order-card hover:border-[var(--primary)] transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <p className="font-mono text-base font-black text-[var(--primary)] num" dir="ltr">{order.order_number}</p>
                {order.status === 'shipped' && order.delivery_pin && (
                  <span className="rounded-md border border-[var(--primary)]/30 bg-[var(--primary-dim)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--primary)] num" dir="ltr">
                    PIN: {order.delivery_pin}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-2)]">
                {new Intl.DateTimeFormat('ar-PS-u-nu-latn', { dateStyle: 'medium' }).format(new Date(order.created_at))} · <span className="num">{order.items.length}</span> منتجات · 📍 {order.address?.city || 'خانيونس'}
              </p>
              <p className="mt-3 text-sm">{order.items.slice(0, 2).map((item, idx) => <span key={item.id || idx}>{idx > 0 && '، '}{item.product_name} × <span className="num">{item.quantity}</span></span>)}{order.items.length > 2 && <> و<span className="num">{order.items.length - 2}</span> منتجات أخرى</>}</p>
              <span className="text-link mt-3">تفاصيل الطلب</span>
            </div>
            <div className="mr-auto text-left flex flex-col items-end">
              <span className={`status-badge status-${order.status}`}>{statusLabel[order.status]}</span>
              <p className="mt-2 font-mono text-lg font-bold text-[var(--text)]"><span className="num">{formatPrice(order.total)}</span></p>
            </div>
            <Icon name="chevron" className="size-5 text-[var(--text-3)] shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
