import { t } from '../../i18n'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { saveAddress } from '../../api/cartExtras'
import { useStoreInfo } from '../../hooks/useStoreInfo'
import { getApiErrorMessage } from '../../lib/apiClient'
import { queryClient } from '../../lib/queryClient'
import type { CustomerAddress, CustomerAddressInput } from '../../types/api'
import { Dialog } from '../ui/Dialog'

const LABELS = ['البيت', 'العمل', 'بيت الأهل']
const PHONE = /^(\+?(970|972))?0?5\d{8}$/

/** P2-4 إضافة/تعديل عنوان — نفس حقول الدفع حتى ينتقل العنوان كما هو */
export function AddressForm({ address, onClose }: { address?: CustomerAddress; onClose: () => void }) {
  const store = useStoreInfo()
  const [v, setV] = useState<CustomerAddressInput>(address ?? { label: LABELS[0], recipient_name: '', phone: '', city: '', neighborhood: '', street: '', is_default: false })
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof CustomerAddressInput>(k: K, val: CustomerAddressInput[K]) => setV((p) => ({ ...p, [k]: val }))
  const errors = {
    label: v.label.trim().length < 2 ? t('أدخلي اسماً للعنوان') : '',
    recipient_name: v.recipient_name.trim().length < 3 ? t('أدخلي اسم المستلمة') : '',
    phone: !PHONE.test(v.phone.trim()) ? t('رقم الجوال غير صحيح — 05XXXXXXXX') : '',
    city: !v.city ? t('اختاري منطقة التوصيل') : '',
    neighborhood: v.neighborhood.trim().length < 2 ? t('أدخلي الحي') : '',
    street: v.street.trim().length < 3 ? t('أدخلي الشارع أو أقرب معلم') : '',
  }
  const valid = Object.values(errors).every((e) => !e)
  const save = useMutation({
    mutationFn: () => saveAddress({ ...v, label: v.label.trim(), recipient_name: v.recipient_name.trim(), phone: v.phone.trim(), neighborhood: v.neighborhood.trim(), street: v.street.trim() }, address?.id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['addresses'] }); onClose() },
  })
  const err = (k: keyof typeof errors) => touched && errors[k] ? <p className="field-error" role="alert">{errors[k]}</p> : null

  return (
    <Dialog title={address ? t('تعديل العنوان') : t('عنوان جديد')} onClose={onClose} sheet>
      <form className="addr-form" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (valid && !save.isPending) save.mutate() }}>
        <fieldset>
          <legend className="field-label">{t('اسم العنوان')}</legend>
          <div className="addr-form__labels">
            {LABELS.map((l) => <button key={l} type="button" className="swatch" aria-pressed={v.label === l} onClick={() => set('label', l)}>{t(l)}</button>)}
          </div>
          <input className="form-field mt-2" maxLength={30} value={v.label} onChange={(e) => set('label', e.target.value)} aria-label={t('اسم العنوان')} />
          {err('label')}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field-label">{t('اسم المستلمة')}<input className="form-field" autoComplete="name" value={v.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} />{err('recipient_name')}</label>
          <label className="field-label">{t('رقم الجوال')}<input className="form-field" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="05XXXXXXXX" value={v.phone} onChange={(e) => set('phone', e.target.value)} />{err('phone')}</label>
        </div>
        <label className="field-label">{t('منطقة التوصيل')}
          <select className="form-field" value={v.city} onChange={(e) => set('city', e.target.value)}>
            <option value="">{t('اختاري منطقة التوصيل')}</option>
            {store.deliveryZones.map((z) => <option key={z.name} value={z.name}>{z.name}</option>)}
          </select>{err('city')}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field-label">{t('الحي / المنطقة')}<input className="form-field" autoComplete="address-level3" value={v.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />{err('neighborhood')}</label>
          <label className="field-label">{t('الشارع / أقرب معلم')}<input className="form-field" autoComplete="street-address" value={v.street} onChange={(e) => set('street', e.target.value)} />{err('street')}</label>
        </div>
        <label className="addr-form__default"><input type="checkbox" checked={v.is_default} onChange={(e) => set('is_default', e.target.checked)} /> {t('العنوان الافتراضي عند الطلب')}</label>
        {save.isError && <p className="field-error" role="alert">{getApiErrorMessage(save.error)}</p>}
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>{save.isPending ? t('جارٍ الحفظ…') : t('حفظ العنوان')}</button>
      </form>
    </Dialog>
  )
}
