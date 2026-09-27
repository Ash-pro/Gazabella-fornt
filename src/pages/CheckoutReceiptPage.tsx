import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Order } from '../types/api'
import { money } from '../lib/format'
import { JawwalReferenceForm } from '../components/checkout/JawwalReferenceForm'

export function CheckoutReceiptPage() {
  const location = useLocation()
  const [order, setOrder] = useState<Order | null>(() => location.state?.order ?? null)
  if (!order) return <div className="container-page py-12"><h1 className="section-title">متابعة الطلب</h1><p className="my-5">سجّلي الدخول بنفس رقم الجوال لمراجعة طلبكِ وحالة الدفع.</p><Link className="btn-primary" to="/orders">طلباتي</Link><Link className="text-link ms-4" to="/orders/lookup">البحث بمرجع الدفع</Link></div>
  return <div className="container-page py-12 max-w-3xl">
    <h1 className="section-title">تم إنشاء طلبكِ</h1>
    <p className="my-5">رقم الطلب: <b dir="ltr">{order.order_number}</b></p>
    <section className="order-summary space-y-4">
      {order.items.map((item) => <div className="flex justify-between gap-4" key={item.id}><span>{item.product_name} × {item.quantity}</span><b>{money(item.subtotal)}</b></div>)}
      <div className="flex justify-between"><span>قيمة المنتجات</span><b>{money(order.subtotal)}</b></div>
      <div className="flex justify-between"><span>التوصيل</span><b>{money(order.delivery_fee)}</b></div>
      <div className="flex justify-between border-t pt-4"><span>الإجمالي من المتجر</span><b>{money(order.total)}</b></div>
      <p role="status">{order.payment_status === 'paid' ? 'تم تأكيد الدفع' : 'لم يُؤكد الدفع بعد'}</p>
    </section>
    <JawwalReferenceForm order={order} onConfirmed={setOrder} />
    <p className="my-5">يمكنكِ متابعة الطلب لاحقًا بتسجيل الدخول بنفس رقم الجوال.</p>
    <Link className="btn-primary" to="/orders">متابعة طلباتي</Link><Link className="text-link ms-4" to="/orders/lookup">البحث بمرجع الدفع</Link>
  </div>
}
