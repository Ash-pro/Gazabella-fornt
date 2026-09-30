import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { isMvp0Api } from '../lib/apiContract'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import type { ProfileUpdate, User } from '../types/api'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { LocationConsentDialog } from '../components/support/LocationConsentDialog'
import { useState } from 'react'
import { track } from '../lib/analytics'

const GEO_ERRORS: Record<number, string> = {
  1: 'لم يُسمح بالوصول للموقع. يمكنكِ السماح به من إعدادات المتصفح ثم إعادة المحاولة؛ تحديث الملف اختياري.',
  2: 'تعذّر تحديد موقعكِ الآن. تأكدي من تفعيل خدمات الموقع في الجهاز ثم حاولي مجدداً.',
  3: 'استغرق تحديد الموقع وقتاً طويلاً. حاولي مجدداً في مكان بإشارة أفضل.',
}

function currentLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('المتصفح لا يدعم تحديد الموقع. يمكنكِ متابعة التسوق دون تحديث الملف.'))
    navigator.geolocation.getCurrentPosition((position) => resolve(position.coords), (error) => reject(new Error(GEO_ERRORS[error.code] ?? GEO_ERRORS[2])), { maximumAge: 0, timeout: 15000, enableHighAccuracy: true })
  })
}

type ProfileFields = Omit<ProfileUpdate, 'latitude' | 'longitude'>

function ProfileForm({ user }: { user: User }) {
  const [pendingFields, setPendingFields] = useState<ProfileFields | null>(null)
  const update = useMutation({
    mutationFn: async (fields: ProfileFields) => {
      const { latitude, longitude } = await currentLocation()
      return gazabellaApi.updateProfile({ ...fields, latitude, longitude })
    },
    onSuccess: (updated) => {
      track('location_consent', { outcome: 'accepted' })
      const token = useAuthStore.getState().token
      if (token) useAuthStore.getState().setSession(token, updated)
      queryClient.setQueryData(['session'], updated)
    },
    onError: () => track('location_consent', { outcome: 'failed' }),
    onSettled: () => setPendingFields(null),
  })
  return <form className="checkout-card space-y-5" onSubmit={(event) => {
    event.preventDefault()
    if (update.isPending) return
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    update.reset()
    setPendingFields({ name: value('name'), email: value('email') || null, city: value('city') || null, address: value('address') || null, birth_date: value('birth_date') || null, gender: (value('gender') || null) as ProfileUpdate['gender'] })
  }}>
    {pendingFields && <LocationConsentDialog busy={update.isPending} onClose={() => { if (!update.isPending) { track('location_consent', { outcome: 'dismissed' }); setPendingFields(null) } }} onConfirm={() => update.mutate(pendingFields)} />}
    <p>تحديث الملف اختياري. عند الحفظ سنشرح لكِ لماذا نحتاج موقعكِ الحالي قبل أن يطلب المتصفح الإذن.</p>
    <label className="field-label block">رقم الجوال<input className="form-field mt-2" value={user.phone} readOnly dir="ltr" /></label>
    <fieldset className="space-y-4" disabled={update.isPending}>
      {([{ name: 'name', label: 'الاسم', type: 'text' }, { name: 'email', label: 'البريد الإلكتروني', type: 'email' }, { name: 'city', label: 'المدينة', type: 'text' }, { name: 'address', label: 'العنوان', type: 'text' }, { name: 'birth_date', label: 'تاريخ الميلاد', type: 'date' }] as const).map((field) => <label key={field.name} className="field-label block">{field.label}<input className="form-field mt-2" name={field.name} type={field.type} defaultValue={user[field.name] ?? ''} maxLength={255} /></label>)}
      <label className="field-label block">الجنس<select className="form-field mt-2" name="gender" defaultValue={user.gender ?? ''}><option value="">غير محدد</option><option value="female">أنثى</option><option value="male">ذكر</option></select></label>
      <button className="btn-primary" type="submit">{update.isPending ? 'جارٍ تحديد الموقع والحفظ…' : 'حفظ الملف'}</button>
    </fieldset>
    {update.isError && <p role="alert" className="field-error">{getApiErrorMessage(update.error)}</p>}
    {update.isSuccess && <p role="status">تم حفظ الملف الشخصي.</p>}
  </form>
}

export function ProfilePage() {
  const user = useQuery({ queryKey: ['session'], queryFn: gazabellaApi.getMe })
  if (isMockMode() || isMvp0Api()) return <div className="container-page py-12">تحديث الملف غير متاح في هذا الوضع. <Link to="/orders">طلباتي</Link></div>
  return <div className="container-page max-w-3xl py-12"><Link className="text-link" to="/orders">العودة إلى طلباتي</Link><h1 className="section-title my-6">الملف الشخصي</h1>{user.isPending ? <PageLoader /> : user.isError ? <ErrorState message={getApiErrorMessage(user.error)} onRetry={() => void user.refetch()} /> : <ProfileForm user={user.data} />}</div>
}
