import { t } from '../i18n'
import { ALL_PRODUCTS } from '../lib/routes'
import { Link } from 'react-router-dom'
import { AccountShell } from '../components/account/AccountShell'
import { OrderProgress } from '../components/account/OrderCard'
import { CancelOrderButton } from '../components/account/CancelOrderButton'
import { ReorderButton } from '../components/account/ReorderButton'
import { ErrorState } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { whatsappLink } from '../content/storeInfo'
import { orderPath, useAccountOrders } from '../hooks/useAccountOrders'
import { useStoreInfo } from '../hooks/useStoreInfo'
import { getApiErrorMessage, getImageUrl } from '../lib/apiClient'
import { formatDate, formatPrice } from '../lib/format'
import { orderGroup } from '../lib/orderSearch'
import { orderStatusLabel } from '../lib/orderStatus'
import { useSeo } from '../lib/seo'
import { useWallet } from '../hooks/useWallet'
import type { Order } from '../types/api'

type IconName = Parameters<typeof Icon>[0]['name']

const HINT: Record<string, string> = {
  pending: 'استلمنا طلبكِ ونراجعه الآن — سنؤكده قريباً.',
  confirmed: 'تم تأكيد طلبكِ وسنبدأ تجهيزه.',
  processing: 'نجهّز طلبكِ الآن بعناية.',
  shipped: 'طلبكِ في الطريق مع المندوب.',
}

function Thumbs({ order }: { order: Order }) {
  const items = order.items.slice(0, 3)
  return (
    <div className="acct-thumbs" aria-hidden="true">
      {items.length ? items.map((item, i) => {
        const src = getImageUrl(item.image_url)
        return <span className="acct-thumb" key={item.id || i}>{src ? <img src={src} alt="" loading="lazy" /> : <Icon name="package" className="size-5" />}</span>
      }) : <span className="acct-thumb"><Icon name="package" className="size-5" /></span>}
      {order.items.length > 3 && <span className="acct-thumb acct-thumb--more num">+{order.items.length - 3}</span>}
    </div>
  )
}

/** لوحة العميلة بعد الدخول: الطلب الجاري، اختصارات، وإعادة طلب سريعة */
export function AccountPage() {
  useSeo({ title: t('حسابي'), noindex: true })
  const store = useStoreInfo()
  const query = useAccountOrders()
  const wallet = useWallet()
  const orders = query.data?.orders ?? []
  const active = orders.filter((o) => orderGroup(o.status) === 'active')
  const current = active[0]
  const past = orders.filter((o) => orderGroup(o.status) !== 'active').slice(0, 3)

  const actions: Array<{ to: string; icon: IconName; title: string; text: string; external?: boolean; raw?: boolean }> = [
    { to: '/orders', icon: 'package', title: 'طلباتي', text: 'كل طلباتكِ الجارية والسابقة' },
    { to: '/wallet', icon: 'wallet', title: 'محفظتي', text: wallet.data ? t('الرصيد: {amount}', { amount: formatPrice(wallet.data.balance) }) : 'رصيدكِ وحركاته', raw: !!wallet.data },
    { to: '/profile', icon: 'user', title: 'بياناتي وعنواني', text: 'الاسم، الجوال، وعنوان التوصيل' },
    { to: '/?saved=true#products', icon: 'heart', title: 'المحفوظات', text: 'منتجات حفظتِها لوقت لاحق' },
    ...(store.whatsapp ? [{ to: whatsappLink(store.whatsapp, t('مرحباً Gazabella، أحتاج مساعدة')), icon: 'phone' as IconName, title: 'مساعدة', text: 'راسلينا على واتساب', external: true }] : []),
  ]

  return (
    <AccountShell active="overview" search={{ mode: 'jump' }}>
      <div className="dash">
        <section className="dash-main" aria-labelledby="dash-current">
          <div className="dash-head"><h2 id="dash-current">{current ? t('طلبكِ الجاري') : t('طلباتكِ')}</h2>{active.length > 1 && <Link className="text-link" to="/orders?status=active">{t('كل الجارية ({n})', { n: active.length })}</Link>}</div>
          {query.isLoading ? <div className="dash-card dash-skel" aria-busy="true" />
            : query.isError ? <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
            : current ? (
              <article className="dash-card dash-current">
                <header>
                  <div className="min-w-0">
                    <span className={`status-badge status-${current.status}`}>{orderStatusLabel(current.status)}</span>
                    <p className="dash-current__hint">{t(HINT[current.status] ?? 'نتابع طلبكِ وسنحدّث حالته هنا.')}</p>
                  </div>
                  <Thumbs order={current} />
                </header>
                <OrderProgress status={current.status} />
                <footer>
                  <p><bdi className="num" dir="ltr">{current.order_number}</bdi> · <span className="num">{formatDate(current.created_at, { day: 'numeric', month: 'short' })}</span> · <b className="num">{formatPrice(current.total)}</b></p>
                  <CancelOrderButton order={current} /><Link className="btn-primary" to={orderPath(current)}>{t('تابعي الطلب')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>
                </footer>
              </article>
            ) : (
              <div className="dash-card dash-empty">
                <span className="trk-badge"><Icon name="bag" className="size-7" /></span>
                <b>{orders.length ? t('لا طلبات جارية الآن') : t('لم تطلبي بعد')}</b>
                <p>{orders.length ? t('جاهزة لطلب جديد؟ اكتشفي ما وصل حديثاً.') : t('ابدئي بأول طلب — التوصيل للبيت والدفع عند الاستلام.')}</p>
                <Link className="btn-primary" to={ALL_PRODUCTS}>{t('تسوّقي الآن')}</Link>
              </div>
            )}

          {past.length > 0 && (
            <>
              <div className="dash-head"><h2>{t('اطلبيها مرة أخرى')}</h2><Link className="text-link" to="/orders">{t('كل الطلبات')}</Link></div>
              <ul className="dash-past">
                {past.map((order) => (
                  <li key={order.id} className="dash-card">
                    <Thumbs order={order} />
                    <div className="dash-past__text">
                      <Link to={orderPath(order)}>{order.items.map((i) => i.product_name).filter(Boolean).slice(0, 2).join(t('، ')) || order.order_number}{order.items.length > 2 && ' …'}</Link>
                      <small><span className="num">{formatDate(order.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span> · {orderStatusLabel(order.status)} · <span className="num">{formatPrice(order.total)}</span></small>
                    </div>
                    <div className="dash-past__action"><ReorderButton order={order} /></div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <nav className="dash-actions" aria-label={t('اختصارات الحساب')}>
          {actions.map((a) => {
            const body = <><span><Icon name={a.icon} className="size-5" /></span><div><b>{t(a.title)}</b><small>{a.raw ? a.text : t(a.text)}</small></div><Icon name="arrow" className="size-4 rtl:rotate-180" /></>
            return a.external
              ? <a key={a.title} className="dash-action" href={a.to} target="_blank" rel="noopener noreferrer">{body}</a>
              : <Link key={a.title} className="dash-action" to={a.to}>{body}</Link>
          })}
        </nav>
      </div>
    </AccountShell>
  )
}
