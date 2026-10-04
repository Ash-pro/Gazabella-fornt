import { t } from '../../i18n'
export function JawwalPaymentOption({ sandbox = false }: { sandbox?: boolean }) {
  return <section className="jawwal-payment" aria-labelledby="payment-heading">
    <div className="jawwal-payment__heading"><h2 id="payment-heading">{t('الدفع الإلكتروني')}</h2><span>{t('الخيار المتاح حاليًا')}</span></div>
    <label className="jawwal-payment__option">
      <input type="radio" name="payment_method" value="jawwal_pay" checked readOnly aria-describedby="jawwal-payment-note" />
      <span className="jawwal-payment__logo"><img src="/payments/jawwal-pay.png" alt="Jawwal Pay" width="130" height="64" /></span>
      <span className="jawwal-payment__copy"><strong>{t('جوال باي')}</strong><span>{t('ادفعي باستخدام محفظتكِ الإلكترونية')}</span></span>
      <span className="jawwal-payment__selected" aria-hidden="true">✓</span>
    </label>
    <p id="jawwal-payment-note" className="jawwal-payment__note">{sandbox ? t('الدفع حاليًا في وضع الاختبار، ولا تُخصم أموال حقيقية.') : t('بعد إنشاء الطلب، أدخلي مرجع عملية جوال باي للتحقق من الدفع. لا تدخلي رمز المحفظة أو رمز التحقق هنا.')}</p>
  </section>
}
