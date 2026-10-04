import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useRef, useState } from 'react'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { isMvp0Api } from '../lib/apiContract'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import type { ProfileUpdate, User } from '../types/api'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { LocationConsentDialog } from '../components/support/LocationConsentDialog'
import { AccountRights } from '../components/account/AccountRights'
import { track } from '../lib/analytics'
import { AccountShell } from '../components/account/AccountShell'
import { Icon } from '../components/ui/Icon'
import { useStoreInfo } from '../hooks/useStoreInfo'

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

const COMPLETENESS: ReadonlyArray<{ key: keyof User; label: string; section: string }> = [
  { key: 'name', label: 'الاسم', section: 'personal' },
  { key: 'email', label: 'البريد', section: 'personal' },
  { key: 'birth_date', label: 'تاريخ الميلاد', section: 'personal' },
  { key: 'gender', label: 'الجنس', section: 'personal' },
  { key: 'city', label: 'المدينة', section: 'address' },
  { key: 'address', label: 'العنوان', section: 'address' },
]

const hasValue = (user: User, key: keyof User) => {
  const v = user[key]
  return typeof v === 'string' ? v.trim() !== '' && !(key === 'name' && /^\+?\d+$/.test(v.trim())) : v != null
}

function SectionHead({ icon, title, hint }: { icon: 'user' | 'truck' | 'shield'; title: string; hint: string }) {
  return (
    <div className="acct-section__head">
      <span className="acct-section__icon"><Icon name={icon} className="size-5" /></span>
      <div><h2>{title}</h2><p>{hint}</p></div>
    </div>
  )
}

function ProfileCompleteness({ user }: { user: User }) {
  const missing = COMPLETENESS.filter((f) => !hasValue(user, f.key))
  const percent = Math.round(((COMPLETENESS.length - missing.length) / COMPLETENESS.length) * 100)
  return (
    <div className="acct-aside-card">
      <div className="flex items-center justify-between text-sm font-bold"><span>اكتمال الملف</span><span className="num text-[var(--primary)]">{percent}%</span></div>
      <div className="acct-meter" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة اكتمال الملف"><i style={{ width: `${percent}%` }} /></div>
      {missing.length ? (
        <>
          <p className="mt-3 text-xs leading-6 text-[var(--text-2)]">أكملي بياناتكِ لتجربة توصيل أسرع:</p>
          <div className="acct-missing">{missing.map((f) => <a key={f.key} href={`#field-${f.key}`}>{f.label}</a>)}</div>
        </>
      ) : <p className="mt-3 flex items-center gap-2 text-xs text-[var(--success)]"><Icon name="check" className="size-4" />ملفكِ مكتمل</p>}
    </div>
  )
}

function ProfileForm({ user }: { user: User }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [dirty, setDirty] = useState(false)
  const [pendingFields, setPendingFields] = useState<ProfileFields | null>(null)
  const store = useStoreInfo()
  const update = useMutation({
    mutationFn: async ({ fields, withLocation }: { fields: ProfileFields; withLocation: boolean }) => {
      if (!withLocation) return gazabellaApi.updateProfile(fields)
      const { latitude, longitude } = await currentLocation()
      return gazabellaApi.updateProfile({ ...fields, latitude, longitude })
    },
    onSuccess: (updated, { withLocation }) => {
      track('location_consent', { outcome: withLocation ? 'accepted' : 'skipped' })
      const token = useAuthStore.getState().token
      if (token) useAuthStore.getState().setSession(token, updated)
      queryClient.setQueryData(['session'], updated)
      setDirty(false)
    },
    onError: () => track('location_consent', { outcome: 'failed' }),
    onSettled: () => setPendingFields(null),
  })
  const field = (key: 'name' | 'email' | 'birth_date' | 'city' | 'address') => ({ id: `field-${key}`, name: key, defaultValue: user[key] ?? '', maxLength: 255, className: 'form-field mt-2' })

  return <form ref={formRef} className="acct-profile__form"
    onChange={() => { if (!dirty) setDirty(true); if (update.isSuccess || update.isError) update.reset() }}
    onReset={() => { setDirty(false); update.reset() }}
    onSubmit={(event) => {
      event.preventDefault()
      if (update.isPending) return
      const data = new FormData(event.currentTarget)
      const value = (key: string) => String(data.get(key) ?? '').trim()
      update.reset()
      setPendingFields({ name: value('name'), email: value('email') || null, city: value('city') || null, address: value('address') || null, birth_date: value('birth_date') || null, gender: (value('gender') || null) as ProfileUpdate['gender'] })
    }}>
    {pendingFields && <LocationConsentDialog busy={update.isPending} onClose={() => { if (!update.isPending) { track('location_consent', { outcome: 'dismissed' }); setPendingFields(null) } }} onConfirm={() => update.mutate({ fields: pendingFields, withLocation: true })} onSkip={() => update.mutate({ fields: pendingFields, withLocation: false })} />}
    <fieldset disabled={update.isPending} className="contents">
      <section id="personal" className="acct-section">
        <SectionHead icon="user" title="المعلومات الشخصية" hint="نخاطبكِ باسمكِ ونرسل تحديثات طلباتكِ إلى بريدكِ إن أضفتِه." />
        <div className="acct-grid">
          <label className="acct-field">الاسم<input {...field('name')} autoComplete="name" required minLength={2} /></label>
          <label className="acct-field">رقم الجوال<input className="form-field mt-2" value={user.phone} readOnly dir="ltr" aria-describedby="phone-hint" /><small id="phone-hint">رقم تسجيل الدخول — لا يمكن تغييره من هنا.</small></label>
          <label className="acct-field">البريد الإلكتروني <span className="text-[var(--text-3)] font-normal">(اختياري)</span><input {...field('email')} type="email" autoComplete="email" dir="ltr" placeholder="name@example.com" /></label>
          <label className="acct-field">تاريخ الميلاد <span className="text-[var(--text-3)] font-normal">(اختياري)</span><input {...field('birth_date')} type="date" max={new Date().toISOString().slice(0, 10)} /></label>
          <fieldset className="acct-field span-2" id="field-gender">
            <legend>الجنس <span className="text-[var(--text-3)] font-normal">(اختياري)</span></legend>
            <div className="acct-segment">
              {([['', 'غير محدد'], ['female', 'أنثى'], ['male', 'ذكر']] as const).map(([v, label]) => (
                <label key={v || 'none'}><input type="radio" name="gender" value={v} defaultChecked={(user.gender ?? '') === v} /><span>{label}</span></label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section id="address" className="acct-section">
        <SectionHead icon="truck" title="عنوان التوصيل" hint="عنوان دقيق يعني توصيلاً أسرع. عند الحفظ يمكنكِ مشاركة موقعكِ الحالي، وهذا اختياري تماماً." />
        <div className="acct-grid">
          <label className="acct-field">المدينة<input {...field('city')} list="acct-cities" autoComplete="address-level2" placeholder="مثال: خان يونس" /></label>
          <datalist id="acct-cities">{store.deliveryZones.map((z) => <option key={z.name} value={z.name} />)}</datalist>
          <label className="acct-field">العنوان التفصيلي<input {...field('address')} autoComplete="street-address" placeholder="الحي، الشارع، أقرب معلم" /></label>
        </div>
        {!!store.deliveryZones.length && (
          <p className="acct-note mt-4"><Icon name="truck" className="size-4 shrink-0 mt-0.5" /><span>نوصّل حالياً إلى: {store.deliveryZones.map((z) => z.name).join('، ')}.</span></p>
        )}
      </section>

      <div className="acct-savebar" data-dirty={dirty} role="region" aria-label="حفظ التغييرات">
        <p role="status">
          {update.isPending ? 'جارٍ الحفظ…'
            : update.isError ? <span className="field-error">{getApiErrorMessage(update.error)}</span>
            : update.isSuccess ? <span className="text-[var(--success)] inline-flex items-center gap-1.5"><Icon name="check" className="size-4" />تم حفظ ملفكِ</span>
            : dirty ? 'لديكِ تغييرات غير محفوظة' : 'كل بياناتكِ محفوظة'}
        </p>
        <div className="flex gap-2">
          {dirty && <button type="reset" className="btn-ghost">تراجع</button>}
          <button className="btn-primary" type="submit" disabled={!dirty || update.isPending}>{update.isPending ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</button>
        </div>
      </div>
    </fieldset>
  </form>
}

const SECTIONS = [
  { id: 'personal', label: 'المعلومات الشخصية', icon: 'user' },
  { id: 'address', label: 'عنوان التوصيل', icon: 'truck' },
  { id: 'privacy', label: 'الخصوصية وبياناتي', icon: 'shield' },
] as const

export function ProfilePage() {
  const user = useQuery({ queryKey: ['session'], queryFn: gazabellaApi.getMe })
  const editable = !isMockMode() && !isMvp0Api()
  return <AccountShell active="profile" search={{ mode: 'jump' }}>
    <div className="acct-profile">
      <aside className="acct-profile__aside">
        {editable && user.data && <ProfileCompleteness user={user.data} />}
        <nav className="acct-aside-card acct-sections-nav" aria-label="أقسام الملف">
          {SECTIONS.filter((s) => editable || s.id === 'privacy').map((s) => <a key={s.id} href={`#${s.id}`}><Icon name={s.icon} className="size-4" />{s.label}</a>)}
          <Link to="/orders"><Icon name="package" className="size-4" />طلباتي</Link>
        </nav>
      </aside>
      <div className="min-w-0">
        {!editable ? <p className="acct-section">تعديل الملف غير متاح في هذا الوضع. <Link className="text-link" to="/orders">طلباتي</Link></p>
          : user.isPending ? <PageLoader label="نحمّل ملفكِ…" /> : user.isError ? <ErrorState message={getApiErrorMessage(user.error)} onRetry={() => void user.refetch()} /> : <ProfileForm key={user.data.id} user={user.data} />}
        <div id="privacy" className="acct-privacy"><AccountRights /></div>
      </div>
    </div>
  </AccountShell>
}
