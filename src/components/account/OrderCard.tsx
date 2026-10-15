import { t } from '../../i18n'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Order } from '../../types/api'
import { getImageUrl } from '../../lib/apiClient'
import { formatDate, formatPrice } from '../../lib/format'
import { orderStatusLabel, paymentMethodLabel } from '../../lib/orderStatus'
import { ORDER_STEPS, orderStepIndex } from '../../lib/orderSearch'
import { orderPath } from '../../hooks/useAccountOrders'
import { whatsappLink } from '../../content/storeInfo'
import { Icon } from '../ui/Icon'
import { ReorderButton } from './ReorderButton'
import { CancelOrderButton } from './CancelOrderButton'
import { orderGroup } from '../../lib/orderSearch'


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
    <button type="button" className="acct-copy" aria-label={copied ? t('تم النسخ') : t('نسخ رقم الطلب {value}', { value: value })}
      onClick={() => { void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }) }}>
      <Icon name={copied ? 'check' : 'clipboard'} className="size-4" />
    </button>
  )
}

export function OrderProgress({ status }: { status: string }) {
  const current = orderStepIndex(status)
  if (current < 0) return null
  return (
    <ol className="acct-progress" aria-label={t('مرحلة الطلب: {v1}', { v1: orderStatusLabel(status) })}>
      {ORDER_STEPS.map((step, i) => (
        <li key={step.status} className={i < current ? 'done' : i === current ? (status === 'delivered' ? 'done current' : 'current') : undefined} aria-current={i === current ? 'step' : undefined}>
          <span>{t(step.label)}</span>
        </li>
      ))}
    </ol>
  )
}

const STEP_ICONS = ['clock', 'check', 'package', 'truck', 'sparkle'] as const
const VISIBLE_ITEMS = 2

/** شريط حالة مختصر داخل البطاقة: أيقونة + اسم المرحلة + «الخطوة س من 5» + شريط مقسّم */
function OrderStatusTrack({ status, note }: { status: string; note?: ReactNode }) {
  const current = orderStepIndex(status)
  const cancelled = current < 0
  const tone = cancelled ? 'cancelled' : status === 'delivered' ? 'done' : status === 'pending' ? 'waiting' : 'moving'
  return (
    <div className={`ocard-track ocard-track--${tone}`}>
      <div className="ocard-track__row">
        <span className="ocard-track__icon" aria-hidden="true"><Icon name={cancelled ? 'close' : STEP_ICONS[current]} className="size-4" /></span>
        <div className="ocard-track__text">
          <b>{orderStatusLabel(status)}</b>
          {!cancelled && <small>{t('الخطوة {n} من {total}', { n: current + 1, total: ORDER_STEPS.length })}{current < ORDER_STEPS.length - 1 && <> · {t('التالي: {step}', { step: t(ORDER_STEPS[current + 1].label) })}</>}</small>}
        </div>
      </div>
      {!cancelled && (
        <ol className="ocard-track__bar" aria-label={t('مرحلة الطلب: {v1}', { v1: orderStatusLabel(status) })}>
          {ORDER_STEPS.map((step, i) => <li key={step.status} className={i < current || status === 'delivered' ? 'is-done' : i === current ? 'is-current' : undefined} aria-current={i === current ? 'step' : undefined}><span className="sr-only">{t(step.label)}</span></li>)}
        </ol>
      )}
      {note && <p className="ocard-track__note">{note}</p>}
    </div>
  )
}

export function OrderCard({ order, query, whatsapp, acceptanceMinutes }: { order: Order; query: string; whatsapp: string | null; acceptanceMinutes: number }) {
  const created = new Date(order.created_at)
  const count = order.items_count ?? order.items.reduce((n, i) => n + (i.quantity || 1), 0)
  const q = query.trim().toLowerCase()
  // عند البحث: المنتج المطابق يظهر أولاً حتى لو كان الثالث في الطلب
  const items = q ? [...order.items].sort((a, b) => Number(b.product_name.toLowerCase().includes(q)) - Number(a.product_name.toLowerCase().includes(q))) : order.items
  const shown = items.slice(0, VISIBLE_ITEMS)
  const hidden = order.items.length - shown.length
  const help = whatsapp ? whatsappLink(whatsapp, t('مرحباً Gazabella، أستفسر عن طلبي رقم {order_number}', { order_number: order.order_number })) : null
  const validDate = !Number.isNaN(created.getTime())

  const note = order.status === 'pending'
    ? <><Icon name="clock" className="size-4 shrink-0" /><span>{t('نراجع طلبكِ الآن، ويصلكِ التأكيد عادةً خلال')} <span className="num">{acceptanceMinutes}</span> {t('دقيقة.')}</span></>
    : order.status === 'shipped' && order.delivery_pin
      ? <><Icon name="shield" className="size-4 shrink-0" /><span>{t('رمز الاستلام')} <b className="num" dir="ltr">{order.delivery_pin}</b> {t('— أعطيه للمندوب عند استلام الطلب فقط.')}</span></>
      : undefined

  return (
    <article className="acct-order ocard" aria-labelledby={`order-${order.id}`}>
      <header className="ocard__head">
        <div className="min-w-0">
          <p className="ocard__label">{t('رقم الطلب')}</p>
          <p className="acct-order__number" id={`order-${order.id}`}>
            <span className="num" dir="ltr"><Highlight text={order.order_number} query={query} /></span>
            <CopyNumber value={order.order_number} />
          </p>
        </div>
        <span className={`status-badge status-${order.status}`}>{orderStatusLabel(order.status)}</span>
      </header>

      <ul className="ocard__meta">
        {validDate && <li><Icon name="clock" className="size-3.5" /><span className="num">{formatDate(created, { day: 'numeric', month: 'short' })}</span> · <span className="num">{formatDate(created, { hour: 'numeric', minute: '2-digit' })}</span></li>}
        <li><Icon name="bag" className="size-3.5" /><span className="num">{count}</span> {count === 1 ? t('منتج') : t('منتجات')}</li>
        {order.payment_method && <li><Icon name="wallet" className="size-3.5" />{paymentMethodLabel(order.payment_method)}</li>}
      </ul>

      <OrderStatusTrack status={order.status} note={note} />

      <ul className="ocard__items">
        {shown.length ? shown.map((item, i) => {
          const src = getImageUrl(item.image_url)
          return (
            <li key={item.id || i}>
              <span className="ocard__thumb">{src ? <img src={src} alt="" loading="lazy" /> : <Icon name="package" className="size-5" />}</span>
              <span className="ocard__name">
                <b><Highlight text={item.product_name} query={query} /></b>
                {item.variant_name && <small>{item.variant_name}</small>}
              </span>
              <span className="ocard__qty num" aria-label={t('الكمية {n}', { n: item.quantity })}>×{item.quantity}</span>
            </li>
          )
        }) : <li className="ocard__empty"><Icon name="package" className="size-5" /> {t('تفاصيل المنتجات داخل الطلب')}</li>}
        {hidden > 0 && <li className="ocard__more"><Link to={orderPath(order)}>{t('+ {n} منتجات أخرى في الطلب', { n: hidden })}</Link></li>}
      </ul>

      <footer className="ocard__foot">
        <div className="ocard__total">
          <span>{t('الإجمالي')}</span>
          <strong className="num">{formatPrice(order.total)}</strong>
        </div>
        <div className="ocard__actions">
          <CancelOrderButton order={order} />
          {orderGroup(order.status) !== 'active' && <ReorderButton order={order} />}
          <Link className="btn-primary ocard__details" to={orderPath(order)}>{t('تفاصيل الطلب')} <Icon name="chevron" className="size-4 ocard__chev" /></Link>
        </div>
        {help && <a className="ocard__help" href={help} target="_blank" rel="noopener noreferrer" aria-label={t('مساعدة بخصوص الطلب {order_number} عبر واتساب', { order_number: order.order_number })}><Icon name="whatsapp" className="size-4" />{t('مساعدة عبر واتساب')}</a>}
      </footer>
    </article>
  )
}
