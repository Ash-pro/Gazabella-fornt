import { t } from '../../i18n'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { formatEta } from '../../content/storeInfo'
import { useAccountOrders, orderPath } from '../../hooks/useAccountOrders'
import { useReveal } from '../../hooks/useReveal'
import { useStoreInfo } from '../../hooks/useStoreInfo'
import { getImageUrl } from '../../lib/apiClient'
import { formatPrice } from '../../lib/format'
import { orderGroup } from '../../lib/orderSearch'
import { useAuthStore } from '../../stores/authStore'
import type { TrustItem } from '../../types/api'
import { ReorderButton } from '../account/ReorderButton'
import { Icon } from '../ui/Icon'

// ─────────────────────────────── N-01 شريط الثقة ───────────────────────────────

/** يجيب أسئلة الزبونة الجديدة قبل التمرير: متى يصل؟ متى أدفع؟ ماذا لو لم يعجبني؟ — نصوص الإدارة أولاً ثم بيانات الإعدادات */
export function TrustStrip() {
  const store = useStoreInfo()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings })
  let items: TrustItem[] = settings?.home?.trust ?? []
  if (!items.length) {
    const fastest = [...store.deliveryZones].filter((z) => z.etaMinutes).sort((a, b) => a.etaMinutes! - b.etaMinutes!)[0]
    items = [
      fastest
        ? { icon: 'truck', title: t('توصيل {eta}', { eta: formatEta(fastest.etaMinutes) }), text: t('داخل {zone}', { zone: fastest.name }) }
        : { icon: 'truck', title: t('توصيل للبيت'), text: t('رسوم التوصيل تبدأ من {fee}', { fee: formatPrice(store.minDeliveryFee) }) },
      ...(store.codAvailable ? [{ icon: 'shield' as const, title: t('ادفعي بعد ما تفحصي'), text: t('نقداً للمندوب عند الاستلام') }] : []),
      { icon: 'refresh', title: t('استرجاع خلال {n} أيام', { n: store.returnWindowDays }), text: t('للمنتج المغلق وغير المستخدم') },
    ]
  }
  if (items.length < 2) return null
  return (
    <ul className="container-page hm-trust" aria-label={t('لماذا Gazabella')}>
      {items.map((item) => (
        <li key={item.title}>
          <Icon name={item.icon} className="size-5" />
          <span><b>{item.title}</b>{item.text && <small>{item.text}</small>}</span>
        </li>
      ))}
    </ul>
  )
}

// ─────────────────────────────── N-06 اطلبيها مرة أخرى ───────────────────────────────

export function ReorderRow() {
  const token = useAuthStore((s) => s.token)
  return token ? <ReorderInner /> : null
}

function ReorderInner() {
  const reveal = useReveal<HTMLElement>()
  const query = useAccountOrders()
  const past = (query.data?.orders ?? []).filter((o) => orderGroup(o.status) === 'delivered' && o.items.length).slice(0, 3)
  if (!past.length) return null
  return (
    <section ref={reveal} className="container-page hm-section" aria-labelledby="hm-reorder-title">
      <header className="hm-head"><div><p className="hm-kicker">{t('من طلباتكِ السابقة')}</p><h2 id="hm-reorder-title">{t('اطلبيها مرة أخرى')}</h2></div><Link className="hm-more" to="/orders">{t('كل الطلبات')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link></header>
      <ul className="hm-reorder">
        {past.map((order) => {
          const img = getImageUrl(order.items[0]?.image_url)
          return (
            <li key={order.id}>
              <span className="hm-reorder__thumb" aria-hidden="true">{img ? <img src={img} alt="" loading="lazy" /> : <Icon name="package" className="size-5" />}</span>
              <span className="hm-reorder__text">
                <Link to={orderPath(order)}>{order.items.map((i) => i.product_name).filter(Boolean).slice(0, 2).join(t('، '))}{order.items.length > 2 && ' …'}</Link>
                <small className="num">{formatPrice(order.total)}</small>
              </span>
              <ReorderButton order={order} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
