import { useEffect, useRef, useState } from 'react'
import { resolvePaymentMethods } from '../lib/paymentMethods'
import { PaymentMethodPicker } from '../components/checkout/PaymentMethodPicker'
import { DeliveryFeeRow } from '../components/checkout/DeliveryFee'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { LegalConsent } from '../components/checkout/LegalConsent'
import { lineItems, track, trackPurchase } from '../lib/analytics'
import { gazabellaApi } from '../api/gazabella'
import { mvp0Checkout, normalizePhone } from '../api/mvp0'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { money } from '../lib/format'
import { useAuthStore } from '../stores/authStore'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import type { CheckoutBegin, CheckoutQuote, Mvp0Address, Mvp0CheckoutPayload, PaymentMethodCode } from '../types/api'

type Attempt = { key: string; payload: Mvp0CheckoutPayload }

const statusOf = (e: unknown) => (e as { response?: { status?: number } }).response?.status ?? 0

export function Mvp0CheckoutPage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const storageKey = `mvp0-checkout:${import.meta.env.VITE_API_BASE_URL}:${user?.id}`
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null') } catch { return null }
  })
  const [begin, setBegin] = useState<CheckoutBegin | null>(null)
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [address, setAddress] = useState<Mvp0Address>({
    full_name: user?.name ?? '', phone: user?.phone ?? '',
    city: '', area: '', details: '', landmark: '',
  })
  const [deliveryId, setDeliveryId] = useState(0)
  const [coupon, setCoupon] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cod')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now)
  const formRef = useRef<HTMLFormElement>(null)
  const paymentOptions = resolvePaymentMethods(begin?.payment_methods)
  const activePayment = paymentOptions.some(o => o.code === paymentMethod) ? paymentMethod : paymentOptions[0].code

  const cart = useQuery({ queryKey: ['cart'], queryFn: gazabellaApi.getCart })
  const checkoutTracked = useRef(false)
  useEffect(() => {
    if (checkoutTracked.current || !cart.data?.items.length) return
    checkoutTracked.current = true
    track('begin_checkout', lineItems(cart.data.items))
  }, [cart.data])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const reserve = useMutation({
    mutationFn: async () => { await mvp0Checkout.reserve(); return mvp0Checkout.begin() },
    onSuccess: result => {
      setBegin(result); setQuote(null); setDeliveryId(result.delivery_options[0]?.id ?? 0)
      setAddress(prev => ({ ...prev, city: result.active_cities[0] ?? '' }))
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: (e) => track('checkout_error', { stage: 'reserve', status: statusOf(e) }),
  })

  const review = useMutation({
    mutationFn: () => mvp0Checkout.quote(deliveryId, address.city, coupon.trim() || undefined),
    onSuccess: setQuote,
    onError: (e) => track('checkout_error', { stage: 'quote', status: statusOf(e) }),
  })

  const create = useMutation({
    mutationFn: (value: Attempt) => mvp0Checkout.create(value.payload, value.key),
    onSuccess: order => {
      trackPurchase(order)
      sessionStorage.removeItem(storageKey); setAttempt(null)
      queryClient.setQueryData(['order', order.order_number], order)
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate(`/orders/${encodeURIComponent(order.order_number)}?created=1`, { replace: true })
    },
    onError: e => {
      const status = (e as { response?: { status?: number } }).response?.status
      track('checkout_error', { stage: 'create', status: status ?? 0 })
      if (status && status >= 400 && status < 500 && ![401, 408, 429].includes(status)) {
        sessionStorage.removeItem(storageKey); setAttempt(null); setQuote(null)
      }
    },
  })

  const busy = reserve.isPending || review.isPending || create.isPending
  const invalidate = () => { setQuote(null); setError(''); review.reset(); create.reset() }
  const expires = begin ? Math.max(0, Math.floor((Date.parse(begin.expires_at) - now) / 1000)) : 0
  const quoteValid = !!quote && Date.parse(quote.expires_at) > now && expires > 0
  const reservationActive = !!begin && expires > 0

  function confirm() {
    if (!quoteValid || !quote || busy) return
    try {
      if (!address.full_name.trim() || !address.area.trim() || !address.details.trim())
        throw new Error('أكملي بيانات العنوان.')
      const value: Attempt = {
        key: crypto.randomUUID(),
        payload: {
          address: { ...address, phone: normalizePhone(address.phone) },
          delivery_option_id: deliveryId,
          payment_method: activePayment,
          quote_token: quote.quote_token,
          ...(coupon.trim() ? { coupon_code: coupon.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      }
      sessionStorage.setItem(storageKey, JSON.stringify(value))
      setAttempt(value); setError(''); create.mutate(value)
    } catch (e) { setError(getApiErrorMessage(e)) }
  }

  // ── حالة إعادة المحاولة ──
  if (attempt) return (
    <div className="container-page py-12 max-w-lg text-center space-y-5">
      <div className="flex justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-3xl">⏳</span>
      </div>
      <h1 className="section-title">جارٍ التحقق من طلبكِ</h1>
      <p className="text-[var(--text-2)] text-sm leading-relaxed">
        نحتفظ بمحاولتكِ حتى نتأكد من النتيجة. إعادة المحاولة تسترجع الطلب نفسه إذا تم إنشاؤه.
      </p>
      <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-right space-y-1">
        <p><b>{attempt.payload.address.full_name}</b></p>
        <p className="text-[var(--text-2)]">{attempt.payload.address.city}، {attempt.payload.address.area}</p>
      </div>
      {create.isError && <p className="field-error" role="alert">{getApiErrorMessage(create.error)}</p>}
      <button className="btn-primary w-full" disabled={create.isPending} onClick={() => create.mutate(attempt)}>
        {create.isPending ? 'نتحقق من الطلب…' : 'إعادة التحقق من الطلب'}
      </button>
    </div>
  )

  if (cart.isPending) return <PageLoader />
  if (cart.isError) return <ErrorState message={getApiErrorMessage(cart.error)} onRetry={() => void cart.refetch()} />
  if (!cart.data.items.length) return (
    <div className="container-page py-12 text-center">
      <h1 className="section-title mb-4">السلة فارغة</h1>
      <Link to="/" className="btn-primary">تصفحي المنتجات</Link>
    </div>
  )

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/cart" className="text-link mb-6 inline-flex">
        <Icon name="arrow" className="size-4" /> العودة للسلة
      </Link>
      <span className="eyebrow block mt-2">اقتربنا من الوصول إليكِ</span>
      <h1 className="section-title mt-2 mb-8">إتمام الطلب</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">

        {/* ════ القسم الأيسر ════ */}
        {!reservationActive ? (
          /* ── حالة ما قبل الحجز ── */
          <section className="checkout-card space-y-6">
            {/* خطوات */}
            <div className="space-y-4">
              {[
                { num: '١', title: 'احجزي مشترياتك', body: 'نحجز الكمية المختارة لك لمدة محدودة حتى تكملي بيانات التوصيل بهدوء.' },
                { num: '٢', title: 'أدخلي بيانات التوصيل', body: 'اسمك والعنوان التفصيلي وطريقة التوصيل المناسبة.' },
                { num: '٣', title: 'راجعي الإجمالي وأكدي', body: 'ستظهر رسوم التوصيل والخصم قبل أي تأكيد نهائي.' },
              ].map(step => (
                <div key={step.num} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white font-bold text-sm mt-0.5">
                    {step.num}
                  </span>
                  <div>
                    <p className="font-bold">{step.title}</p>
                    <p className="text-sm text-[var(--text-2)] mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {reserve.isError && (
              <p className="field-error" role="alert">{getApiErrorMessage(reserve.error)}</p>
            )}

            <button
              type="button"
              className="btn-primary w-full text-base py-4"
              disabled={busy}
              onClick={() => reserve.mutate()}
            >
              {reserve.isPending
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> جارٍ حجز السلة…</>
                : <>حجز السلة والمتابعة <Icon name="arrow" className="size-4 rotate-180" /></>
              }
            </button>
          </section>
        ) : (
          /* ── حالة النموذج ── */
          <div className="space-y-5">
            {/* شريط العداد */}
            <div className={[
              'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold',
              expires < 60
                ? 'bg-red-50 border border-red-200 text-red-700'
                : expires < 180
                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                  : 'bg-green-50 border border-green-200 text-green-700',
            ].join(' ')}>
              <span className="flex items-center gap-2">
                <span className="text-base">⏱</span>
                الوقت المتبقي للحجز
              </span>
              <span className="font-mono text-lg font-bold" dir="ltr" role="status">
                {Math.floor(expires / 60)}:{String(expires % 60).padStart(2, '0')}
              </span>
            </div>

            <form
              ref={formRef}
              id="mvp0-checkout"
              className="checkout-card space-y-5"
              onSubmit={e => { e.preventDefault(); review.mutate() }}
            >
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[var(--primary)] text-white text-sm font-bold">١</span>
                <h2 className="text-lg font-bold">بيانات التوصيل</h2>
              </div>

              <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">الاسم الكامل</label>
                  <input className="form-field" type="text" required maxLength={100}
                    value={address.full_name}
                    onChange={e => { invalidate(); setAddress({ ...address, full_name: e.target.value }) }}
                    placeholder="سارة محمود"
                  />
                </div>
                <div>
                  <label className="field-label">رقم الجوال</label>
                  <input className="form-field" type="tel" required dir="ltr" inputMode="tel"
                    value={address.phone}
                    onChange={e => { invalidate(); setAddress({ ...address, phone: e.target.value }) }}
                    placeholder="0591234567"
                  />
                </div>
                <div>
                  <label className="field-label">المدينة</label>
                  <select required className="form-field" value={address.city}
                    onChange={e => { invalidate(); setAddress({ ...address, city: e.target.value }) }}>
                    {begin!.active_cities.map(city => <option key={city}>{city}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">الحي</label>
                  <input className="form-field" type="text" required maxLength={255}
                    value={address.area}
                    onChange={e => { invalidate(); setAddress({ ...address, area: e.target.value }) }}
                    placeholder="الرمال"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label">تفاصيل العنوان</label>
                  <input className="form-field" type="text" required maxLength={255}
                    value={address.details}
                    onChange={e => { invalidate(); setAddress({ ...address, details: e.target.value }) }}
                    placeholder="شارع عمر المختار، رقم المبنى…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label">أقرب معلم <span className="font-normal text-[var(--text-3)]">(اختياري)</span></label>
                  <input className="form-field" type="text" maxLength={255}
                    value={address.landmark}
                    onChange={e => { invalidate(); setAddress({ ...address, landmark: e.target.value }) }}
                    placeholder="بجانب مسجد…"
                  />
                </div>
              </fieldset>

              <div className="border-t border-[var(--border)] pt-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[var(--primary)] text-white text-sm font-bold">٢</span>
                  <h2 className="text-lg font-bold">خيارات التوصيل</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="field-label">طريقة التوصيل</label>
                    <div className="grid gap-2 mt-1">
                      {begin!.delivery_options.map(opt => {
                        const sel = deliveryId === opt.id
                        return (
                          <label key={opt.id} className={[
                            'flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all',
                            sel
                              ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]'
                              : 'border-[var(--border)] bg-white hover:border-[var(--primary)]',
                          ].join(' ')}>
                            <div className="flex items-center gap-3">
                              <div className={['size-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                sel ? 'border-[var(--primary)]' : 'border-[var(--border)]'].join(' ')}>
                                {sel && <div className="size-2 rounded-full bg-[var(--primary)]" />}
                              </div>
                              <span className={['font-medium text-sm', sel ? 'text-[var(--primary)]' : ''].join(' ')}>{opt.name}</span>
                            </div>
                            <span className={['font-bold text-sm', sel ? 'text-[var(--primary)]' : ''].join(' ')}>{money(opt.fee)}</span>
                            <input type="radio" name="delivery" className="sr-only" value={opt.id} checked={sel}
                              onChange={() => { invalidate(); setDeliveryId(opt.id) }} />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label">كود الخصم <span className="font-normal text-[var(--text-3)]">(اختياري)</span></label>
                    <div className="flex gap-2 mt-1">
                      <input className="form-field flex-1 text-sm" dir="ltr"
                        value={coupon} placeholder="GAZABELLA10"
                        onChange={e => { invalidate(); setCoupon(e.target.value) }} />
                      <button type="submit" className="shrink-0 rounded-xl border border-[var(--primary)] px-4 text-sm font-bold text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] transition disabled:opacity-40"
                        disabled={busy}>
                        تطبيق
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label">ملاحظات <span className="font-normal text-[var(--text-3)]">(اختياري)</span></label>
                    <textarea className="form-field" rows={2} maxLength={500}
                      value={notes} placeholder="أي تفاصيل تساعدنا على الوصول إليكِ"
                      onChange={e => { invalidate(); setNotes(e.target.value) }} />
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[var(--primary)] text-white text-sm font-bold">٣</span>
                  <h2 className="text-lg font-bold">طريقة الدفع</h2>
                </div>
                <PaymentMethodPicker options={paymentOptions} value={activePayment} disabled={busy} onChange={v => { setPaymentMethod(v); invalidate() }} />
              </div>
            </form>
          </div>
        )}

        {/* ════ الـ Sidebar (مشترك بين الحالتين) ════ */}
        <aside className="order-summary lg:sticky lg:top-40 space-y-4">
          <h2 className="text-lg font-bold pb-3 border-b border-[var(--border)]">ملخص الطلب</h2>

          {/* المنتجات */}
          <div className="space-y-3">
            {cart.data.items.map(item => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{item.product_name}</p>
                  {item.variant_name && <p className="text-[var(--text-3)] text-xs mt-0.5">{item.variant_name}</p>}
                  <p className="text-[var(--text-3)] text-xs">× <span className="num">{item.quantity}</span></p>
                </div>
                <b className="whitespace-nowrap shrink-0 num">{money(item.subtotal)}</b>
              </div>
            ))}
          </div>

          {/* تفاصيل السعر */}
          <div className="border-t border-[var(--border)] pt-4 space-y-2 text-sm">
            {quote ? (
              <>
                <div className="flex justify-between text-[var(--text-2)]">
                  <span>المنتجات</span><span className="num">{money(quote.subtotal)}</span>
                </div>
                <DeliveryFeeRow fees={quote} className="text-[var(--text-2)]" />
                {parseFloat(quote.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>خصم الكوبون</span><span className="num">− {money(quote.discount_amount)}</span>
                  </div>
                )}
                {!quoteValid && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2" role="status">
                    انتهت صلاحية العرض — اضغطي "راجعي الإجمالي" مجددًا.
                  </p>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]">
                  <span>الإجمالي</span>
                  <span className="text-[var(--primary)] text-xl num">{money(quote.total)}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--text-3)] leading-relaxed">
                {reservationActive
                  ? 'أكملي بيانات التوصيل، ثم اضغطي الزر أدناه للحصول على الإجمالي النهائي.'
                  : 'احجزي سلتك أولًا لعرض رسوم التوصيل والإجمالي.'
                }
              </p>
            )}
          </div>

          {/* الأخطاء */}
          {(error || reserve.isError || review.isError || create.isError) && (
            <p className="field-error text-sm" role="alert">
              {error || getApiErrorMessage(reserve.error || review.error || create.error)}
            </p>
          )}

          {/* ── زر الإجراء الوحيد ── */}
          {!reservationActive ? (
            <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => reserve.mutate()}>
              {reserve.isPending ? 'جارٍ الحجز…' : <>حجز السلة والمتابعة <Icon name="arrow" className="size-4 rotate-180" /></>}
            </button>
          ) : quoteValid ? (
            <button type="button" className="btn-primary w-full text-base py-4" disabled={busy} onClick={confirm}>
              {create.isPending ? 'جارٍ إرسال الطلب…' : <>تأكيد الطلب <Icon name="arrow" className="size-4 rotate-180" /></>}
            </button>
          ) : (
            <button type="submit" form="mvp0-checkout" className="btn-primary w-full" disabled={busy || !deliveryId}>
              {review.isPending ? 'جارٍ الحساب…' : <>راجعي الإجمالي <Icon name="arrow" className="size-4 rotate-180" /></>}
            </button>
          )}

          <LegalConsent />
        </aside>
      </div>
    </div>
  )
}
