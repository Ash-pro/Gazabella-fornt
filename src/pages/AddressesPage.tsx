import { t } from '../i18n'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { deleteAddress, saveAddress } from '../api/cartExtras'
import { AccountShell } from '../components/account/AccountShell'
import { AddressForm } from '../components/account/AddressForm'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { DemoBadge } from '../components/ui/DemoBadge'
import { Icon } from '../components/ui/Icon'
import { useAddresses } from '../hooks/useAddresses'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useSeo } from '../lib/seo'
import type { CustomerAddress } from '../types/api'

/** P2-4 «عناويني» — إضافة وتعديل وحذف وتعيين الافتراضي */
export function AddressesPage() {
  useSeo({ title: t('عناويني'), noindex: true })
  const query = useAddresses()
  const [editing, setEditing] = useState<CustomerAddress | 'new' | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['addresses'] })
  const remove = useMutation({ mutationFn: (id: number) => deleteAddress(id), onSuccess: () => { setConfirmId(null); refresh() } })
  const makeDefault = useMutation({ mutationFn: (a: CustomerAddress) => { const { id, ...rest } = a; return saveAddress({ ...rest, is_default: true }, id) }, onSuccess: refresh })
  const list = query.data?.data ?? []

  return (
    <AccountShell active="addresses" search={{ mode: 'jump' }}>
      <section className="acct-section addr-page">
        <header className="addr-page__head">
          <h2>{t('عناويني')} <DemoBadge show={!!query.data?.demo} /></h2>
          <button type="button" className="btn-primary" onClick={() => setEditing('new')}><Icon name="plus" className="size-4" /> {t('إضافة عنوان')}</button>
        </header>
        {query.isLoading ? <PageLoader /> : query.isError ? <ErrorState message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} /> : !list.length ? (
          <div className="addr-empty"><Icon name="mapPin" className="size-8" /><p>{t('احفظي عناوينكِ لطلب أسرع — تختارينها بضغطة عند الدفع.')}</p></div>
        ) : (
          <ul className="addr-list">
            {list.map((a) => (
              <li key={a.id} className={`addr-card${a.is_default ? ' is-default' : ''}`}>
                <div>
                  <b>{a.label}</b>{a.is_default && <span className="addr-card__badge">{t('الافتراضي')}</span>}
                  <p>{a.recipient_name} · <span dir="ltr" className="num">{a.phone}</span></p>
                  <p>{[a.city, a.neighborhood, a.street].join(t('، '))}</p>
                </div>
                {confirmId === a.id ? (
                  <div className="addr-card__actions">
                    <span>{t('حذف هذا العنوان؟')}</span>
                    <button type="button" className="text-link text-[var(--error)]" disabled={remove.isPending} onClick={() => remove.mutate(a.id)}>{t('نعم، احذفي')}</button>
                    <button type="button" className="text-link" onClick={() => setConfirmId(null)}>{t('إلغاء')}</button>
                  </div>
                ) : (
                  <div className="addr-card__actions">
                    <button type="button" className="text-link" onClick={() => setEditing(a)}>{t('تعديل')}</button>
                    {!a.is_default && <button type="button" className="text-link" disabled={makeDefault.isPending} onClick={() => makeDefault.mutate(a)}>{t('اجعليه الافتراضي')}</button>}
                    <button type="button" className="text-link" onClick={() => setConfirmId(a.id)}>{t('حذف')}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {(remove.isError || makeDefault.isError) && <p className="field-error" role="alert">{getApiErrorMessage(remove.error || makeDefault.error)}</p>}
      </section>
      {editing && <AddressForm address={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </AccountShell>
  )
}
