import { t } from '../../i18n'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createStockAlert } from '../../api/productExtras'
import { getApiErrorMessage } from '../../lib/apiClient'
import { phoneDigits } from '../../lib/orderTracking'
import { normalizePhone } from '../../lib/format'
import { track } from '../../lib/analytics'
import { useAuthStore } from '../../stores/authStore'
import { DemoBadge } from '../ui/DemoBadge'
import { Icon } from '../ui/Icon'

/** جوال فلسطيني: 059/056 أو ‎+970/972‎ */
const isMobile = (v: string) => /^(?:970|972|0)?5[69]\d{7}$/.test(phoneDigits(v))

/** P1-4 «نبّهيني لما يتوفر» — يظهر مكان الكمية عند نفاد المنتج أو المتغير المختار */
export function BackInStock({ slug, variantId }: { slug: string; variantId?: number }) {
  const user = useAuthStore((s) => s.user)
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [touched, setTouched] = useState(false)
  const alert = useMutation({
    mutationFn: () => createStockAlert(slug, { phone: normalizePhone(phone), ...(variantId ? { variant_id: variantId } : {}) }),
    onSuccess: () => track('stock_alert', { slug }),
  })
  const valid = isMobile(phone)

  if (alert.isSuccess) return (
    <p className="stock-alert stock-alert--done" role="status"><Icon name="check" className="size-5" /> <span>{t('تمام! بنرسلكِ رسالة أول ما يتوفر.')} <DemoBadge show={alert.data.demo} /></span></p>
  )
  return (
    <form className="stock-alert" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (valid && !alert.isPending) alert.mutate() }}>
      <p className="stock-alert__title"><Icon name="bell" className="size-5" /> {t('نفدت الكمية — نبّهيني لما يتوفر')}</p>
      <div className="stock-alert__row">
        <input className="form-field" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="059xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label={t('رقم الجوال')} aria-invalid={touched && !valid} />
        <button type="submit" className="btn-primary" disabled={alert.isPending}>{alert.isPending ? t('جارٍ الحفظ…') : t('نبّهيني')}</button>
      </div>
      {touched && !valid && <p className="field-error" role="alert">{t('أدخلي رقم جوال صحيح يبدأ بـ 059 أو 056.')}</p>}
      {alert.isError && <p className="field-error" role="alert">{getApiErrorMessage(alert.error)}</p>}
      <p className="stock-alert__hint">{t('رسالة واحدة فقط عند التوفر، ولا نستخدم رقمكِ لأي غرض آخر.')}</p>
    </form>
  )
}
