export function JawwalPaymentOption({ sandbox = false }: { sandbox?: boolean }) {
  return <section className="jawwal-payment" aria-labelledby="payment-heading">
    <div className="jawwal-payment__heading"><h2 id="payment-heading">الدفع الإلكتروني</h2><span>الخيار المتاح حاليًا</span></div>
    <label className="jawwal-payment__option">
      <input type="radio" name="payment_method" value="jawwal_pay" checked readOnly aria-describedby="jawwal-payment-note" />
      <span className="jawwal-payment__logo"><img src="/payments/jawwal-pay.png" alt="Jawwal Pay" width="130" height="64" /></span>
      <span className="jawwal-payment__copy"><strong>جوال باي</strong><span>ادفعي باستخدام محفظتكِ الإلكترونية</span></span>
      <span className="jawwal-payment__selected" aria-hidden="true">✓</span>
    </label>
    <p id="jawwal-payment-note" className="jawwal-payment__note">{sandbox ? 'الدفع حاليًا في وضع الاختبار، ولا تُخصم أموال حقيقية.' : 'بعد إنشاء الطلب، أدخلي مرجع عملية جوال باي للتحقق من الدفع. لا تدخلي رمز المحفظة أو رمز التحقق هنا.'}</p>
  </section>
}
