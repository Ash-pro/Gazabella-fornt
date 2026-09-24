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

const schema = z.object({
  name: z.string().trim().min(3, 'أدخل الاسم الكامل'),
  email: z.string().trim().email('أدخل بريدًا إلكترونيًا صحيحًا'),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{8,20}$/, 'أدخل رقم جوال صحيح'),
  address: z.string().trim().min(10, 'أدخل المدينة والحي والشارع أو أقرب معلم'),
  notes: z.string().trim().max(500, 'الحد الأقصى 500 حرف').optional(),
})
type Values = z.infer<typeof schema>

export function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const cartQuery = useQuery({ queryKey: ['cart'], queryFn: gazabellaApi.getCart })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    name: user?.name ?? '', email: user?.email ?? '', phone: '', address: '', notes: '',
  } })
  const checkout = useMutation({
    mutationFn: (values: Values) => gazabellaApi.checkout({ ...values, payment_method: 'cash_on_delivery' }),
    onSuccess: (order) => {
      queryClient.setQueryData(['cart'], { items: [], total_items: 0, subtotal: '0.00' })
      queryClient.setQueryData(['order', order.order_number], order)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate(`/orders/${encodeURIComponent(order.order_number)}`, { replace: true })
    },
  })
  if (cartQuery.isPending) return <div className="container-page"><PageLoader label="نجهّز السلة…" /></div>
  if (cartQuery.isError) return <div className="container-page"><ErrorState message={getApiErrorMessage(cartQuery.error)} onRetry={() => void cartQuery.refetch()} /></div>
  const cart = cartQuery.data
  if (!cart.items.length) return <div className="container-page py-16 text-center"><h1 className="section-title">السلة فارغة</h1><Link className="btn-primary mt-6" to="/">تصفح المنتجات</Link></div>
  return <div className="container-page py-10">
    <Link className="text-link" to="/cart">العودة إلى السلة</Link>
    <h1 className="section-title my-6">إتمام الطلب</h1>
    <form onSubmit={form.handleSubmit((values) => checkout.mutate(values))} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {isMockMode() ? <section className="checkout-card space-y-5">
        <h2 className="text-lg font-bold">بيانات التوصيل</h2>
        {([{ name: 'name', label: 'الاسم الكامل', autoComplete: 'name' }, { name: 'email', label: 'البريد الإلكتروني', autoComplete: 'email' }, { name: 'phone', label: 'رقم الجوال', autoComplete: 'tel' }, { name: 'address', label: 'المدينة والحي والشارع / أقرب معلم', autoComplete: 'street-address' }, { name: 'notes', label: 'ملاحظات التوصيل (اختياري)', autoComplete: 'off' }] as const).map((field) => <div key={field.name}>
          <label className="field-label" htmlFor={field.name}>{field.label}</label>
          <input id={field.name} className="form-field" {...form.register(field.name)} autoComplete={field.autoComplete} type={field.name === 'email' ? 'email' : field.name === 'phone' ? 'tel' : 'text'} aria-invalid={!!form.formState.errors[field.name]} aria-describedby={`${field.name}-error`} disabled={checkout.isPending} />
          <p id={`${field.name}-error`} className="field-error">{form.formState.errors[field.name]?.message}</p>
        </div>)}
        <h2 className="text-lg font-bold">الدفع عند الاستلام</h2>
        <p className="text-sm">تُدفع قيمة الطلب عند استلام المنتجات.</p>
      </section> : <section className="checkout-card space-y-5"><h2 className="text-lg font-bold">إتمام الطلب غير متاح مؤقتًا</h2><p className="leading-8">نحتاج إلى تأكيد تكلفة التوصيل والإجمالي قبل استقبال طلبكِ. اختياراتكِ محفوظة في السلة، ويمكنكِ تعديلها أو متابعة التسوق.</p><Link className="btn-primary" to="/cart">مراجعة السلة</Link></section>}
      <aside className="order-summary space-y-4 self-start">
        <h2 className="text-lg font-bold">مراجعة الطلب</h2>
        {cart.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span>{item.product_name} × {item.quantity}</span><b className="whitespace-nowrap">{money(item.subtotal)}</b></div>)}
        <div className="flex justify-between border-t pt-4"><span>قيمة المنتجات</span><b>{money(cart.subtotal)}</b></div>
        <p className="text-sm">رسوم التوصيل: لم تُحدد بعد.</p>
        {!isMockMode() && <p role="status" className="demo-note">إتمام الطلب غير متاح مؤقتًا حتى يتوفر احتساب رسوم التوصيل والإجمالي قبل التأكيد. يمكنكِ الاحتفاظ باختياراتكِ في السلة.</p>}
        {isMockMode() && <p className="demo-note">عرض تجريبي فقط؛ لا يُرسل طلب حقيقي. رسوم العرض تظهر في الطلب الناتج.</p>}
        {checkout.isError && <p role="alert" className="field-error">{getApiErrorMessage(checkout.error)}</p>}
        <button className="btn-primary w-full" disabled={!isMockMode() || checkout.isPending}>{checkout.isPending ? 'جارٍ إنشاء الطلب…' : isMockMode() ? 'إنشاء طلب تجريبي' : 'التأكيد غير متاح مؤقتًا'}</button>
      </aside>
    </form>
  </div>
}
