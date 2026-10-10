import { t } from '../../i18n'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { clearCartToken, getApiErrorMessage } from '../../lib/apiClient'
import { queryClient } from '../../lib/queryClient'
import { track } from '../../lib/analytics'
import { useAuthStore } from '../../stores/authStore'
import { Dialog } from '../ui/Dialog'

const CONFIRM_WORD = 'حذف'

/** حقوق البيانات (B-10): حذف الحساب نهائياً (أُزيل تنزيل نسخة البيانات بطلب المالك) */
export function AccountRights() {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const remove = useMutation({
    mutationFn: gazabellaApi.deleteMyAccount,
    onSuccess: () => track('privacy_action', { action: 'delete' }),
  })

  function finish() {
    // إنهاء الجلسة محلياً بعد الحذف — التوكن أُلغي على الخادم
    clearCartToken()
    useAuthStore.getState().clearSession()
    queryClient.clear()
    navigate('/', { replace: true })
  }

  function close() {
    if (remove.isPending) return
    if (remove.isSuccess) return finish()
    setConfirmOpen(false)
    setTyped('')
    remove.reset()
  }

  return (
    <section className="account-rights" aria-labelledby="rights-title">
      <h2 id="rights-title">{t('بياناتكِ وحقوقكِ')}</h2>
      <p>{t('تحكّمي ببياناتكِ مباشرة. التفاصيل في')} <Link className="text-link" to="/privacy">{t('سياسة الخصوصية')}</Link>.</p>

      <div className="account-rights__row account-rights__row--danger">
        <div>
          <h3>{t('حذف حسابي')}</h3>
          <p>{t('حذف نهائي لبياناتكِ الشخصية. لا يمكن التراجع عنه.')}</p>
        </div>
        <button type="button" className="btn-danger" onClick={() => setConfirmOpen(true)}>{t('حذف حسابي')}</button>
      </div>

      {confirmOpen && (
        <Dialog title={remove.isSuccess ? t('تم حذف حسابكِ') : t('حذف الحساب نهائياً')} onClose={close}>
          <div className="danger-dialog">
            {remove.isSuccess ? (
              <>
                <p>{t('تم حذف بياناتكِ الشخصية وتسجيل خروجكِ من كل الأجهزة. شكراً لأنكِ كنتِ معنا.')}</p>
                <button type="button" className="btn-primary" onClick={finish}>{t('العودة للمتجر')}</button>
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (typed.trim() === t(CONFIRM_WORD)) remove.mutate() }}>
                <p>{t('عند الحذف:')}</p>
                <ul>
                  <li>{t('يُحذف اسمكِ ورقمكِ وعنوانكِ وموقعكِ وبريدكِ نهائياً.')}</li>
                  <li>{t('تبقى سجلات الطلبات')} <b>{t('بدون أي بيانات تعريفية')}</b> {t('لأغراض المحاسبة.')}</li>
                  <li>{t('يُسجَّل خروجكِ من كل الأجهزة.')}</li>
                  <li>{t('يمكنكِ إنشاء حساب جديد لاحقاً بنفس الرقم، لكن بدون سجلكِ السابق.')}</li>
                </ul>
                <label className="field-label block">
                  {t('للتأكيد اكتبي كلمة «{word}»', { word: t(CONFIRM_WORD) })}
                  <input className="form-field mt-2" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" disabled={remove.isPending} aria-describedby="delete-hint" />
                </label>
                <p id="delete-hint" className="sr-only">{t('هذا الإجراء لا يمكن التراجع عنه')}</p>
                {remove.isError && <p role="alert" className="field-error">{getApiErrorMessage(remove.error)}</p>}
                <div className="danger-dialog__actions">
                  <button type="submit" className="btn-danger" disabled={typed.trim() !== t(CONFIRM_WORD) || remove.isPending}>
                    {remove.isPending ? t('جارٍ الحذف…') : t('حذف حسابي نهائياً')}
                  </button>
                  <button type="button" className="btn-ghost" onClick={close} disabled={remove.isPending}>{t('إلغاء')}</button>
                </div>
              </form>
            )}
          </div>
        </Dialog>
      )}
    </section>
  )
}
