import { t } from '../../i18n'
import type { PaymentMethodCode, PaymentMethodOption } from '../../types/api'

type Props = {
  options: PaymentMethodOption[]
  value: PaymentMethodCode
  onChange: (value: PaymentMethodCode) => void
  disabled?: boolean
}

const HINT: Record<PaymentMethodCode, string> = {
  cod: 'ادفعي نقداً للمندوب بعد فحص طلبك',
  jawwal_pay: 'ادفعي من محفظتك الإلكترونية',
}

const NOTE: Record<PaymentMethodCode, string> = {
  cod: 'ستحصلين على كود تسليم من 4 أرقام — أعطيه للمندوب فقط بعد استلام طلبك وفحصه.',
  jawwal_pay: 'بعد إنشاء الطلب أدخلي مرجع عملية جوال باي. لا تُدخلي رمز المحفظة أو رمز التحقق هنا أبداً.',
}

/** P1-FE-02 · D-01 — خيارات الدفع من الخادم (checkout/begin → payment_methods) */
export function PaymentMethodPicker({ options, value, onChange, disabled }: Props) {
  const selected = options.find(o => o.code === value)
  return (
    <fieldset className="payment-picker" aria-describedby="payment-picker-note" disabled={disabled}>
      <legend className="sr-only">{t('طريقة الدفع')}</legend>
      {options.map(o => (
        <label key={o.code} className={'payment-picker__option' + (value === o.code ? ' is-selected' : '')}>
          <input type="radio" name="payment_method" value={o.code} checked={value === o.code} onChange={() => onChange(o.code)} />
          {o.code === 'jawwal_pay'
            ? <span className="payment-picker__logo"><img src="/payments/jawwal-pay.png" alt="" width="96" height="48" /></span>
            : <span className="payment-picker__icon" aria-hidden="true">💵</span>}
          <span className="payment-picker__copy">
            <strong>{t(o.label)}{o.is_sandbox && <span className="payment-picker__badge">{t('تجريبي')}</span>}</strong>
            <span>{t(HINT[o.code])}</span>
          </span>
          <span className="payment-picker__check" aria-hidden="true">✓</span>
        </label>
      ))}
      <p id="payment-picker-note" className="payment-picker__note">
        {selected?.is_sandbox && <b>{t('وضع تجريبي — لا تُخصم أموال حقيقية.')} </b>}
        {t(NOTE[value])}
      </p>
    </fieldset>
  )
}
