import { t } from '../i18n'
import { useEffect, useRef, useState } from 'react'
import { PaymentMethodPicker } from '../components/checkout/PaymentMethodPicker'
import { MOCK_PAYMENT_METHODS, paymentOptionsFromCodes } from '../lib/paymentMethods'
import type { PaymentMethodCode } from '../types/api'
import { isMvp0Api } from '../lib/apiContract'
import { Mvp0CheckoutPage } from './Mvp0CheckoutPage'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LegalConsent } from '../components/checkout/LegalConsent'
import { lineItems, track, trackPurchase } from '../lib/analytics'
import { z } from 'zod'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { getApiErrorMessage, getImageUrl } from '../lib/apiClient'
import { Icon } from '../components/ui/Icon'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import { formatPrice, money } from '../lib/format'
import { useStoreInfo } from '../hooks/useStoreInfo'
import { saveLastOrder } from '../lib/lastOrder'
import { formatEta } from '../content/storeInfo'

// ─── Schema (no email — phone is the primary identifier) ───────────────────
const schema = z.object({
  name: z.string().trim().min(3, 'أدخل اسمك الكامل (٣ أحرف على الأقل)'),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+?(970|972))?0?5\d{8}$/,
      'رقم الجوال غير صحيح — أدخل رقمًا فلسطينيًا بصيغة 05XXXXXXXX',
    ),
  city: z.string().trim().min(2, 'اختاري منطقة التوصيل'),
  neighborhood: z.string().trim().min(2, 'أدخل اسم الحي أو المنطقة'),
  street: z.string().trim().min(3, 'أدخل اسم الشارع أو أقرب معلم'),
  notes: z.string().trim().max(500, 'الملاحظات لا تتجاوز ٥٠٠ حرف').optional(),
})
type Values = z.infer<typeof schema>

// ─── Shared UI helpers ──────────────────────────────────────────────────────

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return <span id={id} aria-live="polite" />
  return (
    <div
      id={id}
      role="alert"
      className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
    >
      <span className="mt-px flex-none text-sm text-red-500">⚠</span>
      <p className="text-sm leading-snug text-red-700">{t(message)}</p>
    </div>
  )
}

type FieldProps = {
  id: string
  label: string
  error?: string
  required?: boolean
  children: (props: { className: string; 'aria-invalid': boolean; 'aria-describedby': string }) => React.ReactNode
}
function Field({ id, label, error, required = true, children }: FieldProps) {
  const hasError = !!error
  const inputClass = [
    'form-field',
    hasError
      ? 'border-red-400 bg-red-50/40 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="ms-1 text-red-500">*</span>}
      </label>
      {children({ className: inputClass, 'aria-invalid': hasError, 'aria-describedby': `${id}-err` })}
      <FieldError id={`${id}-err`} message={error} />
    </div>
  )
}

// Section header with step number
function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-[var(--border)] pb-4">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
        {step}
      </span>
      <h2 className="text-base font-bold text-[var(--text)]">{title}</h2>
    </div>
  )
}

// ─── Page components ─────────────────────────────────────────────────────────

export function CheckoutPage() {
  return isMvp0Api() ? <Mvp0CheckoutPage /> : <LegacyCheckoutPage />
}

type Step = 'details' | 'review'

/** شريط التقدّم: السلة ← بياناتكِ ← المراجعة والتأكيد */
function CheckoutSteps({ step, onBack }: { step: Step; onBack: () => void }) {
  const review = step === 'review'
  return (
    <nav className="co-steps" aria-label={t('خطوات إتمام الطلب')}>
      <p className="co-steps__mobile"><b className="num">{t('الخطوة {n} من {total}', { n: review ? 2 : 1, total: 2 })}</b> · {review ? t('المراجعة والتأكيد') : t('بياناتكِ')}</p>
      <div className="co-steps__bar" aria-hidden="true"><i style={{ width: review ? '100%' : '50%' }} /></div>
      <ol>
        <li className="done"><Link to="/cart"><span className="co-steps__dot"><Icon name="check" className="size-3.5" /></span>{t('السلة')}</Link></li>
        <li className={review ? 'done' : 'current'} aria-current={review ? undefined : 'step'}>
          {review
            ? <button type="button" onClick={onBack}><span className="co-steps__dot"><Icon name="check" className="size-3.5" /></span>{t('بياناتكِ')}</button>
            : <span><span className="co-steps__dot num">1</span>{t('بياناتكِ')}</span>}
        </li>
        <li className={review ? 'current' : undefined} aria-current={review ? 'step' : undefined}><span><span className="co-steps__dot num">2</span>{t('المراجعة والتأكيد')}</span></li>
      </ol>
    </nav>
  )
}

function LegacyCheckoutPage() {
  const navigate = useNavigate()
  const submitting = useRef(false)
  const [uncertain, setUncertain] = useState(false)
  const store = useStoreInfo()
  const [chosenMethod, setPaymentMethod] = useState<PaymentMethodCode>('cod')
  const paymentOptions = isMockMode() ? MOCK_PAYMENT_METHODS : paymentOptionsFromCodes(store.paymentMethods)
  // إن لم تعد الطريقة المختارة مفعّلة من الخادم نرجع لأول طريقة متاحة
  const paymentMethod = paymentOptions.some((o) => o.code === chosenMethod) ? chosenMethod : paymentOptions[0].code
  const user = useAuthStore((s) => s.user)

  // الخطوة في الرابط (?step=review) حتى يعمل زر الرجوع في المتصفح؛ لا تُفتح المراجعة قبل نجاح التحقق
  const [params, setParams] = useSearchParams()
  const [reviewReady, setReviewReady] = useState(false)
  const step: Step = reviewReady && params.get('step') === 'review' ? 'review' : 'details'

  const cartQuery = useQuery({ queryKey: ['cart'], queryFn: gazabellaApi.getCart })
  const checkoutTracked = useRef(false)
  useEffect(() => {
    if (checkoutTracked.current || !cartQuery.data?.items.length) return
    checkoutTracked.current = true
    track('begin_checkout', lineItems(cartQuery.data.items))
  }, [cartQuery.data])

  useEffect(() => { if (reviewReady) window.scrollTo({ top: 0 }) }, [step, reviewReady])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      city: '',
      neighborhood: '',
      street: '',
      notes: '',
    },
  })

  const errs = form.formState.errors
  const values = useWatch({ control: form.control })
  const selectedCity = values.city ?? ''
  const fullAddress = [values.city, values.neighborhood, values.street].map((v) => v?.trim()).filter(Boolean).join(t('، '))

  const checkout = useMutation({
    mutationFn: (v: Values) => {
      const { city, neighborhood, street, ...rest } = v
      const zoneId = store.deliveryZones.find((z) => z.name === city)?.id
      return gazabellaApi.checkout({
        ...rest,
        address: `${city}، ${neighborhood}، ${street}`,
        payment_method: paymentMethod,
        // B-02: المنطقة المختارة ليحسب الخادم رسوم التوصيل منها
        ...(zoneId ? { delivery_zone_id: zoneId } : {}),
      })
    },
    onSuccess: (order, v) => {
      trackPurchase(order)
      saveLastOrder(order, v.phone, `${v.city}، ${v.neighborhood}، ${v.street}`)
      queryClient.setQueryData(['cart'], { items: [], total_items: 0, subtotal: '0.00' })
      queryClient.setQueryData(['order', String(isMockMode() ? order.order_number : order.id)], order)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate(
        isMockMode() ? `/orders/${encodeURIComponent(order.order_number)}` : '/checkout/receipt',
        { replace: true, state: { order } },
      )
    },
    onError: (error) => {
      const status = (error as { response?: { status?: number } }).response?.status
      track('checkout_error', { stage: 'submit', status: status ?? 0 })
      if (!status || status >= 500 || status === 408) setUncertain(true)
      // 409/422: قد يكون السعر أو المخزون تغيّر — نحدّث السلة لتظهر القيم الحالية في المراجعة
      else void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onSettled: () => { submitting.current = false },
  })

  function submit(v: Values) {
    if (submitting.current || uncertain) return
    submitting.current = true
    checkout.mutate(v)
  }

  function goReview(v: Values) {
    // المنطقة يجب أن تكون من مناطق التوصيل الحالية حتى يكون الإجمالي في المراجعة نهائياً
    if (!store.deliveryZones.some((z) => z.name === v.city)) {
      form.setError('city', { message: t('اختاري منطقة التوصيل') }, { shouldFocus: true })
      return
    }
    setReviewReady(true)
    if (cartQuery.data) track('checkout_review', lineItems(cartQuery.data.items))
    setParams((prev) => { const next = new URLSearchParams(prev); next.set('step', 'review'); return next })
  }

  /** رجوع لخطوة البيانات (نفس إدخال التاريخ الذي أضفناه) مع التركيز على الحقل المطلوب */
  function editDetails(focus?: keyof Values) {
    checkout.reset()
    navigate(-1)
    if (focus) window.setTimeout(() => form.setFocus(focus), 320)
  }

  // ── Loading / Error / Empty states
  if (cartQuery.isPending)
    return (
      <div className="container-page">
        <PageLoader label={t('نجهّز السلة…')} />
      </div>
    )
  if (cartQuery.isError)
    return (
      <div className="container-page">
        <ErrorState message={getApiErrorMessage(cartQuery.error)} onRetry={() => void cartQuery.refetch()} />
      </div>
    )
  const cart = cartQuery.data
  if (!cart.items.length)
    return (
      <div className="container-page py-16 text-center">
        <h1 className="section-title">{t('السلة فارغة')}</h1>
        <Link className="btn-primary mt-6 inline-block" to="/">
          {t('تصفح المنتجات')}
        </Link>
      </div>
    )

  const isSubmitting = checkout.isPending
  const zone = store.deliveryZones.find((z) => z.name === selectedCity) ?? null
  const freeDelivery = Boolean(store.freeDeliveryThreshold && Number(cart.subtotal) >= store.freeDeliveryThreshold)
  const total = Number(cart.subtotal) + (zone && !freeDelivery ? zone.fee : 0)
  const itemsCount = cart.items.reduce((n, i) => n + i.quantity, 0)
  const cod = paymentMethod === 'cod'
  const paymentLabel = t(paymentOptions.find((o) => o.code === paymentMethod)?.label ?? '')
  const totalLabel = zone ? formatPrice(total) : <>{money(cart.subtotal)} <span className="co-plus">{t('+ التوصيل')}</span></>
  const confirmLabel = isSubmitting ? t('جارٍ تأكيد طلبكِ…')
    : isMockMode() ? t('إنشاء طلب تجريبي')
    : <>{cod ? t('تأكيد الطلب') : t('إنشاء الطلب والدفع')} · <span className="num">{formatPrice(total)}</span></>

  const deliveryRow = (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-[var(--text-2)]">{t('التوصيل')}{zone ? ` (${zone.name})` : ''}</span>
      {zone
        ? <b>{freeDelivery ? <><s className="font-normal text-[var(--text-3)]">{formatPrice(zone.fee)}</s> {t('مجاني')}</> : formatPrice(zone.fee)}</b>
        : <span className="text-[var(--text-3)]">{t('يُحسب بعد اختيار المنطقة')}</span>}
    </div>
  )

  const banners = (
    <>
      {uncertain && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="alert">
          <span className="mt-0.5 text-base text-amber-500">⚠</span>
          <div className="text-sm leading-relaxed text-amber-800">
            <b className="mb-1 block">{t('لم نتأكد من إتمام الطلب')}</b>
            {t('ربما وصل طلبكِ رغم انقطاع الاتصال. راجعي')}{' '}
            <Link className="font-bold underline" to="/orders" target="_blank" rel="noopener">{t('طلباتي')}</Link>{' '}
            {t('أولاً لتجنب تكرار الطلب.')}
            <button type="button" className="mt-2 block font-bold underline" onClick={() => { setUncertain(false); checkout.reset() }}>
              {t('تحققت ولم أجد الطلب — أعيدي المحاولة')}
            </button>
          </div>
        </div>
      )}
      {checkout.isError && !uncertain && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="alert">
          <span className="mt-0.5 text-base text-red-500">✕</span>
          <p className="text-sm leading-snug text-red-700">{getApiErrorMessage(checkout.error)}</p>
        </div>
      )}
    </>
  )

  return (
    <div className="container-page co-page">
      <CheckoutSteps step={step} onBack={() => editDetails()} />
      <h1 className="section-title co-title">{step === 'review' ? t('راجعي طلبكِ قبل التأكيد') : t('إتمام الطلب')}</h1>

      <form onSubmit={(event) => void form.handleSubmit(step === 'review' ? submit : goReview)(event)} noValidate>
        <div key={step} className={`co-pane ${step === 'review' ? 'co-pane--fwd' : reviewReady ? 'co-pane--back' : ''}`}>
          {step === 'details' ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                {/* ملخص مصغّر قابل للفتح — موبايل فقط */}
                <details className="co-mini lg:hidden">
                  <summary><span><span className="num">{itemsCount}</span> {itemsCount === 1 ? t('منتج') : t('منتجات')}</span><b className="num">{totalLabel}</b><Icon name="chevron" className="size-4" /></summary>
                  <ul>
                    {cart.items.map((item) => <li key={item.id}><span>{item.product_name} × <span className="num">{item.quantity}</span></span><b className="num">{money(item.subtotal)}</b></li>)}
                  </ul>
                </details>

                <div className="checkout-card">
                  <SectionHeader step={1} title={t('معلومات التواصل')} />
                  <div className="space-y-4">
                    <Field id="name" label={t('الاسم الكامل')} error={errs.name?.message}>
                      {(inputProps) => <input id="name" type="text" autoComplete="name" placeholder={t('مثال: سارة أحمد')} {...inputProps} {...form.register('name')} />}
                    </Field>
                    <Field id="phone" label={t('رقم الجوال')} error={errs.phone?.message}>
                      {(inputProps) => (
                        <div className="relative">
                          <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="05XXXXXXXX" dir="ltr" {...inputProps} className={`${inputProps.className} ps-10`} {...form.register('phone')} />
                          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-base">📱</span>
                        </div>
                      )}
                    </Field>
                  </div>
                </div>

                <div className="checkout-card">
                  <SectionHeader step={2} title={t('عنوان التوصيل')} />
                  <div className="space-y-4">
                    <Field id="city" label={t('منطقة التوصيل')} error={errs.city?.message}>
                      {(inputProps) => (
                        <select id="city" autoComplete="address-level2" {...inputProps} {...form.register('city')}>
                          <option value="">{t('اختاري منطقة التوصيل')}</option>
                          {store.deliveryZones.map((z) => <option key={z.name} value={z.name}>{z.name} — {formatPrice(z.fee)}</option>)}
                        </select>
                      )}
                    </Field>
                    {zone && (
                      <p className="co-zone" role="status"><Icon name="truck" className="size-4 shrink-0" />{t('التوصيل')} <b className="num">{freeDelivery ? t('مجاني') : formatPrice(zone.fee)}</b> · {formatEta(zone.etaMinutes)} {t('تقريباً')}</p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id="neighborhood" label={t('الحي / المنطقة')} error={errs.neighborhood?.message}>
                        {(inputProps) => <input id="neighborhood" type="text" autoComplete="address-level3" placeholder={t('مثال: الكتيبة')} {...inputProps} {...form.register('neighborhood')} />}
                      </Field>
                      <Field id="street" label={t('الشارع / أقرب معلم')} error={errs.street?.message}>
                        {(inputProps) => <input id="street" type="text" autoComplete="street-address" placeholder={t('مثال: شارع جلال، بجانب صيدلية النور')} {...inputProps} {...form.register('street')} />}
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="checkout-card" id="co-payment">
                  <SectionHeader step={3} title={t('طريقة الدفع')} />
                  <PaymentMethodPicker options={paymentOptions} value={paymentMethod} onChange={setPaymentMethod} />
                </div>
              </div>

              <aside className="hidden space-y-4 self-start lg:sticky lg:top-6 lg:block">
                <div className="order-summary space-y-3">
                  <h2 className="text-base font-bold">{t('ملخص الطلب')}</h2>
                  <div className="space-y-2">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 text-sm">
                        <span className="text-[var(--text-2)]">{item.product_name}<span className="ms-1 text-[var(--text-3)]">× {item.quantity}</span></span>
                        <b className="flex-none text-[var(--text)]">{money(item.subtotal)}</b>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-3 text-sm"><span className="text-[var(--text-2)]">{t('قيمة المنتجات')}</span><b>{money(cart.subtotal)}</b></div>
                  {deliveryRow}
                  <div className="flex items-baseline justify-between border-t border-[var(--border)] pt-3"><span className="font-bold">{t('الإجمالي')}</span><b className="text-[var(--primary)]">{totalLabel}</b></div>
                </div>
                <button type="submit" className="btn-primary w-full">{t('متابعة للمراجعة')}</button>
                <p className="co-hint">{t('لن يُرسل الطلب الآن — ستراجعين كل التفاصيل في الخطوة التالية.')}</p>
                {isMockMode() && <p className="demo-note text-xs">{t('عرض تجريبي — لا يُرسل طلب حقيقي.')}</p>}
              </aside>

              <div className="co-sticky">
                <div><span>{t('الإجمالي')}</span><b className="num">{totalLabel}</b></div>
                <button type="submit" className="btn-primary">{t('متابعة للمراجعة')}</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                <section className="checkout-card co-review" aria-labelledby="co-r-delivery">
                  <header><h2 id="co-r-delivery"><Icon name="truck" className="size-5" />{t('التوصيل إلى')}</h2><button type="button" className="text-link" disabled={isSubmitting} onClick={() => editDetails('name')}>{t('تعديل')}</button></header>
                  <dl>
                    <div><dt>{t('الاسم')}</dt><dd>{values.name}</dd></div>
                    <div><dt>{t('الجوال')}</dt><dd><bdi className="num" dir="ltr">{values.phone}</bdi></dd></div>
                    <div><dt>{t('العنوان')}</dt><dd>{fullAddress}</dd></div>
                    {zone && <div><dt>{t('مدة التوصيل')}</dt><dd>{formatEta(zone.etaMinutes)} {t('تقريباً')}</dd></div>}
                  </dl>
                  <details className="co-note" open={Boolean(values.notes)}>
                    <summary>{t('إضافة ملاحظة للمندوب')} <span>{t('(اختياري)')}</span></summary>
                    <Field id="notes" label={t('ملاحظة للمندوب')} required={false} error={errs.notes?.message}>
                      {(inputProps) => <input id="notes" type="text" autoComplete="off" maxLength={500} placeholder={t('مثال: الاتصال قبل الوصول')} disabled={isSubmitting} {...inputProps} {...form.register('notes')} />}
                    </Field>
                  </details>
                </section>

                <section className="checkout-card co-review" aria-labelledby="co-r-pay">
                  <header><h2 id="co-r-pay"><Icon name="dollar" className="size-5" />{t('طريقة الدفع')}</h2>{paymentOptions.length > 1 && <button type="button" className="text-link" disabled={isSubmitting} onClick={() => editDetails()}>{t('تعديل')}</button>}</header>
                  <p className="co-review__pay"><b>{paymentLabel}</b>{cod ? t(' — لا يُخصم أي مبلغ الآن، تدفعين للمندوب عند الاستلام.') : t(' — بعد إنشاء الطلب تنتقلين لخطوة الدفع.')}</p>
                </section>

                <section className="checkout-card co-review" aria-labelledby="co-r-items">
                  <header><h2 id="co-r-items"><Icon name="bag" className="size-5" />{t('المنتجات (')}<span className="num">{itemsCount}</span>)</h2><Link className="text-link" to="/cart">{t('تعديل السلة')}</Link></header>
                  <ul className="co-items">
                    {cart.items.map((item) => {
                      const src = getImageUrl(item.image_url)
                      return (
                        <li key={item.id}>
                          <span className="co-items__thumb">{src ? <img src={src} alt="" loading="lazy" /> : <Icon name="package" className="size-5" />}</span>
                          <span className="co-items__name">{item.product_name}<small>{t('الكمية:')} <span className="num">{item.quantity}</span></small></span>
                          <b className="num">{money(item.subtotal)}</b>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              </div>

              <aside className="space-y-4 self-start lg:sticky lg:top-6">
                <div className="order-summary space-y-3">
                  <h2 className="text-base font-bold">{t('الحساب')}</h2>
                  <div className="flex justify-between text-sm"><span className="text-[var(--text-2)]">{t('قيمة المنتجات')}</span><b>{money(cart.subtotal)}</b></div>
                  {deliveryRow}
                  <div className="co-total"><span>{cod ? t('المبلغ عند الاستلام') : t('الإجمالي')}</span><strong className="num">{formatPrice(total)}</strong></div>
                </div>
                {banners}
                <button type="submit" className="btn-primary co-desktop-only w-full" disabled={isSubmitting || uncertain}>{confirmLabel}</button>
                <LegalConsent />
                <button type="button" className="btn-ghost co-desktop-only w-full" disabled={isSubmitting} onClick={() => editDetails()}>{t('رجوع لتعديل البيانات')}</button>
                {isMockMode() && <p className="demo-note text-xs">{t('عرض تجريبي — لا يُرسل طلب حقيقي.')}</p>}
              </aside>

              <div className="co-sticky co-sticky--confirm">
                <button type="button" className="btn-ghost" disabled={isSubmitting} onClick={() => editDetails()} aria-label={t('رجوع لتعديل البيانات')}>{t('رجوع')}</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting || uncertain}>{confirmLabel}</button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
