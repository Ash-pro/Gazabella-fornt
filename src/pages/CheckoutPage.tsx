import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { PageLoader } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import { useCheckoutStore } from '../stores/checkoutStore'
import { money } from '../lib/format'

const schema = z.object({
  name: z.string().trim().min(3, 'أدخل الاسم الكامل'),
  email: z.string().trim().email('أدخل بريدًا إلكترونيًا صحيحًا'),
  phone: z.string().trim().min(8, 'أدخل رقم جوال صحيح'),
  address: z.string().trim().min(10, 'أضف تفاصيل كافية للعنوان'),
  notes: z.string().max(500).optional(),
})
type Values = z.infer<typeof schema>

export function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setConfirmed = useCheckoutStore((s) => s.setConfirmedOrderNumber)

  // جلب السلة
  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: gazabellaApi.getCart,
  })

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: '',
      address: '',
      notes: '',
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: (v: Values) =>
      gazabellaApi.checkout({
        name: v.name,
        email: v.email,
        phone: v.phone,
        address: v.address,
        notes: v.notes || undefined,
      }),
    onSuccess: (order) => {
      setConfirmed(isMockMode() ? order.order_number : String(order.id))
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      try { sessionStorage.setItem('gz_order_confirmed', isMockMode() ? order.order_number : String(order.id)) } catch {}
      navigate(`/orders/${isMockMode() ? order.order_number : order.id}?created=1`, { replace: true })
    },
  })

  if (cartQuery.isLoading) {
    return <div className="container-page"><PageLoader label="نجهّز السلة…" /></div>
  }

  const cart = cartQuery.data
  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-10 text-center">
        <p className="mb-4 text-[var(--text-2)]">السلة فارغة.</p>
        <Link className="btn-primary" to="/">تصفح المنتجات</Link>
      </div>
    )
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/cart" className="text-link mb-6">
        <Icon name="arrow" className="size-4" /> العودة إلى السلة
      </Link>
      <span className="eyebrow block">خطوة واحدة وننفذ طلبكِ</span>
      <h1 className="section-title mt-2">إتمام الطلب</h1>

      <form
        className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start mt-8"
        onSubmit={form.handleSubmit((v) => checkoutMutation.mutate(v))}
      >
        {/* ── بيانات التوصيل ── */}
        <section className="checkout-card space-y-4">
          <h2 className="text-xl font-bold">بيانات التوصيل</h2>

          <label className="field-label">
            الاسم الكامل
            <input
              className="form-field mt-2"
              {...form.register('name')}
              autoComplete="name"
              placeholder="سارة أحمد"
            />
            {form.formState.errors.name && (
              <span className="field-error">{form.formState.errors.name.message}</span>
            )}
          </label>

          <label className="field-label">
            البريد الإلكتروني
            <input
              className="form-field mt-2"
              type="email"
              dir="ltr"
              {...form.register('email')}
              autoComplete="email"
              placeholder="example@gmail.com"
            />
            {form.formState.errors.email && (
              <span className="field-error">{form.formState.errors.email.message}</span>
            )}
          </label>

          <label className="field-label">
            رقم الجوال
            <input
              className="form-field mt-2"
              type="tel"
              dir="ltr"
              inputMode="tel"
              {...form.register('phone')}
              autoComplete="tel"
              placeholder="0591234567"
            />
            {form.formState.errors.phone && (
              <span className="field-error">{form.formState.errors.phone.message}</span>
            )}
          </label>

          <label className="field-label sm:col-span-2">
            العنوان التفصيلي
            <textarea
              className="form-field mt-2"
              rows={3}
              {...form.register('address')}
              autoComplete="street-address"
              placeholder="المدينة، الحي، اسم الشارع، أقرب معلم…"
            />
            {form.formState.errors.address && (
              <span className="field-error">{form.formState.errors.address.message}</span>
            )}
          </label>

          <label className="field-label">
            ملاحظة للتوصيل (اختياري)
            <textarea
              className="form-field mt-2"
              rows={2}
              maxLength={500}
              {...form.register('notes')}
              placeholder="أي تفاصيل تساعدنا على الوصول إليكِ"
            />
          </label>
        </section>

        {/* ── ملخص الطلب ── */}
        <aside className="order-summary lg:sticky lg:top-40">
          <h2 className="text-lg font-bold">ملخص اختياراتكِ</h2>

          <div className="my-5 space-y-3 border-y border-[var(--border)] py-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span>
                  {item.product_name}
                  <small className="block mt-1 text-[var(--text-3)]">
                    {item.variant_name} × <span className="num">{item.quantity}</span>
                  </small>
                </span>
                <b className="whitespace-nowrap">
                  <span className="num">{money(item.subtotal)}</span>
                </b>
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t border-[var(--border)] pt-4 font-bold">
            <span>المجموع</span>
            <span className="text-xl text-[var(--primary)]">
              <span className="num">{money(cart.subtotal)}</span>
            </span>
          </div>

          {checkoutMutation.isError && (
            <p className="field-error mt-4" role="alert">
              {getApiErrorMessage(checkoutMutation.error)}
            </p>
          )}

          <button
            className="btn-primary w-full mt-6"
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? 'جارٍ إرسال الطلب…' : 'تأكيد الطلب'}
            <Icon name="arrow" className="size-4 rotate-180" />
          </button>

          <p className="mt-4 text-center text-xs text-[var(--text-3)]">
            الدفع عند الاستلام • طلب واحد • إجمالي واضح
          </p>
        </aside>
      </form>
    </div>
  )
}
