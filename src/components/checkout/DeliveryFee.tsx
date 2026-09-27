import type { DeliveryFeeFields } from '../../types/api'
import { money } from '../../lib/format'

/** D-22 — قيمة رسوم التوصيل: عادية، أو مشطوبة + «مجاني/مخفّض» عند وجود إعفاء من الخادم */
export function DeliveryFeeValue({ fees }: { fees: DeliveryFeeFields }) {
  const waiver = fees.delivery_waiver
  if (!waiver) return <span className="num">{money(fees.delivery_fee)}</span>
  const free = Number(fees.delivery_fee) === 0
  return (
    <span className="delivery-fee">
      <span className="delivery-fee__amount">
        {fees.delivery_fee_original && <s className="delivery-fee__was num" aria-label={'بدلاً من ' + money(fees.delivery_fee_original)}>{money(fees.delivery_fee_original)}</s>}
        {free ? <b className="delivery-fee__free">مجاني</b> : <span className="num">{money(fees.delivery_fee)}</span>}
      </span>
      <span className={'delivery-waiver delivery-waiver--' + waiver.reason}>{waiver.label}</span>
    </span>
  )
}

/** سطر كامل «التوصيل … القيمة» للملخصات */
export function DeliveryFeeRow({ fees, className = '' }: { fees: DeliveryFeeFields; className?: string }) {
  return (
    <div className={'flex justify-between gap-4 ' + className}>
      <span>التوصيل</span>
      <DeliveryFeeValue fees={fees} />
    </div>
  )
}
