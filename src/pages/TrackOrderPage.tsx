import { t } from '../i18n'
import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { gazabellaApi, TrackError } from '../api/gazabella'
import { getApiErrorMessage, getImageUrl } from '../lib/apiClient'
import { formatDate, formatPrice } from '../lib/format'
import { loadLastOrder, maskPhone } from '../lib/lastOrder'
import { orderStatusLabel, paymentMethodLabel } from '../lib/orderStatus'
import { orderStepIndex } from '../lib/orderSearch'
import { cleanOrderNumber, isTrackablePhone, trackedFromOrder, type TrackedOrder } from '../lib/orderTracking'
import { whatsappLink } from '../content/storeInfo'
import { useStoreInfo } from '../hooks/useStoreInfo'
import { useAuthStore } from '../stores/authStore'
import { useSeo } from '../lib/seo'
import { track } from '../lib/analytics'
import { OrderProgress } from '../components/account/OrderCard'
import { Icon } from '../components/ui/Icon'

type IconName = Parameters<typeof Icon>[0]['name']

/** جملة واحدة تشرح للعميلة ماذا يحدث الآن وماذا عليها */
const STATUS_HINT: Record<string, string> = {
  pending: 'استلمنا طلبكِ ونراجعه الآن — سنؤكده قريباً.',
  confirmed: 'تم تأكيد طلبكِ وسنبدأ تجهيزه.',
  processing: 'نجهّز طلبكِ الآن بعناية.',
  shipped: 'طلبكِ في الطريق مع المندوب.',
  delivered: 'تم تسليم طلبكِ. نتمنى أن ينال إعجابكِ!',
  cancelled: 'تم إلغاء هذا الطلب. للاستفسار تواصلي معنا.',
  refunded: 'تم استرداد قيمة هذا الطلب.',
}
const STATUS_ICON: Record<string, IconName> = { pending: 'clock', confirmed: 'check', processing: 'package', shipped: 'truck', delivered: 'check', cancelled: 'alert', refunded: 'refresh' }

const TIPS: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'clipboard', title: 'أين أجد رقم الطلب؟', text: 'يظهر في صفحة الشكر بعد إتمام الطلب، ويبدأ بـ GZ.' },
  { icon: 'phone', title: 'أي رقم جوال؟', text: 'نفس الرقم الذي أدخلتِه عند الطلب.' },
  { icon: 'shield', title: 'بدون تسجيل وبدون كود', text: 'الرقمان معاً يكفيان، ولا نعرض عنوانكِ هنا حفاظاً على خصوصيتكِ.' },
]

function errorText(error: unknown): string {
  if (error instanceof TrackError) {
    if (error.kind === 'not_found') return t('لم نجد طلباً بهذه البيانات. تأكدي من رقم الطلب ورقم الجوال.')
    if (error.kind === 'rate_limited') return t('محاولات كثيرة. انتظري دقيقة ثم حاولي مجدداً.')
    return t('التتبع السريع يُفعَّل قريباً. يمكنكِ الآن متابعة طلبكِ بتسجيل الدخول برقم جوالكِ.')
  }
  return getApiErrorMessage(error)
}

export function TrackOrderPage() {
  useSeo({ title: t('تتبع الطلب'), description: t('تتبّعي حالة طلبكِ من Gazabella برقم الطلب ورقم الجوال — بدون تسجيل دخول.') })
  const [params, setParams] = useSearchParams()
  const store = useStoreInfo()
  const loggedIn = useAuthStore((s) => !!s.token)

  // من صفحة الشكر على نفس الجهاز: نعبّئ ونعرض مباشرة بدون أي كتابة
  const [saved] = useState(loadLastOrder)
  const paramNumber = cleanOrderNumber(params.get('order') ?? '')
  const savedMatches = !!saved && (!paramNumber || paramNumber === saved.order.order_number.toUpperCase())
  const [number, setNumber] = useState(paramNumber || (savedMatches ? saved.order.order_number : ''))
  const [phone, setPhone] = useState(savedMatches ? saved.phone : '')
  const [lookup, setLookup] = useState<{ number: string; phone: string } | null>(savedMatches ? { number: saved.order.order_number.toUpperCase(), phone: saved.phone } : null)
  const [touched, setTouched] = useState(false)

  const query = useQuery({
    queryKey: ['track', lookup?.number, lookup?.phone],
    queryFn: () => gazabellaApi.trackOrder(lookup!.number, lookup!.phone),
    enabled: !!lookup,
    retry: false,
    staleTime: 20_000,
    gcTime: 60_000,
    refetchInterval: (q) => (q.state.data && orderStepIndex(q.state.data.status) >= 0 && q.state.data.status !== 'delivered' && !q.state.data.local ? 60_000 : false),
  })
  // أثناء أول تحميل نعرض اللقطة المحفوظة فوراً بدل هيكل فارغ
  const snapshot = lookup && saved && saved.order.order_number.toUpperCase() === lookup.number ? trackedFromOrder(saved.order, true) : null
  const order: TrackedOrder | null = query.data ?? (query.isPending && lookup ? snapshot : null)

  const numberOk = cleanOrderNumber(number).length >= 6
  const phoneOk = isTrackablePhone(phone)

  function submit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!numberOk || !phoneOk) return
    const clean = cleanOrderNumber(number)
    setNumber(clean)
    setParams({ order: clean }, { replace: true })
    track('order_track', { source: 'form' })
    if (lookup?.number === clean && lookup.phone === phone) void query.refetch()
    else setLookup({ number: clean, phone })
  }

  function reset() {
    setLookup(null); setNumber(''); setPhone(''); setTouched(false)
    setParams({}, { replace: true })
  }

  if (order) return <Result order={order} phone={lookup?.phone ?? ''} refreshing={query.isFetching} onRefresh={() => void query.refetch()} onReset={reset} whatsapp={store.whatsapp} loggedIn={loggedIn} />

  return (
    <div className="container-page trk-page">
      <div className="trk-layout">
        <section className="trk-card trk-form-card" aria-labelledby="trk-title">
          <span className="trk-badge"><Icon name="package" className="size-7" /></span>
          <span className="eyebrow">{t('بدون تسجيل دخول')}</span>
          <h1 id="trk-title">{t('تتبّعي طلبكِ')}</h1>
          <p className="trk-lead">{t('أدخلي رقم الطلب ورقم الجوال الذي طلبتِ به، وشاهدي أين وصل طلبكِ الآن.')}</p>

          <form onSubmit={submit} noValidate>
            <label className="field-label" htmlFor="trk-number">{t('رقم الطلب')}</label>
            <div className="trk-input">
              <Icon name="clipboard" className="size-5" />
              <input id="trk-number" dir="ltr" className="num" inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={32}
                placeholder="GZ-000000-XXXXXX" value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())}
                aria-invalid={touched && !numberOk} aria-describedby={touched && !numberOk ? 'trk-number-error' : undefined} />
            </div>
            {touched && !numberOk && <p className="field-error" id="trk-number-error" role="alert">{t('أدخلي رقم الطلب كما ظهر في صفحة الشكر.')}</p>}

            <label className="field-label" htmlFor="trk-phone">{t('رقم الجوال')}</label>
            <div className="trk-input">
              <Icon name="phone" className="size-5" />
              <input id="trk-phone" dir="ltr" className="num" type="tel" inputMode="tel" autoComplete="tel" maxLength={18}
                placeholder="05XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)}
                aria-invalid={touched && !phoneOk} aria-describedby={touched && !phoneOk ? 'trk-phone-error' : undefined} />
            </div>
            {touched && !phoneOk && <p className="field-error" id="trk-phone-error" role="alert">{t('أدخلي رقم الجوال الذي طلبتِ به.')}</p>}

            {query.isError && lookup && (
              <div className="trk-error" role="alert">
                <Icon name="alert" className="size-5 shrink-0" />
                <div>
                  <p>{errorText(query.error)}</p>
                  {query.error instanceof TrackError && query.error.kind === 'unavailable' && <Link className="text-link" to="/auth?next=%2Forders">{t('تسجيل الدخول لمتابعة طلباتي')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>}
                </div>
              </div>
            )}

            <button className="btn-primary w-full" disabled={query.isFetching}>
              {query.isFetching ? t('نبحث عن طلبكِ…') : <>{t('تتبّعي الطلب')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></>}
            </button>
          </form>

          <p className="trk-alt">{loggedIn ? <Link className="text-link" to="/orders">{t('عرض كل طلباتي')}</Link> : <>{t('لديكِ حساب؟')} <Link className="text-link" to="/auth?next=%2Forders">{t('سجّلي الدخول لرؤية كل طلباتكِ')}</Link></>}</p>
        </section>

        <aside className="trk-tips" aria-label={t('مساعدة في التتبع')}>
          {TIPS.map((tip) => (
            <div key={tip.title} className="trk-tip">
              <span><Icon name={tip.icon} className="size-5" /></span>
              <div><b>{t(tip.title)}</b><p>{t(tip.text)}</p></div>
            </div>
          ))}
          {store.whatsapp && <a className="trk-help" href={whatsappLink(store.whatsapp, t('مرحباً Gazabella، أحتاج مساعدة في تتبع طلبي'))} target="_blank" rel="noopener noreferrer" onClick={() => track('contact', { channel: 'whatsapp', page: 'track' })}>{t('لم تجدي رقم الطلب؟ راسلينا على واتساب')}</a>}
        </aside>
      </div>
    </div>
  )
}

function Result({ order, phone, refreshing, onRefresh, onReset, whatsapp, loggedIn }: { order: TrackedOrder; phone: string; refreshing: boolean; onRefresh: () => void; onReset: () => void; whatsapp: string | null; loggedIn: boolean }) {
  const [copied, setCopied] = useState(false)
  const cancelled = orderStepIndex(order.status) < 0
  const delivered = order.status === 'delivered'
  const tone = cancelled ? 'is-cancelled' : delivered ? 'is-done' : 'is-active'
  const help = whatsapp ? whatsappLink(whatsapp, t('مرحباً Gazabella، أستفسر عن طلبي رقم {order_number}', { order_number: order.order_number })) : null
  const timeline = [...order.tracking].filter((s) => s.created_at).reverse()

  return (
    <div className="container-page trk-page">
      <section className={`trk-card trk-status ${tone}`} aria-labelledby="trk-status-title" aria-busy={refreshing}>
        <div className="trk-status__head">
          <span className="trk-badge"><Icon name={STATUS_ICON[order.status] ?? 'package'} className="size-7" /></span>
          <div className="trk-status__text">
            <span className="eyebrow">{t('حالة الطلب')}</span>
            <h1 id="trk-status-title">{orderStatusLabel(order.status)}</h1>
            <p>{t(STATUS_HINT[order.status] ?? 'نتابع طلبكِ وسنحدّث حالته هنا.')}</p>
          </div>
          <button type="button" className="trk-refresh" onClick={onRefresh} disabled={refreshing} aria-label={t('تحديث الحالة')}><Icon name="refresh" className={`size-4 ${refreshing ? 'animate-spin' : ''}`} /><span>{t('تحديث')}</span></button>
        </div>

        <OrderProgress status={order.status} />

        <dl className="trk-meta">
          <div><dt>{t('رقم الطلب')}</dt><dd><bdi className="num" dir="ltr">{order.order_number}</bdi>
            <button type="button" className="acct-copy" aria-label={copied ? t('تم النسخ') : t('نسخ رقم الطلب {value}', { value: order.order_number })} onClick={() => { void navigator.clipboard?.writeText(order.order_number).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }) }}><Icon name={copied ? 'check' : 'clipboard'} className="size-4" /></button></dd></div>
          {order.created_at && <div><dt>{t('تاريخ الطلب')}</dt><dd className="num">{formatDate(order.created_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</dd></div>}
          {order.zone && <div><dt>{t('التوصيل إلى')}</dt><dd>{order.zone}</dd></div>}
          {order.payment_method && <div><dt>{t('الدفع')}</dt><dd>{paymentMethodLabel(order.payment_method)}</dd></div>}
          <div><dt>{t('الإجمالي')}</dt><dd className="num trk-total">{formatPrice(order.total)}</dd></div>
        </dl>

        {order.local && <p className="trk-note"><Icon name="clock" className="size-4 shrink-0" />{t('هذه آخر حالة محفوظة على جهازكِ. اضغطي «تحديث» لأحدث حالة.')}</p>}
      </section>

      <div className="trk-grid">
        <section className="trk-card" aria-labelledby="trk-items-title">
          <h2 id="trk-items-title">{t('محتويات الطلب')} <small className="num">({order.items_count})</small></h2>
          <ul className="trk-items">
            {order.items.map((item, i) => (
              <li key={i}>
                <span className="trk-thumb">{item.image_url ? <img src={getImageUrl(item.image_url) ?? undefined} alt="" loading="lazy" /> : <Icon name="package" className="size-5" />}</span>
                <span className="trk-item-name">{item.product_name}<small className="num">× {item.quantity}</small></span>
                <b className="num">{formatPrice(item.subtotal)}</b>
              </li>
            ))}
          </ul>
          <dl className="trk-sums">
            <div><dt>{t('المجموع الفرعي')}</dt><dd className="num">{formatPrice(order.subtotal)}</dd></div>
            <div><dt>{t('التوصيل')}</dt><dd className="num">{formatPrice(order.delivery_fee)}</dd></div>
            <div className="trk-sums__total"><dt>{t('الإجمالي')}</dt><dd className="num">{formatPrice(order.total)}</dd></div>
          </dl>
        </section>

        <div className="trk-side">
          {timeline.length > 0 && (
            <section className="trk-card" aria-labelledby="trk-timeline-title">
              <h2 id="trk-timeline-title">{t('سجل الطلب')}</h2>
              <ol className="trk-timeline">
                {timeline.map((step, i) => (
                  <li key={i} className={i === 0 ? 'current' : undefined}>
                    <b>{step.label || orderStatusLabel(step.status)}</b>
                    <time className="num" dateTime={step.created_at}>{formatDate(step.created_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time>
                    {step.note && <p>{step.note}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="trk-card trk-actions" aria-label={t('إجراءات')}>
            {help && <a className="btn-primary w-full" href={help} target="_blank" rel="noopener noreferrer" onClick={() => track('contact', { channel: 'whatsapp', page: 'track' })}>{t('استفسري عن الطلب على واتساب')}</a>}
            <Link className="btn-ghost w-full" to="/">{t('متابعة التسوق')}</Link>
            <button type="button" className="text-link" onClick={onReset}>{t('تتبّع طلب آخر')}</button>
            {!loggedIn && <p className="trk-hint"><Icon name="shield" className="size-4 shrink-0 mt-0.5" /><span>{phone ? <>{t('نعرض هنا ملخصاً فقط للرقم')} <bdi className="num" dir="ltr">{maskPhone(phone)}</bdi>. </> : null}{t('للعنوان ورمز الاستلام')} <Link className="text-link" to="/auth?next=%2Forders&from=order">{t('سجّلي الدخول')}</Link>.</span></p>}
          </section>
        </div>
      </div>
    </div>
  )
}
