import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Order } from '../../types/api'
import { getImageUrl } from '../../lib/apiClient'
import { formatPrice } from '../../lib/format'
import { orderStatusLabel, paymentMethodLabel } from '../../lib/orderStatus'
import { ORDER_STEPS, orderStepIndex } from '../../lib/orderSearch'
import { orderPath } from '../../hooks/useAccountOrders'
import { whatsappLink } from '../../content/storeInfo'
import { Icon } from '../ui/Icon'

const dateFmt = new Intl.DateTimeFormat('ar-PS-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('ar-PS-u-nu-latn', { hour: 'numeric', minute: '2-digit' })

/** يظلل النص المطابق حرفياً (بدون تحويل) — يكفي لرقم الطلب وأسماء المنتجات */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (at < 0) return <>{text}</>
  return <>{text.slice(0, at)}<mark className="acct-mark">{text.slice(at, at + q.length)}</mark>{text.slice(at + q.length)}</>
}

function CopyNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" className="acct-copy" aria-label={copied ? 'تم النسخ' : `نسخ رقم الطلب ${value}`}
      onClick={() => { void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }) }}>
      <Icon name={copied ? 'check' : 'clipboard'} className="size-4" />
    </button>
  )
}

export function OrderProgress({ status }: { status: string }) {
  const current = orderStepIndex(status)
  if (current < 0) return null
  return (
    <ol className="acct-progress" aria-label={`مرحلة الطلب: ${orderStatusLabel(status)}`}>
      {ORDER_STEPS.map((step, i) => (
        <li key={step.status} className={i < current ? 'done' : i === current ? (status === 'delivered' ? 'done current' : 'current') : undefined} aria-current={i === current ? 'step' : undefined}>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}

export function OrderCard({ order, query, whatsapp, acceptanceMinutes }: { order: Order; query: string; whatsapp: string | null; acceptanceMinutes: number }) {
  const created = new Date(order.created_at)
  const count = order.items_count ?? order.items.reduce((n, i) => n + (i.quantity || 1), 0)
  const thumbs = order.items.slice(0, 3)
  const extra = order.items.length - thumbs.length
  const help = whatsapp ? whatsappLink(whatsapp, `مرحباً Gazabella، أستفسر عن طلبي رقم ${order.order_number}`) : null

  return (
    <article className="acct-order" aria-labelledby={`order-${order.id}`}>
      <header className="acct-order__head">
        <div className="min-w-0">
          <p className="acct-order__number" id={`order-${order.id}`}>
            <span className="num" dir="ltr"><Highlight text={order.order_number} query={query} /></span>
            <CopyNumber value={order.order_number} />
          </p>
          <p className="acct-order__meta">
            {!Number.isNaN(created.getTime()) && <><span className="num">{dateFmt.format(created)}</span> · <span className="num">{timeFmt.format(created)}</span> · </>}
            <span className="num">{count}</span> {count === 1 ? 'منتج' : 'منتجات'}
            {order.payment_method && <> · {paymentMethodLabel(order.payment_method)}</>}
          </p>
        </div>
        <span className={`status-badge status-${order.status}`}>{orderStatusLabel(order.status)}</span>
      </header>

      <div className="acct-order__body">
        <div className="acct-thumbs" aria-hidden="true">
          {thumbs.length ? thumbs.map((item, i) => {
            const src = getImageUrl(item.image_url)
            return <span className="acct-thumb" key={item.id || i}>{src ? <img src={src} alt="" loading="lazy" /> : <Icon name="package" className="size-5" />}</span>
          }) : <span className="acct-thumb"><Icon name="package" className="size-5" /></span>}
          {extra > 0 && <span className="acct-thumb acct-thumb--more num">+{extra}</span>}
        </div>
        <p className="acct-order__items">
          {order.items.length ? order.items.map((item, i) => (
            <span key={item.id || i}>{i > 0 && '، '}<Highlight text={item.product_name} query={query} />{item.quantity > 1 && <> × <span className="num">{item.quantity}</span></>}</span>
          )) : <span className="text-[var(--text-3)]">تفاصيل المنتجات داخل الطلب</span>}
        </p>
      </div>

      <OrderProgress status={order.status} />

      {order.status === 'pending' && (
        <p className="acct-note"><Icon name="clock" className="size-4 shrink-0 mt-0.5" />نراجع طلبكِ الآن، ويصلكِ التأكيد عادةً خلال <span className="num">{acceptanceMinutes}</span> دقيقة.</p>
      )}
      {order.status === 'shipped' && order.delivery_pin && (
        <p className="acct-note acct-note--pin"><Icon name="shield" className="size-4 shrink-0 mt-0.5" /><span>رمز الاستلام <b className="num" dir="ltr">{order.delivery_pin}</b> — أعطيه للمندوب عند استلام الطلب فقط.</span></p>
      )}

      <footer className="acct-order__foot">
        <div className="acct-order__total"><span>الإجمالي</span><strong className="num">{formatPrice(order.total)}</strong></div>
        <div className="acct-order__actions">
          {help && <a className="btn-ghost" href={help} target="_blank" rel="noopener noreferrer" aria-label={`مساعدة بخصوص الطلب ${order.order_number} عبر واتساب`}>مساعدة</a>}
          <Link className="btn-primary" to={orderPath(order)}>تفاصيل الطلب</Link>
        </div>
      </footer>
    </article>
  )
}
