import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useCartStore } from '../stores/cartStore'
import { useCheckoutStore } from '../stores/checkoutStore'
import { useAuthStore } from '../stores/authStore'
import { money, normalizePhone } from '../lib/format'

const schema = z.object({
  delivery_option_id: z.number().int().positive('اختاري طريقة التوصيل'),
  full_name: z.string().trim().min(3, 'أدخلي الاسم الكامل'),
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(/^\+970[0-9]{9}$/, 'أدخلي رقم جوال فلسطيني صحيحًا')),
  city: z.string().refine((value): boolean => value === 'خانيونس', 'التوصيل متاح في خانيونس فقط'),
  area: z.string().trim().min(2, 'أدخلي المنطقة'),
  details: z.string().trim().min(5, 'أضيفي تفاصيل كافية للعنوان'),
  landmark: z.string().optional(),
  notes: z.string().max(500, 'الحد الأقصى 500 حرف').optional(),
})
type Values = z.infer<typeof schema>
export function CheckoutPage() {
  const navigate = useNavigate()
  const started = useRef(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkout = useCheckoutStore()
  const user = useAuthStore((s) => s.user)
  const seconds = useCartStore((s) => s.secondsRemaining)
  const [coupon, setCoupon] = useState('')
  const [couponError, setCouponError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [submitted, setSubmitted] = useState(false)
  // H-2: don't default to 0 — leave undefined if no available option so Zod positive() shows the error
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { full_name: user?.name || '', phone: user?.phone || '', city: 'خانيونس', area: '', details: '', notes: '', ...checkout.draft, landmark: checkout.draft.landmark || '', delivery_option_id: checkout.draft.delivery_option_id || checkout.session?.delivery_options.find((d) => d.is_available)?.id } })
  // H-5: use form.watch() (no re-render) instead of useWatch for draft persistence; debounce storage
  useEffect(() => {
    const { unsubscribe } = form.watch((data) => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => { useCheckoutStore.getState().setDraft(data as Values) }, 400)
    })
    return () => { unsubscribe(); if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
  }, [form])
  // C-4: use stable mutate ref so useEffect deps don't change every render
  const beginMutateRef = useRef<() => void>(() => {})
  const begin = useMutation({ mutationFn: () => gazabellaApi.beginCheckout(coupon.trim() || undefined), onSuccess: (session) => { checkout.setSession(session); useCartStore.getState().setReservation(session.expires_at || session.reserved_until || null, session.seconds_remaining); const firstAvailable = session.delivery_options.find((d) => d.is_available); if (firstAvailable) form.setValue('delivery_option_id', firstAvailable.id) } })
  useEffect(() => { beginMutateRef.current = () => begin.mutate() }, [begin])
  useEffect(() => {
    if (checkout.session || checkout.beginAttempted || started.current) return
    started.current = true
    checkout.markBeginAttempted()
    beginMutateRef.current()
  }, [checkout.session, checkout.beginAttempted, checkout.markBeginAttempted])
  const payment = useMutation({ mutationFn: gazabellaApi.initPayment, onSuccess: (response) => {
    const url = new URL(response.payment_url, window.location.origin)
    if (!['https:', ...(isMockMode() ? ['http:'] : [])].includes(url.protocol)) throw new Error('رابط الدفع غير صالح.')
    checkout.reset(); useCartStore.getState().clearReservation()
    void queryClient.invalidateQueries({queryKey:['cart']}); void queryClient.invalidateQueries({queryKey:['orders']})
    if (isMockMode()) navigate(url.pathname + url.search, { replace: true }); else window.location.assign(url.href)
  } })
  const create = useMutation({ mutationFn: (v: Values) => gazabellaApi.createOrder({ delivery_option_id: v.delivery_option_id, coupon_code: checkout.session?.coupon?.code, notes: v.notes || undefined, address: { full_name: v.full_name, phone: v.phone, city: v.city, area: v.area, details: v.details, landmark: v.landmark || undefined } }), onSuccess: (response) => { checkout.setPendingOrder({ id: response.data.id, order_number: response.data.order_number }); void queryClient.invalidateQueries({queryKey:['cart']}); void queryClient.invalidateQueries({queryKey:['orders']}); try { sessionStorage.setItem('gz_order_confirmed', response.data.order_number) } catch {} ; if (isMockMode()) { checkout.reset(); useCartStore.getState().clearReservation(); navigate(`/orders/${response.data.order_number}?created=1`, {replace:true}) } else payment.mutate(response.data.id) }, onSettled: () => setSubmitted(false) })
  const session = checkout.session
  if (!session && (begin.isPending || !checkout.beginAttempted)) return <div className="container-page"><PageLoader label="نجهّز تفاصيل التوصيل…" /></div>
  if (!session) return <div className="container-page py-10"><ErrorState message={begin.error ? getApiErrorMessage(begin.error) : 'لم تكتمل جلسة الدفع. عودي إلى السلة للتحقق من الحجز.'} /><Link className="btn-primary" to="/cart" onClick={checkout.reset}>العودة إلى السلة</Link></div>
  // H-5: read live values from form for render — no useWatch needed, avoids full re-render on keystroke
  const values = form.getValues()
  const selected = session.delivery_options.find((d) => d.id === values.delivery_option_id && d.is_available)
  const total = Number(session.cart.subtotal) + Number(selected?.fee || 0) - Number(session.coupon?.discount_amount || 0)
  const expired = seconds === 0
  const busy = create.isPending || payment.isPending || submitted
  const error = create.error || payment.error
  return <div className="container-page py-8 sm:py-12">
    {busy && step === 2 && (
      <div className="checkout-processing-overlay" role="status" aria-live="assertive" aria-label="جارٍ تجهيز طلبكِ">
        <div className="checkout-processing-card">
          <span className="loader-ring checkout-processing-ring" aria-hidden="true" />
          <p className="checkout-processing-title">نجهّز طلبكِ بعناية…</p>
          <p className="checkout-processing-sub">لا تغلقي الصفحة</p>
        </div>
      </div>
    )}
    <Link to="/cart" className="text-link mb-6"><Icon name="arrow" className="size-4" /> العودة إلى السلة</Link><span className="eyebrow block">اختياراتكِ على بُعد خطوة</span><h1 className="section-title mt-2">التوصيل والدفع</h1>
    <div className="checkout-progress"><span className="done"><span className="num">1</span> <b>السلة</b></span><i /><span className={step === 1 ? 'current' : 'done'}><span className="num">2</span> <b>التوصيل</b></span><i /><span className={step === 2 ? 'current' : ''}><span className="num">3</span> <b>المراجعة والدفع</b></span></div>
    {expired && !checkout.pendingOrder && <p className="mb-5 rounded-lg bg-amber-50 p-4 text-sm" role="alert">انتهت مهلة الحجز. <Link to="/cart" className="underline" onClick={checkout.reset}>عودي للسلة لتحديث التوافر.</Link></p>}
    {checkout.pendingOrder && <div className="mb-6 rounded-lg border border-[var(--border)] bg-white p-5"><b>طلبكِ محفوظ: <span className="num">{checkout.pendingOrder.order_number}</span></b><p className="my-2 text-sm">يمكنكِ استئناف الدفع دون إنشاء طلب جديد.</p><button className="btn-primary" disabled={payment.isPending} onClick={() => payment.mutate(checkout.pendingOrder!.id)}>{payment.isPending ? 'جارٍ فتح الدفع…' : 'استئناف الدفع'}</button>{payment.isError && <p className="field-error" role="alert">{getApiErrorMessage(payment.error)}</p>}</div>}
    {!checkout.pendingOrder && <form className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start" onSubmit={form.handleSubmit((v) => { if (busy || expired || !selected) return; if (step === 1) { setStep(2); return } setSubmitted(true); create.mutate(v) })}>
      <div className="space-y-6">
        {step === 1 ? <><section className="checkout-card"><h2 className="mb-5 text-xl font-bold">أين نوصل اختياراتكِ؟</h2><div className="grid gap-4 sm:grid-cols-2">{([{name:'full_name',label:'الاسم الكامل',auto:'name'},{name:'phone',label:'رقم الجوال',auto:'tel'},{name:'city',label:'المدينة',auto:'address-level1'},{name:'area',label:'الحي أو المنطقة',auto:'address-level2'},{name:'details',label:'تفاصيل العنوان',auto:'street-address'},{name:'landmark',label:'أقرب معلم (اختياري)',auto:'off'}] as const).map((field) => <label className={`field-label ${field.name === 'details' ? 'sm:col-span-2' : ''}`} key={field.name}>{field.label}{field.name === 'city' ? <select className="form-field mt-2" {...form.register('city')}><option value="خانيونس">خانيونس</option></select> : <input className="form-field mt-2" {...form.register(field.name)} autoComplete={field.auto} inputMode={field.name === 'phone' ? 'tel' : 'text'} dir={field.name === 'phone' ? 'ltr' : undefined} aria-invalid={!!form.formState.errors[field.name]} aria-describedby={form.formState.errors[field.name] ? `${field.name}-error` : undefined} />}{form.formState.errors[field.name] && <span className="field-error" id={`${field.name}-error`}>{form.formState.errors[field.name]?.message}</span>}</label>)}</div></section>
        <section className="checkout-card"><h2 className="mb-5 text-xl font-bold">طريقة التوصيل</h2><div className="space-y-3">{session.delivery_options.filter((d) => d.is_available).map((d) => <label key={d.id} className="delivery-option"><input type="radio" name="delivery_option_id" value={d.id} checked={values.delivery_option_id === d.id} onChange={() => form.setValue('delivery_option_id',d.id,{shouldValidate:true,shouldDirty:true})} /><span className="flex-1"><b className="block text-sm">{d.name}</b><small className="block mt-1 text-[var(--text-2)]">{d.description}</small></span><b className="text-sm whitespace-nowrap"><span className="num">{money(d.fee)}</span></b></label>)}</div>{form.formState.errors.delivery_option_id && <p className="field-error">{form.formState.errors.delivery_option_id.message}</p>}</section>
        <label className="checkout-card block"><span className="field-label">ملاحظة للتوصيل (اختياري)</span><textarea className="form-field" maxLength={500} {...form.register('notes')} placeholder="أي تفاصيل تساعدنا على الوصول إليكِ" /></label></> : <section className="checkout-card"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">راجعي طلبكِ</h2><button type="button" className="text-link" onClick={() => setStep(1)}>تعديل العنوان</button></div><div className="my-6 space-y-2 text-sm"><b>{values.full_name}</b><p>{values.city}، {values.area}</p><p>{values.details}</p><p dir="ltr" className="text-right"><span className="num">{values.phone}</span></p><p>{selected?.name}</p></div><div className="rounded-lg bg-[var(--surface2)] p-4 text-sm leading-7"><Icon name="shield" className="mb-2 size-5 text-[var(--primary)]" />{isMockMode() ? 'الدفع عند الاستلام — ادفعي قيمة الطلب نقدًا عند وصوله. هذا طلب تجريبي للعرض فقط.' : 'ستنتقلين إلى صفحة Jawwal Pay لإتمام الدفع. لا نؤكد الدفع إلا بعد تحديث حالة الطلب من الخادم.'}</div></section>}
      </div>
      <aside className="order-summary lg:sticky lg:top-40"><h2 className="text-lg font-bold">ملخص اختياراتكِ</h2><div className="my-5 space-y-3 border-y border-[var(--border)] py-4">{session.cart.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span>{item.product_name}<small className="block mt-1 text-[var(--text-3)]">{item.variant_name} × <span className="num">{item.quantity}</span></small></span><b className="whitespace-nowrap"><span className="num">{money(item.subtotal)}</span></b></div>)}</div><div className="space-y-3 text-sm"><p className="flex justify-between"><span>المنتجات</span><b><span className="num">{money(session.cart.subtotal)}</span></b></p><p className="flex justify-between"><span>التوصيل</span><b><span className="num">{money(selected?.fee || 0)}</span></b></p>{session.coupon && <p className="flex justify-between text-[var(--success)]"><span>خصم {session.coupon.code}</span><b>−<span className="num">{money(session.coupon.discount_amount)}</span></b></p>}</div>
      {isMockMode() && !session.coupon && <div className="mt-5"><label className="text-xs" htmlFor="coupon">رمز الخصم التجريبي: GAZA2026</label><div className="mt-2 flex gap-2"><input id="coupon" className="form-field min-w-0" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="رمز الخصم" /><button type="button" className="btn-ghost" disabled={begin.isPending || !coupon.trim()} onClick={() => { if (coupon.trim() !== 'GAZA2026') { setCouponError('رمز الخصم غير صالح.'); return } setCouponError(''); checkout.setSession({ ...session, coupon: {code: 'GAZA2026', discount_type: 'fixed', discount_value: '20.00', discount_amount: Math.min(20, Number(session.cart.subtotal)).toFixed(2)} }) }}>تطبيق</button></div>{couponError && <p className="field-error" role="alert">{couponError}</p>}</div>}
      <div className="my-6 flex justify-between border-t border-[var(--border)] pt-5"><b>الإجمالي</b><b className="text-xl text-[var(--primary)]"><span className="num">{money(total)}</span></b></div><button className="btn-primary w-full" disabled={busy || expired || !selected}>{busy ? 'جارٍ تجهيز طلبكِ…' : step === 1 ? 'متابعة لمراجعة الطلب' : isMockMode() ? 'تأكيد الطلب — الدفع عند الاستلام' : 'المتابعة إلى Jawwal Pay'}</button>{error && <p className="field-error" role="alert">{getApiErrorMessage(error)}</p>}<p className="mt-4 text-center text-xs text-[var(--text-3)]">طلب واحد • توصيل موحّد • إجمالي واضح</p></aside>
    </form>}
  </div>
}
