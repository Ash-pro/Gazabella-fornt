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

const CONFIRM_WORD = 'تعطيل'

/**
 * حقوق البيانات (B-10): تعطيل الحساب.
 * DELETE /auth/me يعطّل الحساب (لا يحذفه) ويعيد الخادم تفعيله تلقائياً عند تسجيل الدخول بنفس الرقم.
 * لا نعد بالحذف النهائي حتى يعتمد الباك اند سياسة حذف بعد مدة.
 */
export function AccountRights() {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const remove = useMutation({
    mutationFn: gazabellaApi.deleteMyAccount,
    onSuccess: () => track('privacy_action', { action: 'deactivate' }),
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
          <h3>{t('تعطيل حسابي')}</h3>
          <p>{t('يوقف حسابكِ ويسجّل خروجكِ من كل الأجهزة. تستطيعين إعادة تفعيله بتسجيل الدخول برقمكِ.')}</p>
        </div>
        <button type="button" className="btn-danger" onClick={() => setConfirmOpen(true)}>{t('تعطيل حسابي')}</button>
      </div>

      {confirmOpen && (
        <Dialog title={remove.isSuccess ? t('تم تعطيل حسابكِ') : t('تعطيل الحساب')} onClose={close}>
          <div className="danger-dialog">
            {remove.isSuccess ? (
              <>
                <p>{t('عطّلنا حسابكِ وسجّلنا خروجكِ من كل الأجهزة. للعودة سجّلي الدخول برقمكِ في أي وقت.')}</p>
                <button type="button" className="btn-primary" onClick={finish}>{t('العودة للمتجر')}</button>
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (typed.trim() === t(CONFIRM_WORD)) remove.mutate() }}>
                <p>{t('عند التعطيل:')}</p>
                <ul>
                  <li>{t('يُسجَّل خروجكِ من كل الأجهزة ولا يمكن استخدام الحساب.')}</li>
                  <li>{t('يُعاد تفعيل الحساب تلقائياً إن سجّلتِ الدخول برقمكِ مرة أخرى.')}</li>
                  <li>{t('لطلب حذف بياناتكِ نهائياً تواصلي معنا من صفحة')} <Link className="text-link" to="/contact">{t('اتصلي بنا')}</Link>.</li>
                </ul>
                <label className="field-label block">
                  {t('للتأكيد اكتبي كلمة «{word}»', { word: t(CONFIRM_WORD) })}
                  <input className="form-field mt-2" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" disabled={remove.isPending} />
                </label>
                {remove.isError && <p role="alert" className="field-error">{getApiErrorMessage(remove.error)}</p>}
                <div className="danger-dialog__actions">
                  <button type="submit" className="btn-danger" disabled={typed.trim() !== t(CONFIRM_WORD) || remove.isPending}>
                    {remove.isPending ? t('جارٍ التعطيل…') : t('تعطيل حسابي')}
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
