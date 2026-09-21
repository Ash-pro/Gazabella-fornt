import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi, isMockMode } from '../../api/gazabella'
import { ProductVisual } from '../../components/product/ProductVisual'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorState, PageLoader, EmptyState } from '../../components/ui/AsyncState'
import { getApiErrorMessage } from '../../lib/apiClient'
import { money } from '../../lib/format'
import { demoSetStock } from '../../mock/demoOperations'
import type { MerchantPrepStatus, ProductDetail } from '../../types/api'

export function MerchantDashboard() {
  const client = useQueryClient()
  const [storeId, setStoreId] = useState(1)
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState<ProductDetail | null>(null)
  const [stock, setStock] = useState<Record<number,string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const stores = useQuery({queryKey:['merchant-stores'],queryFn:gazabellaApi.getMerchantStores})
  const stats = useQuery({queryKey:['merchant-stats',storeId],queryFn:() => gazabellaApi.getMerchantStats(storeId)})
  const products = useQuery({queryKey:['merchant-products',storeId],queryFn:() => gazabellaApi.getMerchantProducts(storeId)})
  const orders = useQuery({queryKey:['merchant-orders',storeId],queryFn:() => gazabellaApi.getMerchantOrders(storeId)})
  const current = stores.data?.find((s) => s.id === storeId)
  const prep = useMutation({mutationFn:({id,status}:{id:number;status:MerchantPrepStatus}) => gazabellaApi.updateOrderPrepStatus(id,status),onSuccess:() => { setMessage('تم حفظ حالة التجهيز التجريبية.'); void client.invalidateQueries({queryKey:['merchant-orders']}); void client.invalidateQueries({queryKey:['merchant-stats']}); void client.invalidateQueries({queryKey:['orders']}); void client.invalidateQueries({queryKey:['order']}) },onError:(e) => setError(getApiErrorMessage(e))})
  const editProduct = useMutation({mutationFn:gazabellaApi.getProduct,onSuccess:(p) => {setEditing(p);setStock(Object.fromEntries(p.variants.map((v) => [v.id,String(v.available_quantity)])));setError('')},onError:(e) => setError(getApiErrorMessage(e))})
  const saveStock = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing || !isMockMode()) return
    try {
      const changes = editing.variants.map((v) => ({id:v.id,quantity:Number(stock[v.id])}))
      if (changes.some((v) => !Number.isInteger(v.quantity) || v.quantity < 0 || v.quantity > 10000 || stock[v.id] === '')) throw new Error('أدخلي كمية صحيحة من 0 إلى 10000 لكل نوع.')
      changes.forEach((v) => demoSetStock(v.id,v.quantity))
      setEditing(null);setMessage('تم حفظ المخزون التجريبي وتحديث توافر المنتجات.')
      for (const key of ['merchant-products','merchant-stats','products','product']) void client.invalidateQueries({queryKey:[key]})
    } catch(e) {setError(getApiErrorMessage(e))}
  }
  const dataError = stores.error || stats.error || products.error || orders.error
  const tabs = [['overview','نظرة عامة'],['orders','تجهيز الطلبات'],['inventory','المنتجات والمخزون'],['profile','ملف المتجر']]
  const prepLabels: Record<MerchantPrepStatus,string> = {pending:'بانتظار التجهيز',preparing:'قيد التجهيز',ready_for_pickup:'جاهز للمندوب',picked_up:'استلمه المندوب'}
  return <div className="ops-page"><div className="container-page">
    <header className="ops-header"><div><span className="eyebrow">مساحة الشركاء</span><h1>لوحة المتجر</h1><p>متابعة واضحة للطلبات والمخزون، خطوة بخطوة.</p></div><Link className="btn-ghost" to="/">العودة إلى المتجر</Link></header>
    <div className="ops-store"><label htmlFor="store">المتجر التجريبي</label><select className="select-field" id="store" value={storeId} onChange={(e) => {setStoreId(Number(e.target.value));setMessage('');setError('')}}>{stores.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><span>{current?.city} · {current?.area}</span></div>
    <nav className="ops-tabs" aria-label="أقسام لوحة المتجر">{tabs.map(([id,label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {message && <p className="ops-success" role="status">{message}</p>}{error && !editing && <p className="field-error" role="alert">{error}</p>}
    {dataError ? <ErrorState message={getApiErrorMessage(dataError)} onRetry={() => void client.invalidateQueries({queryKey:['merchant-stores']}).then(() => Promise.all([stats.refetch(),products.refetch(),orders.refetch()]))} /> : stores.isLoading || stats.isLoading || products.isLoading || orders.isLoading ? <PageLoader /> : <>
      {tab === 'overview' && <><div className="ops-stats">{[['قيمة طلبات اليوم',money(stats.data?.today_sales || 0)],['طلبات اليوم',stats.data?.today_orders_count ?? 0],['قيد التجهيز',stats.data?.pending_prep_count ?? 0],['جاهز للاستلام',stats.data?.ready_for_pickup_count ?? 0]].map(([label,value]) => <section key={label}><p>{label}</p><b>{value}</b></section>)}</div><section className="checkout-card mt-6"><h2 className="text-lg font-bold">أولويات اليوم</h2><p className="my-4 text-sm leading-7">راجعي الطلبات قيد التجهيز، ثم حدّثي حالتها عند جاهزيتها. يوجد {stats.data?.low_stock_items_count ?? 0} منتج بمخزون منخفض.</p><div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={() => setTab('orders')}>عرض طلبات التجهيز</button><button className="btn-ghost" onClick={() => setTab('inventory')}>مراجعة المخزون</button></div></section></>}
      {tab === 'orders' && (orders.data?.length ? <div className="grid gap-4 md:grid-cols-2">{orders.data.map((item) => <article className="checkout-card" key={item.id}><div className="flex flex-wrap justify-between gap-3"><b className="text-sm text-[var(--primary)]" dir="ltr">{item.order_number}</b><span className="text-xs">{prepLabels[item.prep_status]}</span></div><h2 className="mt-4 text-base font-bold">{item.product_name}</h2><p className="my-2 text-sm text-[var(--text-2)]">{item.variant_name} · {item.quantity} قطعة · {money(item.subtotal)}</p><p className="mb-5 text-xs text-[var(--text-3)]">{item.customer_name} · {item.customer_area}</p>{['pending','preparing'].includes(item.prep_status) && <button className="btn-primary w-full" disabled={prep.isPending} onClick={() => prep.mutate({id:item.id,status:'ready_for_pickup'})}>جاهز لاستلام المندوب</button>}</article>)}</div> : <EmptyState title="لا توجد طلبات تجهيز" message="ستظهر طلبات هذا المتجر هنا بعد تأكيدها." />)}
      {tab === 'inventory' && <div className="ops-inventory">{products.data?.map((p) => <article key={p.id}><div className="size-20 overflow-hidden rounded-lg"><ProductVisual src={p.thumbnail_url} alt={p.name} /></div><div className="flex-1 min-w-0"><p className="text-xs text-[var(--text-3)]">{p.category_name}</p><h2 className="my-1 text-sm font-bold">{p.name}</h2><p className="text-xs">{p.variants_count} أنواع · من {money(p.min_price)}</p></div><div className="text-center"><b className={p.total_stock < 5 ? 'text-[var(--warning)]' : ''}>{p.total_stock}</b><small className="block text-[10px]">قطعة</small></div><button className="btn-ghost text-xs" disabled={editProduct.isPending} onClick={() => editProduct.mutate(p.slug)}>تعديل المخزون</button></article>)}</div>}
      {tab === 'profile' && <section className="checkout-card max-w-2xl"><h2 className="mb-5 text-lg font-bold">بيانات المتجر</h2><dl className="space-y-4 text-sm">{[['الاسم',current?.name],['الجوال',current?.phone],['المدينة',current?.city],['المنطقة',current?.area],['العمولة',current?.commission_rate]].map(([label,value]) => <div className="flex justify-between gap-6 border-b border-[var(--border)] pb-3" key={label}><dt>{label}</dt><dd>{value || 'غير محدد'}</dd></div>)}</dl><p className="demo-note mt-5">بيانات تجريبية للعرض أمام الشركاء.</p></section>}
    </>}
    {editing && <Dialog title={'مخزون ' + editing.name} onClose={() => setEditing(null)}><form onSubmit={saveStock} className="space-y-4 p-5"><p className="demo-note">تُحفظ التغييرات محليًا ضمن Mock Mode.</p>{editing.variants.map((v) => <label className="field-label block" key={v.id}>{v.name}<input className="form-field mt-2" type="number" min={0} max={10000} step={1} required value={stock[v.id] ?? ''} onChange={(e) => setStock({...stock,[v.id]:e.target.value})} /></label>)}{error && <p className="field-error" role="alert">{error}</p>}<button className="btn-primary w-full">حفظ المخزون</button></form></Dialog>}
  </div></div>
}
