import { useRef, useState } from 'react'
import { JawwalPaymentOption } from '../components/checkout/JawwalPaymentOption'
import { isMvp0Api } from '../lib/apiContract'
import { Mvp0CheckoutPage } from './Mvp0CheckoutPage'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import { money } from '../lib/format'

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
  city: z.string().trim().min(2, 'أدخل اسم المدينة'),
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
      <p className="text-sm leading-snug text-red-700">{message}</p>
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

function LegacyCheckoutPage() {
  const navigate = useNavigate()
  const submitting = useRef(false)
  const [uncertain, setUncertain] = useState(false)
  const user = useAuthStore((s) => s.user)

  const cartQuery = useQuery({ queryKey: ['cart'], queryFn: gazabellaApi.getCart })

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

  const checkout = useMutation({
    mutationFn: (values: Values) => {
      const { city, neighborhood, street, ...rest } = values
      return gazabellaApi.checkout({
        ...rest,
        address: `${city}، ${neighborhood}، ${street}`,
        payment_method: 'jawwal_pay',
      })
    },
    onSuccess: (order) => {
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
      if (!status || status >= 500 || status === 408) setUncertain(true)
    },
    onSettled: () => { submitting.current = false },
  })

  function submit(values: Values) {
    if (submitting.current || uncertain) return
    submitting.current = true
    checkout.mutate(values)
  }

  // ── Loading / Error / Empty states
  if (cartQuery.isPending)
    return (
      <div className="container-page">
        <PageLoader label="نجهّز السلة…" />
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
        <h1 className="section-title">السلة فارغة</h1>
        <Link className="btn-primary mt-6 inline-block" to="/">
          تصفح المنتجات
        </Link>
      </div>
    )

  const isSubmitting = checkout.isPending || submitting.current

  return (
    <div className="container-page py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--text-3)]">
        <Link to="/" className="hover:text-[var(--primary)]">الرئيسية</Link>
        <span>/</span>
        <Link to="/cart" className="hover:text-[var(--primary)]">السلة</Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text)]">إتمام الطلب</span>
      </nav>

      <h1 className="section-title mb-8">إتمام الطلب</h1>

      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ── Main form column ─────────────────────────── */}
          <div className="space-y-5">

            {/* Section 1 — Contact info */}
            <div className="checkout-card">
              <SectionHeader step={1} title="معلومات التواصل" />
              <div className="space-y-4">

                <Field id="name" label="الاسم الكامل" error={errs.name?.message}>
                  {(inputProps) => (
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="مثال: سارة أحمد"
                      disabled={isSubmitting}
                      {...inputProps}
                      {...form.register('name')}
                    />
                  )}
                </Field>

                <Field id="phone" label="رقم الجوال" error={errs.phone?.message}>
                  {(inputProps) => (
                    <div className="relative">
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="05XXXXXXXX"
                        dir="ltr"
                        disabled={isSubmitting}
                        {...inputProps}
                        className={`${inputProps.className} ps-10`}
                        {...form.register('phone')}
                      />
                      <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-base">
                        📱
                      </span>
                    </div>
                  )}
                </Field>

              </div>
            </div>

            {/* Section 2 — Delivery address */}
            <div className="checkout-card">
              <SectionHeader step={2} title="عنوان التوصيل" />
              <div className="space-y-4">

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="city" label="المدينة" error={errs.city?.message}>
                    {(inputProps) => (
                      <input
                        id="city"
                        type="text"
                        autoComplete="address-level2"
                        placeholder="مثال: رام الله"
                        disabled={isSubmitting}
                        {...inputProps}
                        {...form.register('city')}
                      />
                    )}
                  </Field>

                  <Field id="neighborhood" label="الحي / المنطقة" error={errs.neighborhood?.message}>
                    {(inputProps) => (
                      <input
                        id="neighborhood"
                        type="text"
                        autoComplete="address-level3"
                        placeholder="مثال: البالوع"
                        disabled={isSubmitting}
                        {...inputProps}
                        {...form.register('neighborhood')}
                      />
                    )}
                  </Field>
                </div>

                <Field id="street" label="الشارع / أقرب معلم" error={errs.street?.message}>
                  {(inputProps) => (
                    <input
                      id="street"
                      type="text"
                      autoComplete="street-address"
                      placeholder="مثال: شارع الاستقلال، بجانب صيدلية النور"
                      disabled={isSubmitting}
                      {...inputProps}
                      {...form.register('street')}
                    />
                  )}
                </Field>

                <Field id="notes" label="ملاحظات التوصيل" required={false} error={errs.notes?.message}>
                  {(inputProps) => (
                    <input
                      id="notes"
                      type="text"
                      autoComplete="off"
                      placeholder="أي تعليمات خاصة للمندوب (اختياري)"
                      disabled={isSubmitting}
                      {...inputProps}
                      {...form.register('notes')}
                    />
                  )}
                </Field>

              </div>
            </div>

            {/* Section 3 — Payment */}
            <div className="checkout-card">
              <SectionHeader step={3} title="طريقة الدفع" />
              <JawwalPaymentOption sandbox={isMockMode()} />
            </div>

          </div>

          {/* ── Sidebar ──────────────────────────────────── */}
          <aside className="space-y-4 self-start lg:sticky lg:top-6">

            {/* Order summary card */}
            <div className="order-summary space-y-3">
              <h2 className="text-base font-bold">ملخص الطلب</h2>
              <div className="space-y-2">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--text-2)]">
                      {item.product_name}
                      <span className="ms-1 text-[var(--text-3)]">× {item.quantity}</span>
                    </span>
                    <b className="flex-none text-[var(--text)]">{money(item.subtotal)}</b>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-3">
                <span className="font-bold">قيمة المنتجات</span>
                <b className="text-[var(--primary)]">{money(cart.subtotal)}</b>
              </div>
              <p className="rounded-lg bg-[var(--primary-dim)] px-3 py-2 text-xs leading-relaxed text-[var(--text-2)]">
                رسوم التوصيل تظهر في الطلب بعد إنشائه — الإجمالي النهائي يُعرض قبل الدفع.
              </p>
            </div>

            {/* Info note */}
            {!isMockMode() && (
              <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-xs leading-relaxed text-[var(--text-2)]">
                <span className="mt-px text-sm">ℹ️</span>
                <p>
                  بعد إنشاء الطلب ستنتقلين لخطوة الدفع عبر جوال باي — لا يُخصم مبلغ الآن.
                </p>
              </div>
            )}
            {isMockMode() && (
              <p className="demo-note text-xs">عرض تجريبي — لا يُرسل طلب حقيقي.</p>
            )}

            {/* Uncertain / API error banners */}
            {uncertain && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="mt-0.5 text-base text-amber-500">⚠</span>
                <div className="text-sm leading-relaxed text-amber-800">
                  <b className="block mb-1">لم نتأكد من إتمام الطلب</b>
                  راجعي{' '}
                  <Link className="underline font-bold" to="/orders">
                    طلباتي
                  </Link>{' '}
                  أولاً بنفس رقم الجوال قبل المحاولة مجددًا لتجنب تكرار الطلب.
                </div>
              </div>
            )}

            {checkout.isError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <span className="mt-0.5 text-base text-red-500">✕</span>
                <p className="text-sm leading-snug text-red-700">
                  {getApiErrorMessage(checkout.error)}
                </p>
              </div>
            )}

            {/* CTA */}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isSubmitting || uncertain}
            >
              {isSubmitting
                ? 'جارٍ إنشاء الطلب…'
                : isMockMode()
                ? 'إنشاء طلب تجريبي'
                : 'إنشاء الطلب والدفع'}
            </button>

            <p className="text-center text-xs text-[var(--text-3)]">
              بإتمام الطلب توافقين على شروط الخدمة والسياسة العامة للمتجر
            </p>

          </aside>
        </div>
      </form>
    </div>
  )
}
