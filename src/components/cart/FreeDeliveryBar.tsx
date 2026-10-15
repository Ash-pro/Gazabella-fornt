import { t } from '../../i18n'
import { DEMO_FREE_DELIVERY_THRESHOLD } from '../../fixtures/cartExtras'
import { useStoreInfo } from '../../hooks/useStoreInfo'
import { demoFixtures } from '../../lib/demo'
import { formatPrice } from '../../lib/format'
import { DemoBadge } from '../ui/DemoBadge'
import { Icon } from '../ui/Icon'

/**
 * P2-1 «باقيلكِ ₪X للتوصيل المجاني» — الحد من policies.free_delivery_threshold ويُقارن بقيمة المنتجات قبل الخصم
 * (نفس منطق الخادم). في وضع العرض فقط: حد تجريبي موسوم إن لم يضبطه الخادم.
 */
export function FreeDeliveryBar({ subtotal, compact = false }: { subtotal: number; compact?: boolean }) {
  const store = useStoreInfo()
  const real = store.freeDeliveryThreshold
  const threshold = real ?? (demoFixtures() ? DEMO_FREE_DELIVERY_THRESHOLD : null)
  if (!threshold || subtotal <= 0) return null
  const left = Math.max(0, threshold - subtotal)
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100))
  return (
    <div className={`free-bar${left === 0 ? ' is-done' : ''}${compact ? ' free-bar--compact' : ''}`} role="status">
      <p>
        <Icon name={left === 0 ? 'check' : 'truck'} className="size-4 shrink-0" />
        {left === 0
          ? <b>{t('توصيلكِ مجاني!')}</b>
          : <span>{t('باقيلكِ')} <b className="num">{formatPrice(left)}</b> {t('للتوصيل المجاني')}</span>}
        <DemoBadge show={real == null} />
      </p>
      <span className="free-bar__track" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
    </div>
  )
}
