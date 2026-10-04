import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DeliveryFeeRow } from '../components/checkout/DeliveryFee'
import { JawwalReferenceForm } from '../components/checkout/JawwalReferenceForm'
import { Icon } from '../components/ui/Icon'
import { whatsappLink } from '../content/storeInfo'
import { orderPath } from '../hooks/useAccountOrders'
import { useStoreInfo } from '../hooks/useStoreInfo'
import { money } from '../lib/format'
import { loadLastOrder, maskPhone, updateLastOrder } from '../lib/lastOrder'
import { isCashOnDelivery, paymentMethodLabel } from '../lib/orderStatus'
import { useAuthStore } from '../stores/authStore'
import type { Order } from '../types/api'

function CopyOrderNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" className="thx-copy" onClick={() => { void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }}>
      <Icon name={copied ? 'check' : 'clipboard'} className="size-4" />
      <span aria-live="polite">{copied ? 'تم النسخ' : 'نسخ الرقم'}</span>
    </button>
  )
}

/** صفحة الشكر بعد إتمام الطلب — تعمل للزائرة والمسجّلة، وتبقى بعد تحديث الصفحة (آخر طلب محفوظ في الجلسة) */
export function CheckoutReceiptPage() {
  const location = useLocation()
  const [saved] = useState(loadLastOrder)
  const [order, setOrder] = useState<Order | null>(() => (location.state as { order?: Order } | null)?.order ?? saved?.order ?? null)
  const loggedIn = useAuthStore((s) => !!s.token)
  const store = useStoreInfo()

  if (!order) {
    return (
      <div className="container-page thx-page">
        <section className="thx-card thx-card--center">
          <span className="thx-badge thx-badge--muted"><Icon name="package" className="size-7" /></span>
          <h1>لا يوجد طلب حديث على هذا الجهاز</h1>
          <p>إن أتممتِ طلباً من قبل، سجّلي الدخول بنفس رقم الجوال الذي طلبتِ به لتشاهدي حالته وتفاصيله.</p>
          <div className="thx-actions">
            <Link className="btn-primary" to={loggedIn ? '/orders' : '/auth?next=%2Forders'}>{loggedIn ? 'طلباتي' : 'تسجيل الدخول لمتابعة طلباتي'}</Link>
            <Link className="btn-ghost" to="/">متابعة التسوق</Link>
          </div>
          {store.paymentMethods?.includes('jawwal_pay') && <Link className="text-link" to="/orders/lookup">لديكِ مرجع دفع؟ ابحثي به</Link>}
        </section>
      </div>
    )
  }

  const cod = isCashOnDelivery(order.payment_method)
  const paid = order.payment_status === 'paid'
  const phone = saved?.order.order_number === order.order_number ? saved.phone : order.phone
  const address = order.address || (saved?.order.order_number === order.order_number ? saved.address : '') || ''
  const detailsPath = orderPath(order)
  const trackTo = loggedIn ? detailsPath : `/auth?next=${encodeURIComponent(detailsPath)}&from=order`
  const help = store.whatsapp ? whatsappLink(store.whatsapp, `مرحباً Gazabella، أستفسر عن طلبي رقم ${order.order_number}`) : null
  const steps: Array<{ icon: 'clock' | 'truck' | 'dollar'; title: string; text: string }> = [
    { icon: 'clock', title: 'نراجع طلبكِ ونؤكده', text: `عادةً خلال ${store.acceptanceWindowMinutes} دقيقة في أوقات الدوام.` },
    { icon: 'truck', title: 'نجهّزه ونرسله مع المندوب', text: address ? `إلى: ${address}` : 'إلى العنوان الذي أدخلتِه.' },
    cod
      ? { icon: 'dollar', title: 'تدفعين عند الاستلام', text: `جهّزي ${money(order.total)} نقداً، وافحصي المنتجات قبل الدفع.` }
      : { icon: 'dollar', title: paid ? 'تم تأكيد الدفع' : 'أكملي الدفع', text: paid ? 'وصلنا دفعكِ، شكراً لكِ.' : 'حوّلي المبلغ ثم أدخلي مرجع الدفع في الأسفل ليُؤكَّد الطلب.' },
  ]

  return (
    <div className="container-page thx-page">
      <section className="thx-card thx-card--center" aria-labelledby="thx-title">
        <span className="thx-badge"><Icon name="check" className="size-8" /></span>
        <h1 id="thx-title">شكراً لكِ! استلمنا طلبكِ</h1>
        <p>{phone ? <>سنتواصل معكِ على الرقم <bdi className="num" dir="ltr">{maskPhone(phone)}</bdi> إن احتجنا أي توضيح.</> : 'سنتواصل معكِ إن احتجنا أي توضيح.'}</p>
        <div className="thx-number">
          <span>رقم الطلب</span>
          <strong className="num" dir="ltr">{order.order_number}</strong>
          <CopyOrderNumber value={order.order_number} />
        </div>
        <div className="thx-actions">
          <Link className="btn-primary" to={trackTo}>تابعي حالة الطلب</Link>
          <Link className="btn-ghost" to="/">متابعة التسوق</Link>
        </div>
        {!loggedIn && (
          <p className="thx-hint"><Icon name="shield" className="size-4 shrink-0 mt-0.5" /><span>للمتابعة نرسل كود تحقق إلى نفس رقم الجوال الذي طلبتِ به — بدون كلمة سر. احتفظي برقم الطلب للرجوع إليه.</span></p>
        )}
      </section>

      <div className="thx-grid">
        <section className="thx-card" aria-labelledby="thx-next">
          <h2 id="thx-next">ماذا يحدث الآن؟</h2>
          <ol className="thx-steps">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="thx-steps__icon"><Icon name={step.icon} className="size-5" /></span>
                <div><b><span className="num">{i + 1}.</span> {step.title}</b><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
          {help && <a className="thx-help" href={help} target="_blank" rel="noopener noreferrer"><Icon name="phone" className="size-4" />عندكِ سؤال عن الطلب؟ راسلينا على واتساب</a>}
        </section>

        <section className="thx-card" aria-labelledby="thx-summary">
          <h2 id="thx-summary">ملخص الطلب</h2>
          <ul className="thx-items">
            {order.items.map((item) => (
              <li key={item.id}><span>{item.product_name}{item.quantity > 1 && <> × <span className="num">{item.quantity}</span></>}</span><b className="num">{money(item.subtotal)}</b></li>
            ))}
          </ul>
          <div className="thx-totals">
            <div className="flex justify-between gap-4"><span>قيمة المنتجات</span><span className="num">{money(order.subtotal)}</span></div>
            <DeliveryFeeRow fees={order} />
            <div className="flex justify-between gap-4"><span>طريقة الدفع</span><span>{paymentMethodLabel(order.payment_method)}</span></div>
            <div className="thx-total"><span>{cod ? 'المبلغ عند الاستلام' : 'الإجمالي'}</span><strong className="num">{money(order.total)}</strong></div>
          </div>
          {!cod && <p role="status" className="thx-pay-status" data-paid={paid}>{paid ? 'تم تأكيد الدفع' : 'لم يُؤكَّد الدفع بعد'}</p>}
        </section>
      </div>

      <JawwalReferenceForm order={order} onConfirmed={(updated) => { setOrder(updated); updateLastOrder(updated) }} />
      {!cod && <p className="thx-lookup"><Link className="text-link" to="/orders/lookup">البحث عن طلب بمرجع الدفع</Link></p>}
    </div>
  )
}
