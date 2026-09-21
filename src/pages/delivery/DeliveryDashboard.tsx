import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { demoConfirmDelivery } from '../../mock/demoOperations'
import { getApiErrorMessage } from '../../lib/apiClient'
import { gazabellaApi, isMockMode } from '../../api/gazabella'
import { Icon } from '../../components/ui/Icon'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorState, PageLoader } from '../../components/ui/AsyncState'
import type { DeliveryStatus, DeliveryMission } from '../../types/api'

export function DeliveryDashboard() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [pinModalMission, setPinModalMission] = useState<DeliveryMission | null>(null)
  const [enteredPin, setEnteredPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  const statsQuery = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: gazabellaApi.getDeliveryStats,
  })

  const missionsQuery = useQuery({
    queryKey: ['delivery-missions'],
    queryFn: () => gazabellaApi.getDeliveryMissions(),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ missionId, status, notes }: { missionId: number; status: DeliveryStatus; notes?: string }) =>
      gazabellaApi.updateDeliveryStatus(missionId, status, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-missions'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] })
      queryClient.invalidateQueries({queryKey:['order']})
      queryClient.invalidateQueries({queryKey:['orders']})
      queryClient.invalidateQueries({queryKey:['merchant-orders']})
      const label =
        variables.status === 'delivered'
          ? 'تم تأكيد تسليم الطلب للزبون بنجاح'
          : variables.status === 'in_transit'
          ? 'بدأ المندوب خط السير للتوصيل'
          : 'تم تحديث حالة التوصيل'
      setSuccessToast(label)
      setTimeout(() => setSuccessToast(null), 3500)
    },
  })

  const confirmDelivery = useMutation({
    mutationFn: async ({id,pin}: {id:number;pin:string}) => { if (!isMockMode()) throw new Error('التحقق من التسليم ينتظر ربط الباك اند.'); return demoConfirmDelivery(id,pin) },
    onSuccess: () => { setPinModalMission(null); setSuccessToast('تم التحقق من الرمز وتسليم الطلب التجريبي'); void queryClient.invalidateQueries({queryKey:['delivery-missions']}); void queryClient.invalidateQueries({queryKey:['delivery-stats']}); void queryClient.invalidateQueries({queryKey:['orders']}); void queryClient.invalidateQueries({queryKey:['order']}) },
    onError: (error) => setPinError(getApiErrorMessage(error)),
  })
  // تصفية المهام حسب الحالة والمنطقة
  const filteredMissions = (missionsQuery.data || []).filter((m) => {
    const matchStatus = statusFilter === 'all' || m.delivery_status === statusFilter
    const matchArea = selectedArea === 'all' || (m.area + m.city).includes(selectedArea)
    return matchStatus && matchArea
  })

  return (
    <div className="min-h-screen bg-[var(--surface2)] pb-16 pt-4 text-[var(--text)]">
      {/* الشريط العلوي للوحة التوصيل */}
      <div className="container-page mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-sm">
              <Icon name="truck" className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  شبكة التوزيع الموحد
                </span>
                <span className="text-xs text-[var(--text-3)]">خانيونس</span>
              </div>
              <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">
                لوحة طلبات التوصيل والمناديب
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['delivery-missions'] })
                queryClient.invalidateQueries({ queryKey: ['delivery-stats'] })
              }}
              className="btn-ghost !min-h-[2.5rem] !py-1.5 text-xs font-bold gap-1.5"
            >
              <Icon name="refresh" className="size-3.5" /> تحديث المهام
            </button>
            <Link to="/" className="btn-ghost !min-h-[2.5rem] !py-1.5 text-xs font-bold gap-1.5">
              <Icon name="arrow" className="size-3.5" /> العودة للمتجر
            </Link>
          </div>
        </div>

        {/* إشعار التحديث اللحظي */}
        {successToast && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all">
            <div className="flex items-center gap-2">
              <Icon name="check" className="size-5" />
              <span>{successToast}</span>
            </div>
            <button aria-label="إغلاق الإشعار" onClick={() => setSuccessToast(null)} className="text-white/80 hover:text-white">
              <Icon name="close" className="size-4" />
            </button>
          </div>
        )}

        {/* بطاقات المؤشرات الأربع */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-2)]">
              <span className="text-xs font-bold">إجمالي الشحنات النشطة</span>
              <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Icon name="truck" className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[var(--text)]">
                {statsQuery.isLoading ? '—' : statsQuery.data?.total_active_deliveries ?? 0}
              </span>
              <span className="text-xs font-medium text-[var(--text-2)]">طلب قيد الدورة</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-2)]">
              <span className="text-xs font-bold">بانتظار الاستلام من التجار</span>
              <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Icon name="store" className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600">
                {statsQuery.isLoading ? '—' : statsQuery.data?.pending_pickup_count ?? 0}
              </span>
              <span className="text-xs font-medium text-[var(--text-2)]">بانتظار السائق</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-2)]">
              <span className="text-xs font-bold">مع المناديب في الطريق</span>
              <div className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <Icon name="mapPin" className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-purple-700">
                {statsQuery.isLoading ? '—' : statsQuery.data?.in_transit_count ?? 0}
              </span>
              <span className="text-xs font-medium text-[var(--text-2)]">جاري التوصيل للزبائن</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-2)]">
              <span className="text-xs font-bold">مبالغ التحصيل نقداً (COD)</span>
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon name="dollar" className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600">
                ₪{statsQuery.data?.cash_to_collect_total ?? '0.00'}
              </span>
              <span className="text-xs font-medium text-[var(--text-2)]">يتم توريدها للمكتب</span>
            </div>
          </div>
        </div>

        {/* فلاتر البحث والمناطق */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
          {/* فلتر الحالة */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-2)]">حالة الشحنة:</span>
            {[
              { id: 'all', label: 'جميع الطلبات' },
              { id: 'pending_pickup', label: 'استلام من التاجر' },
              { id: 'in_transit', label: 'في الطريق للزبون' },
              { id: 'delivered', label: 'تم التسليم بنجاح' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--surface2)] text-[var(--text-2)] hover:bg-[var(--primary-dim)] hover:text-[var(--primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* فلتر مناطق غزة */}
          <div className="flex items-center gap-2">
            <label htmlFor="area-filter" className="text-xs font-bold text-[var(--text-2)]">
              تصفية بالمنطقة:
            </label>
            <select
              id="area-filter"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="select-field !h-9 !py-0 text-xs font-bold"
            >
              <option value="all">كافة المناطق</option>
              <option value="حي الأمل">حي الأمل</option>
              <option value="وسط البلد">وسط البلد</option>
              <option value="حي المنارة">حي المنارة</option>
              <option value="خانيونس">خانيونس</option>
            </select>
          </div>
        </div>
      </div>

{statsQuery.isError && <p className="container-page field-error" role="alert">{getApiErrorMessage(statsQuery.error)}</p>}
      {updateStatusMutation.isError && <p className="container-page field-error" role="alert">{getApiErrorMessage(updateStatusMutation.error)}</p>}
      {/* قائمة مهام التوصيل */}
      <div className="container-page">
        {missionsQuery.isError ? <ErrorState message={getApiErrorMessage(missionsQuery.error)} onRetry={() => void missionsQuery.refetch()} /> : missionsQuery.isLoading ? (
          <PageLoader label="نحمّل قائمة مهام التوصيل…" />
        ) : filteredMissions.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-12 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-[var(--surface2)] text-[var(--text-3)]">
              <Icon name="check" className="size-6" />
            </div>
            <h3 className="text-base font-extrabold">لا توجد شحنات مطابقة للفلاتر المختارة</h3>
            <p className="mt-1 text-xs text-[var(--text-2)]">يمكنك تغيير فلتر الحالة أو المنطقة لإظهار بقية المهام.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredMissions.map((mission) => {
              const isDelivered = mission.delivery_status === 'delivered'
              const isInTransit = mission.delivery_status === 'in_transit'
              const isPendingPickup = mission.delivery_status === 'pending_pickup'
              const isPickedUp = mission.delivery_status === 'picked_up'

              return (
                <div
                  key={mission.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${
                    isDelivered
                      ? 'border-emerald-200 bg-emerald-50/15'
                      : isInTransit
                      ? 'border-purple-200 bg-purple-50/15'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {/* رأس بطاقة المهمة */}
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-[var(--primary)]">
                          {mission.order_number}
                        </span>
                        <span className="text-xs text-[var(--text-3)]">({mission.items_count} أصناف)</span>
                      </div>
                      <h3 className="mt-1 text-base font-extrabold text-[var(--text)]">
                        {mission.customer_name}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isInTransit
                          ? 'bg-purple-100 text-purple-800'
                          : isPickedUp
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isDelivered
                        ? 'تم التسليم بنجاح'
                        : isInTransit
                        ? 'في الطريق للزبون'
                        : isPickedUp
                        ? 'تم الاستلام بالمستودع'
                        : 'بانتظار الاستلام من التاجر'}
                    </span>
                  </div>

                  {/* تفاصيل العنوان ومتاجر الاستلام */}
                  <div className="my-3 space-y-2.5 text-xs">
                    <div className="flex items-start gap-2">
                      <Icon name="mapPin" className="size-4 shrink-0 text-[var(--primary)] mt-0.5" />
                      <div>
                        <span className="font-bold text-[var(--text)]">
                          {mission.city} — {mission.area}
                        </span>
                        <div className="text-[var(--text-2)]">{mission.address_details}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Icon name="store" className="size-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-bold text-[var(--text)]">نقاط استلام البضاعة من التجار:</span>
                        <div className="text-[var(--text-2)]">
                          {mission.pickup_stores.join(' + ')}
                        </div>
                      </div>
                    </div>

                    {mission.delivery_notes && (
                      <div className="rounded-xl bg-amber-50 p-2.5 text-amber-900 border border-amber-200">
                        <strong>ملاحظة الزبون:</strong> {mission.delivery_notes}
                      </div>
                    )}
                  </div>

                  {/* الجزء المالي وبيانات التواصل */}
                  <div className="my-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface2)] p-3 text-xs">
                    <div>
                      <span className="text-[var(--text-3)]">حالة وطريقة الدفع:</span>
                      <div className="font-bold">
                        {mission.payment_method === 'jawwal_pay' && mission.payment_status === 'paid' ? (
                          <span className="text-emerald-700 font-extrabold">مدفوع إلكترونياً (Jawwal Pay)</span>
                        ) : (
                          <span className="text-amber-800 font-extrabold">
                            {mission.payment_method === 'jawwal_pay' ? 'بانتظار تأكيد الدفع الإلكتروني' : `تحصيل نقدي: ₪${mission.total_amount}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${mission.customer_phone}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 font-mono text-xs font-bold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        title="اتصال هاتفي"
                      >
                        <Icon name="phone" className="size-3.5" />
                        <span>{mission.customer_phone}</span>
                      </a>
                      <a
                        href={`https://wa.me/${mission.customer_phone.replace(/^\+/, '').replace(/^0/, '970')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        title="محادثة واتساب سريعة"
                      >
                        <Icon name="externalLink" className="size-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* السائق وأزرار تغيير الحالة */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                    <div className="text-xs text-[var(--text-3)]">
                      المندوب المكلف: <span className="font-bold text-[var(--text)]">{mission.driver_name || 'غير محدد'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPendingPickup && (
                        <button
                          type="button"
                          onClick={() => updateStatusMutation.mutate({ missionId: mission.id, status: 'picked_up' })}
                          disabled={updateStatusMutation.isPending || (mission.payment_method === 'jawwal_pay' && mission.payment_status !== 'paid')}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          تم الاستلام من التاجر
                        </button>
                      )}

                      {isPickedUp && (
                        <button
                          type="button"
                          onClick={() => updateStatusMutation.mutate({ missionId: mission.id, status: 'in_transit' })}
                          disabled={updateStatusMutation.isPending || (mission.payment_method === 'jawwal_pay' && mission.payment_status !== 'paid')}
                          className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700"
                        >
                          بدء التوصيل للزبون
                        </button>
                      )}

                      {isInTransit && (
                        <button
                          type="button"
                          onClick={() => {
                            setPinModalMission(mission)
                            setEnteredPin('')
                            setPinError(null)
                          }}
                          disabled={updateStatusMutation.isPending || (mission.payment_method === 'jawwal_pay' && mission.payment_status !== 'paid')}
                          className="btn-primary !min-h-[2.2rem] !px-3 !py-1 text-xs font-bold gap-1"
                        >
                          <Icon name="check" className="size-3.5" /> تأكيد التسليم (PIN)
                        </button>
                      )}

                      {isDelivered && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <Icon name="check" className="size-4" /> تم التسليم وتوريد الطلب
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* نافذة إدخال كود الـ PIN السري للتسليم */}
      {pinModalMission && (
        <Dialog title="تأكيد التسليم بالرمز" onClose={() => setPinModalMission(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
            <div className="py-4">
              <p className="text-xs text-[var(--text-2)] leading-6">
                يرجى طلب كود الأمان المكون من 4 أرقام من الزبون <b>({pinModalMission.customer_name})</b> لإثبات استلامه الفعلي للطلب:
              </p>
              <div className="mt-4">
                <input
                  type="text"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value.replace(/\D/g, ''))
                    setPinError(null)
                  }}
                  aria-label="رمز تسليم الطلب"
                  inputMode="numeric"
                  placeholder="••••"
                  className="otp-field !h-14 !text-2xl text-center font-mono tracking-[0.5em] w-full"
                  autoFocus
                />
                {pinError && <p className="field-error text-center mt-2">{pinError}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={() => {
                  if (enteredPin.length !== 4) {
                    setPinError('يرجى إدخال كود PIN صحيح مكون من 4 أرقام')
                    return
                  }
                  confirmDelivery.mutate({id:pinModalMission.id,pin:enteredPin})
                }}
                disabled={confirmDelivery.isPending}
                className="btn-primary flex-1 text-xs font-bold"
              >
                {confirmDelivery.isPending ? 'جاري التحقق…' : 'إتمام وتأكيد التسليم'}
              </button>
              <button
                type="button"
                onClick={() => setPinModalMission(null)}
                className="btn-ghost text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
