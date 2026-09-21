import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { ProductVisual } from '../components/product/ProductVisual'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { Dialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { useCheckoutStore } from '../stores/checkoutStore'
import { money } from '../lib/format'
import { demoDispute, demoOpenDispute } from '../mock/demoOperations'

const labels: Record<string, string> = { pending: 'استلام الطلب', confirmed: 'تم التأكيد', processing: 'قيد التجهيز', shipped: 'في الطريق', delivered: 'تم التسليم', cancelled: 'ملغي', refunded: 'مسترد' }
const payments: Record<string, string> = { unpaid: 'غير مدفوع', pending: 'بانتظار التأكيد', paid: 'مدفوع', failed: 'لم يكتمل الدفع', refunded: 'تم استرداد المبلغ' }
const date = (value: string) => new Intl.DateTimeFormat('ar-PS', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
export function OrderDetailPage() {
  const { orderNumber = '' } = useParams()
  const [searchParams] = useSearchParams()
  const client = useQueryClient()
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer=setInterval(() => setNow(Date.now()),30_000); return () => clearInterval(timer) }, [])
  const orderQuery = useQuery({ queryKey: ['order', orderNumber], queryFn: () => gazabellaApi.getOrder(orderNumber), enabled: Boolean(orderNumber), refetchInterval: (query) => ['pending','confirmed','processing','shipped'].includes(query.state.data?.status || '') ? 30_000 : false })
  const payment = useMutation({mutationFn:gazabellaApi.initPayment,onSuccess:(result) => {
    const url = new URL(result.payment_url,window.location.origin)
    if (!['https:',...(isMockMode() ? ['http:'] : [])].includes(url.protocol)) throw new Error('رابط الدفع غير صالح.')
    if (useCheckoutStore.getState().pendingOrder?.order_number === orderNumber) useCheckoutStore.getState().reset()
    if (isMockMode()) { void client.invalidateQueries({queryKey:['order',orderNumber]}); void client.invalidateQueries({queryKey:['orders']}) } else window.location.assign(url.href)
  }})
  const dispute = useMutation({
    mutationFn: async () => { if (!isMockMode()) throw new Error('هذه الخدمة تنتظر ربط الخادم.'); return demoOpenDispute(orderNumber, reason) },
    onSuccess: () => { setDisputeOpen(false); void client.invalidateQueries({queryKey:['order',orderNumber]}) },
  })
  if (orderQuery.isLoading) return <div className="container-page"><PageLoader /></div>
  if (orderQuery.isError || !orderQuery.data) return <div className="container-page"><ErrorState message={getApiErrorMessage(orderQuery.error)} onRetry={() => void orderQuery.refetch()} /></div>
  const order = orderQuery.data
  const savedDispute = isMockMode() ? demoDispute(orderNumber) : undefined
  const withinDisputeWindow = order.status === 'delivered' && order.escrow_expires_at && Date.parse(order.escrow_expires_at) > now
  return <div className="container-page py-8 sm:py-12">
    <Link to="/orders" className="text-link mb-7"><Icon name="arrow" className="size-4" /> كل الطلبات</Link>
    {searchParams.get('payment') === 'failed' && order.payment_status !== 'paid' && <p className="demo-note mb-5" role="alert">لم تكتمل عملية الدفع. حالة طلبكِ محفوظة ويمكنكِ مراجعتها هنا.</p>}
    <div className="flex flex-wrap items-center justify-between gap-4"><div><span className="eyebrow">كل التفاصيل في مكان واحد</span><h1 className="mt-2 text-2xl font-bold" dir="ltr">{order.order_number}</h1><p className="mt-2 text-xs text-[var(--text-3)]">{date(order.created_at)}</p></div><span className={'status-badge status-' + order.status}>{labels[order.status] || order.status}</span></div>
    {['unpaid','failed'].includes(order.payment_status) && order.status === 'pending' && <section className="checkout-card mt-6"><h2 className="text-lg font-bold">إتمام الدفع لهذا الطلب</h2><p className="my-3 text-sm">طلبكِ محفوظ. استئناف الدفع يستخدم الطلب نفسه.</p><button className="btn-primary" disabled={payment.isPending} onClick={() => payment.mutate(order.id)}>{payment.isPending ? 'جارٍ المتابعة…' : isMockMode() ? 'تأكيد الدفع التجريبي' : 'المتابعة إلى الدفع'}</button>{payment.isError && <p className="field-error" role="alert">{getApiErrorMessage(payment.error)}</p>}</section>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="checkout-card"><h2 className="mb-6 text-lg font-bold">رحلة طلبكِ</h2><ol className="order-timeline">{order.tracking.map((event,index) => <li key={event.created_at + index}><b>{labels[event.status] || event.status}</b>{event.note && <p>{event.note}</p>}<time dateTime={event.created_at}>{date(event.created_at)}</time></li>)}</ol></section>
        <section className="checkout-card"><h2 className="mb-5 text-lg font-bold">اختياراتكِ</h2><div className="space-y-4">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-[var(--border)] pb-4 last:border-0 last:pb-0"><div className="size-16 shrink-0 overflow-hidden rounded-lg"><ProductVisual src={item.thumbnail_url} alt={item.product_name} /></div><div className="min-w-0 flex-1"><b className="text-sm">{item.product_name}</b><p className="mt-1 text-xs text-[var(--text-3)]">{item.variant_name} · الكمية {item.quantity}</p></div><b className="whitespace-nowrap text-sm">{money(item.subtotal)}</b></div>)}</div></section>
        {order.status === 'delivered' && <section className="checkout-card"><h2 className="text-lg font-bold">متابعة ما بعد الاستلام</h2>{order.escrow_expires_at && <p className="mt-3 text-sm leading-7">تنتهي نافذة مراجعة الطلب في {date(order.escrow_expires_at)}.</p>}{savedDispute ? <p className="demo-note mt-4" role="status">تم حفظ البلاغ التجريبي {savedDispute.id} على هذا الجهاز. لم يُرسل إلى فريق الدعم.</p> : withinDisputeWindow && isMockMode() ? <><p className="my-3 text-sm text-[var(--text-2)]">يمكنكِ تجربة تسجيل مشكلة في الطلب خلال 48 ساعة من التسليم.</p><button className="btn-ghost" onClick={() => setDisputeOpen(true)}>تسجيل مشكلة في الطلب</button></> : <p className="mt-3 text-sm text-[var(--text-2)]">{isMockMode() ? 'انتهت نافذة تسجيل المشكلة لهذا الطلب.' : 'خدمة متابعة المشكلات تنتظر الربط مع فريق الدعم.'}</p>}</section>}
      </div>
      <aside className="space-y-6">
        <section className="order-summary"><h2 className="mb-5 text-lg font-bold">ملخص الطلب</h2><dl className="space-y-3 text-sm">{[['المنتجات',money(order.subtotal)],['التوصيل',money(order.delivery_fee)],['الخصم','−' + money(order.discount_amount)],['حالة الدفع',payments[order.payment_status] || order.payment_status]].map(([label,value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-[var(--text-2)]">{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl><div className="mt-5 flex justify-between border-t border-[var(--border)] pt-5"><b>الإجمالي</b><b className="text-xl text-[var(--primary)]">{money(order.total)}</b></div>{isMockMode() && <p className="mt-4 text-xs leading-6 text-[var(--text-3)]">هذا طلب تجريبي للعرض. لا توجد مدفوعات أو شحنات حقيقية.</p>}</section>
        {order.status === 'shipped' && order.delivery_pin && <section className="checkout-card text-center"><h2 className="text-base font-bold">رمز استلام الطلب</h2><p className="my-4 text-3xl font-bold tracking-[.3em] text-[var(--primary)]" dir="ltr">{order.delivery_pin}</p><p className="text-xs leading-6 text-[var(--text-2)]">أعطي الرمز للمندوب بعد استلام المنتجات والتأكد من طلبكِ.</p></section>}
        {order.address && <section className="checkout-card"><h2 className="mb-4 text-lg font-bold">عنوان التوصيل</h2><div className="space-y-2 text-sm leading-7 text-[var(--text-2)]"><b className="text-[var(--text)]">{order.address.full_name}</b><p>{order.address.city}، {order.address.area}</p><p>{order.address.details}</p>{order.address.landmark && <p>{order.address.landmark}</p>}<p dir="ltr" className="text-right">{order.address.phone}</p></div><p className="mt-4 border-t border-[var(--border)] pt-4 text-xs">{order.delivery_option.name} · المدة التقديرية {order.delivery_option.estimated_days} أيام عمل</p>{order.notes && <p className="mt-3 text-sm">ملاحظتكِ: {order.notes}</p>}</section>}
      </aside>
    </div>
    {disputeOpen && <Dialog title="تسجيل مشكلة في الطلب التجريبي" onClose={() => setDisputeOpen(false)}><form className="space-y-4 p-5" onSubmit={(event) => {event.preventDefault(); dispute.mutate()}}><p className="demo-note">تُحفظ هذه التجربة على الجهاز فقط، ولا ترسل بلاغًا حقيقيًا.</p><label className="field-label block">وصف المشكلة<textarea className="form-field mt-2" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} required rows={4} /></label>{dispute.isError && <p role="alert" className="field-error">{getApiErrorMessage(dispute.error)}</p>}<button className="btn-primary w-full" disabled={dispute.isPending}>حفظ البلاغ التجريبي</button></form></Dialog>}
  </div>
}
