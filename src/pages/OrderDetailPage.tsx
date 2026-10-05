import { t } from '../i18n'
import { JawwalReferenceForm } from '../components/checkout/JawwalReferenceForm'
import { isCashOnDelivery, orderStatusLabel, paymentMethodLabel } from '../lib/orderStatus'
import { DeliveryFeeValue } from '../components/checkout/DeliveryFee'
import { isMvp0Api } from '../lib/apiContract'
import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { ProductVisual } from '../components/product/ProductVisual'
import { OrderProgress } from '../components/account/OrderCard'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { Dialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatDate, formatPrice } from '../lib/format'
import { demoDispute, demoOpenDispute } from '../mock/demoOperations'

const payments: Record<string, string> = { pending: 'بانتظار التأكيد', paid: 'مدفوع', failed: 'لم يكتمل الدفع', refunded: 'تم استرداد المبلغ' }
const date = (value: string) => formatDate(value, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function OrderConfirmModal({ orderId, paymentMethod, status, onClose }: { orderId: string; paymentMethod?: string | null; status?: string; onClose: () => void }) {
  // P1-FE-03 — رسالة النجاح حسب طريقة الدفع (COD مؤكد فوراً · جوال باي بانتظار الدفع)
  const cod = isCashOnDelivery(paymentMethod)
  const confirmed = status === 'confirmed' || status === 'processing'
  const title = cod && confirmed ? t('تم تأكيد طلبكِ') : t('تم إنشاء طلبكِ')
  const body = cod
    ? t('الدفع نقداً عند الاستلام. ستجدين كود التسليم في صفحة الطلب — أعطيه للمندوب فقط بعد فحص طلبكِ.')
    : paymentMethod === 'jawwal_pay'
      ? t('أكملي الدفع عبر جوال باي لتأكيد طلبكِ. حالة الطلب محفوظة هنا.')
      : t('وصلنا طلبكِ بنجاح، سيتواصل معكِ فريق Gazabella قريبًا لتأكيد وقت التوصيل.')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    timerRef.current = setTimeout(onClose, 6000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [onClose])
  return (
    <div className="order-confirm-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('تأكيد الطلب')}>
      <div className="order-confirm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Sparkles */}
        <span className="oc-sparkle oc-sparkle--1" aria-hidden="true" />
        <span className="oc-sparkle oc-sparkle--2" aria-hidden="true" />
        <span className="oc-sparkle oc-sparkle--3" aria-hidden="true" />
        <span className="oc-sparkle oc-sparkle--4" aria-hidden="true" />
        {/* Check icon */}
        <div className="oc-icon-wrap" aria-hidden="true">
          <div className="oc-ring" />
          <svg className="oc-check" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="oc-check__circle" cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2.5" />
            <path className="oc-check__tick" d="M14 26l9 9 15-15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Text */}
        <p className="oc-eyebrow">{t('يسعدنا خدمتكِ')}</p>
        <h2 className="oc-title">{title}</h2>
        <p className="oc-body">{body}</p>
        <div className="oc-order-num" dir="ltr" aria-label={t('رقم الطلب {orderId}', { orderId: orderId })}>
          <span className="oc-order-label">{t('رقم الطلب')}</span>
          <span className="num">{orderId}</span>
        </div>
        <button type="button" className="btn-primary oc-btn" onClick={onClose}>
          <Icon name="sparkle" className="size-4" />
          {t('رائع، شكراً لكم')}
        </button>
        <p className="oc-dismiss">{t('يُغلق تلقائيًا خلال ثوانٍ')}</p>
      </div>
    </div>
  )
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const client = useQueryClient()
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(() => {
    if (searchParams.get('created') === '1') return true
    try { return sessionStorage.getItem('gz_order_confirmed') === orderId } catch { return false }
  })
  const [reason, setReason] = useState('')
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer=setInterval(() => setNow(Date.now()),30_000); return () => clearInterval(timer) }, [])
  const orderQuery = useQuery({ queryKey: ['order', orderId], queryFn: () => gazabellaApi.getOrder(orderId), enabled: Boolean(orderId), refetchInterval: (query) => ['pending','confirmed','processing','shipped'].includes(query.state.data?.status || '') ? 30_000 : false })
  const payment = useMutation({mutationFn:gazabellaApi.initPayment,onSuccess:(result) => {
    const url = new URL(result.payment_url,window.location.origin)
    if (!['https:',...(isMockMode() ? ['http:'] : [])].includes(url.protocol)) throw new Error(t('رابط الدفع غير صالح.'))
    if (isMockMode()) { void client.invalidateQueries({queryKey:['order',orderId]}); void client.invalidateQueries({queryKey:['orders']}) } else window.location.assign(url.href)
  }})
  const dispute = useMutation({
    mutationFn: async () => { if (!isMockMode()) throw new Error(t('هذه الخدمة تنتظر ربط الخادم.')); return demoOpenDispute(orderId, reason) },
    onSuccess: () => { setDisputeOpen(false); void client.invalidateQueries({queryKey:['order',orderId]}) },
  })
  if (orderQuery.isLoading) return <div className="container-page"><PageLoader /></div>
  if (orderQuery.isError || !orderQuery.data) return <div className="container-page"><ErrorState message={getApiErrorMessage(orderQuery.error)} onRetry={() => void orderQuery.refetch()} /></div>
  const order = orderQuery.data
  const savedDispute = isMockMode() ? demoDispute(orderId) : undefined
  const withinDisputeWindow = order.status === 'delivered' && order.escrow_expires_at && Date.parse(order.escrow_expires_at) > now
  return <div className="container-page py-8 sm:py-12">
    {showConfirm && <OrderConfirmModal orderId={order.order_number} paymentMethod={order.payment_method} status={order.status} onClose={() => { try { sessionStorage.removeItem('gz_order_confirmed') } catch {}; setShowConfirm(false) }} />}
    <Link to="/orders" className="text-link mb-7"><Icon name="arrow" className="size-4 ltr:rotate-180" /> {t('كل الطلبات')}</Link>
    {searchParams.get('payment') === 'failed' && order.payment_status !== 'paid' && <p className="demo-note mb-5" role="alert">{t('لم تكتمل عملية الدفع. حالة طلبكِ محفوظة ويمكنكِ مراجعتها هنا.')}</p>}
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-col items-start gap-2"><span className="eyebrow">{t('كل التفاصيل في مكان واحد')}</span><h1 className="mt-2 text-2xl font-bold num" dir="ltr">{order.order_number}</h1><p className="mt-2 text-xs text-[var(--text-3)] num">{date(order.created_at)}</p></div><span className={'status-badge status-' + order.status}>{orderStatusLabel(order.status)}</span></div>
    {(isMockMode() || isMvp0Api()) && order.payment_method === 'jawwal_pay' && ['pending','failed'].includes(order.payment_status) && order.status === 'pending' && <section className="checkout-card mt-6"><h2 className="text-lg font-bold">{t('إتمام الدفع لهذا الطلب')}</h2><p className="my-3 text-sm">{t('طلبكِ محفوظ. استئناف الدفع يستخدم الطلب نفسه.')}</p><button className="btn-primary" disabled={payment.isPending} onClick={() => payment.mutate(order.order_number)}>{payment.isPending ? t('جارٍ المتابعة…') : isMockMode() ? t('تأكيد الدفع التجريبي') : t('المتابعة إلى الدفع')}</button>{payment.isError && <p className="field-error" role="alert">{getApiErrorMessage(payment.error)}</p>}</section>}
    {!isMockMode() && !isMvp0Api() && <JawwalReferenceForm order={order} />}
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="checkout-card"><h2 className="mb-6 text-lg font-bold">{t('رحلة طلبكِ')}</h2><OrderProgress status={order.status} /><ol className="order-timeline mt-5">{(order.tracking?.length ? order.tracking : [{ status: order.status, note: null, created_at: order.created_at }]).map((event,index) => <li key={event.created_at + index}><b>{orderStatusLabel(event.status)}</b>{event.note && <p>{event.note}</p>}<time dateTime={event.created_at} className="num">{date(event.created_at)}</time></li>)}</ol></section>
        <section className="checkout-card"><h2 className="mb-5 text-lg font-bold">{t('اختياراتكِ')}</h2><div className="space-y-4">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-[var(--border)] pb-4 last:border-0 last:pb-0"><div className="order-thumb size-16 shrink-0 overflow-hidden rounded-lg"><ProductVisual src={item.image_url} alt={item.product_name} /></div><div className="min-w-0 flex-1"><b className="text-sm">{item.product_name}</b><p className="mt-1 text-xs text-[var(--text-3)]">{item.variant_name} {t('· الكمية')} <span className="num">{item.quantity}</span></p></div><b className="whitespace-nowrap text-sm"><span className="num">{formatPrice(item.subtotal)}</span></b></div>)}</div></section>
        {order.status === 'delivered' && <section className="checkout-card"><h2 className="text-lg font-bold">{t('متابعة ما بعد الاستلام')}</h2>{order.escrow_expires_at && <p className="mt-3 text-sm leading-7">{t('تنتهي نافذة مراجعة الطلب في')} <span className="num">{date(order.escrow_expires_at)}</span>.</p>}{savedDispute ? <p className="demo-note mt-4" role="status">{t('تم حفظ البلاغ التجريبي')} <span className="num">{savedDispute.id}</span> {t('على هذا الجهاز. لم يُرسل إلى فريق الدعم.')}</p> : withinDisputeWindow && isMockMode() ? <><p className="my-3 text-sm text-[var(--text-2)]">{t('يمكنكِ تجربة تسجيل مشكلة في الطلب خلال')} <span className="num">48</span> {t('ساعة من التسليم.')}</p><button className="btn-ghost" onClick={() => setDisputeOpen(true)}>{t('تسجيل مشكلة في الطلب')}</button></> : <p className="mt-3 text-sm text-[var(--text-2)]">{isMockMode() ? t('انتهت نافذة تسجيل المشكلة لهذا الطلب.') : t('خدمة متابعة المشكلات تنتظر الربط مع فريق الدعم.')}</p>}</section>}
      </div>
      <aside className="space-y-6">
        <section className="order-summary"><h2 className="mb-5 text-lg font-bold">{t('ملخص الطلب')}</h2><dl className="space-y-3 text-sm">{([[t('المنتجات'),formatPrice(order.subtotal),true],[t('التوصيل'),<DeliveryFeeValue fees={order} />,false],...(order.discount_amount ? [[t('الخصم'),formatPrice(order.discount_amount),true] as const] : []),[t('طريقة الدفع'),paymentMethodLabel(order.payment_method),false],[t('حالة الدفع'),t(payments[order.payment_status] || payments.pending),false]] as const).map(([label,value,isNum]) => <div key={label} className="flex justify-between gap-4"><dt className="text-[var(--text-2)]">{label}</dt><dd className="font-bold">{isNum ? <span className="num">{value}</span> : value}</dd></div>)}</dl><div className="mt-5 flex justify-between border-t border-[var(--border)] pt-5"><b>{t('الإجمالي')}</b><b className="text-xl text-[var(--primary)]"><span className="num">{formatPrice(order.total)}</span></b></div>{isMockMode() && <p className="mt-4 text-xs leading-6 text-[var(--text-3)]">{t('هذا طلب تجريبي للعرض. لا توجد مدفوعات أو شحنات حقيقية.')}</p>}</section>
        {order.status === 'shipped' && order.delivery_pin && <section className="checkout-card text-center"><h2 className="text-base font-bold">{t('رمز استلام الطلب')}</h2><p className="my-4 text-3xl font-bold tracking-[.3em] text-[var(--primary)] num" dir="ltr">{order.delivery_pin}</p><p className="text-xs leading-6 text-[var(--text-2)]">{t('أعطي الرمز للمندوب بعد استلام المنتجات والتأكد من طلبكِ.')}</p></section>}
        {order.address && <section className="checkout-card"><h2 className="mb-4 text-lg font-bold">{t('عنوان التوصيل')}</h2><div className="space-y-2 text-sm leading-7 text-[var(--text-2)]"><b className="text-[var(--text)]">{order.name}</b><p dir="ltr" className="text-start"><span className="num">{order.phone}</span></p><p>{order.address}</p></div>{order.notes && <p className="mt-3 border-t border-[var(--border)] pt-4 text-sm">{t('ملاحظتكِ:')} {order.notes}</p>}</section>}
      </aside>
    </div>
    {disputeOpen && <Dialog title={t('تسجيل مشكلة في الطلب التجريبي')} onClose={() => setDisputeOpen(false)}><form className="space-y-4 p-5" onSubmit={(event) => {event.preventDefault(); dispute.mutate()}}><p className="demo-note">{t('تُحفظ هذه التجربة على الجهاز فقط، ولا ترسل بلاغًا حقيقيًا.')}</p><label className="field-label block">{t('وصف المشكلة')}<textarea className="form-field mt-2" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} required rows={4} /></label>{dispute.isError && <p role="alert" className="field-error">{getApiErrorMessage(dispute.error)}</p>}<button className="btn-primary w-full" disabled={dispute.isPending}>{t('حفظ البلاغ التجريبي')}</button></form></Dialog>}
  </div>
}
