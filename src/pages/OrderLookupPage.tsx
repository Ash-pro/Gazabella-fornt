import { t } from '../i18n'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi } from '../api/gazabella'
import { getApiErrorMessage } from '../lib/apiClient'
import { money } from '../lib/format'

export function OrderLookupPage() {
  const [reference, setReference] = useState('')
  const lookup = useMutation({ mutationFn: () => gazabellaApi.lookupOrderByReference(reference.trim()) })
  return <div className="container-page max-w-3xl py-12"><Link className="text-link" to="/orders">{t('تسجيل الدخول ومتابعة طلباتي')}</Link><h1 className="section-title my-6">{t('البحث بمرجع الدفع')}</h1>
    <form className="checkout-card space-y-4" onSubmit={(event) => { event.preventDefault(); if (reference.trim() && !lookup.isPending) lookup.mutate() }}>
      <label className="field-label block" htmlFor="lookup-reference">{t('مرجع عملية جوال باي')}</label>
      <input className="form-field" id="lookup-reference" value={reference} onChange={(event) => { setReference(event.target.value); lookup.reset() }} dir="ltr" autoComplete="off" required maxLength={255} disabled={lookup.isPending} />
      <p className="text-sm">{t('احتفظي بالمرجع لنفسكِ؛ يتيح الوصول إلى تفاصيل طلبكِ.')}</p>
      <button className="btn-primary" disabled={lookup.isPending || !reference.trim()}>{lookup.isPending ? t('جارٍ البحث…') : t('عرض الطلب')}</button>
      {lookup.isError && <p role="alert" className="field-error">{getApiErrorMessage(lookup.error)}</p>}
    </form>
    {lookup.data && <section className="order-summary mt-6 space-y-3" aria-live="polite"><h2 className="text-lg font-bold">{t('الطلب')} <span dir="ltr">{lookup.data.order_number}</span></h2><p>{t('الإجمالي:')} {money(lookup.data.total)}</p><p>{t('حالة الدفع:')} {lookup.data.payment_status === 'paid' ? t('مدفوع') : lookup.data.payment_status === 'refunded' ? t('مسترد') : t('غير مؤكد')}</p>{lookup.data.items.map((item) => <p key={item.id}>{item.product_name} × {item.quantity}</p>)}</section>}
  </div>
}
