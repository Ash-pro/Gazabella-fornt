import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { isMvp0Api } from '../lib/apiContract'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import type { ProfileUpdate, User } from '../types/api'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'

function currentLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('المتصفح لا يدعم تحديد الموقع. يمكنكِ متابعة التسوق دون تحديث الملف.'))
    navigator.geolocation.getCurrentPosition((position) => resolve(position.coords), () => reject(new Error('تعذر الوصول لموقعكِ الحالي. اسمحي بالموقع ثم حاولي مجددًا؛ تحديث الملف اختياري.')), { maximumAge: 0, timeout: 15000, enableHighAccuracy: true })
  })
}

function ProfileForm({ user }: { user: User }) {
  const update = useMutation({
    mutationFn: async (fields: Omit<ProfileUpdate, 'latitude' | 'longitude'>) => {
      const { latitude, longitude } = await currentLocation()
      return gazabellaApi.updateProfile({ ...fields, latitude, longitude })
    },
    onSuccess: (updated) => {
      const token = useAuthStore.getState().token
      if (token) useAuthStore.getState().setSession(token, updated)
      queryClient.setQueryData(['session'], updated)
    },
  })
  return <form className="checkout-card space-y-5" onSubmit={(event) => {
    event.preventDefault()
    if (update.isPending) return
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    update.mutate({ name: value('name'), email: value('email') || null, city: value('city') || null, address: value('address') || null, birth_date: value('birth_date') || null, gender: (value('gender') || null) as ProfileUpdate['gender'] })
  }}>
    <p>تحديث الملف اختياري. عند الحفظ سيطلب المتصفح إذنكِ لإرسال موقعكِ الحالي مع البيانات.</p>
    <label className="field-label block">رقم الجوال<input className="form-field mt-2" value={user.phone} readOnly dir="ltr" /></label>
    <fieldset className="space-y-4" disabled={update.isPending}>
      {([{ name: 'name', label: 'الاسم', type: 'text' }, { name: 'email', label: 'البريد الإلكتروني', type: 'email' }, { name: 'city', label: 'المدينة', type: 'text' }, { name: 'address', label: 'العنوان', type: 'text' }, { name: 'birth_date', label: 'تاريخ الميلاد', type: 'date' }] as const).map((field) => <label key={field.name} className="field-label block">{field.label}<input className="form-field mt-2" name={field.name} type={field.type} defaultValue={user[field.name] ?? ''} maxLength={255} /></label>)}
      <label className="field-label block">الجنس<select className="form-field mt-2" name="gender" defaultValue={user.gender ?? ''}><option value="">غير محدد</option><option value="female">أنثى</option><option value="male">ذكر</option></select></label>
      <button className="btn-primary" type="submit">{update.isPending ? 'جارٍ تحديد الموقع والحفظ…' : 'مشاركة موقعي وحفظ الملف'}</button>
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
