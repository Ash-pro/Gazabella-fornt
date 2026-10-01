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

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** حقوق البيانات (B-10): تنزيل نسخة من البيانات، وحذف الحساب نهائياً */
export function AccountRights() {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const exportData = useMutation({
    mutationFn: gazabellaApi.exportMyData,
    onSuccess: (data) => {
      track('privacy_action', { action: 'export' })
      downloadJson(data, `gazabella-my-data-${new Date().toISOString().slice(0, 10)}.json`)
    },
  })

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
      <h2 id="rights-title">بياناتكِ وحقوقكِ</h2>
      <p>تحكّمي ببياناتكِ مباشرة. التفاصيل في <Link className="text-link" to="/privacy">سياسة الخصوصية</Link>.</p>

      <div className="account-rights__row">
        <div>
          <h3>تنزيل نسخة من بياناتي</h3>
          <p>ملف يحتوي ملفكِ الشخصي وسجل طلباتكِ.</p>
        </div>
        <button type="button" className="btn-ghost" disabled={exportData.isPending} onClick={() => exportData.mutate()}>
          {exportData.isPending ? 'نجهّز الملف…' : 'تنزيل بياناتي'}
        </button>
      </div>
      {exportData.isError && <p role="alert" className="field-error">{getApiErrorMessage(exportData.error)}</p>}
      {exportData.isSuccess && <p role="status" className="account-rights__ok">تم تنزيل الملف.</p>}

      <div className="account-rights__row account-rights__row--danger">
        <div>
          <h3>حذف حسابي</h3>
          <p>حذف نهائي لبياناتكِ الشخصية. لا يمكن التراجع عنه.</p>
        </div>
        <button type="button" className="btn-danger" onClick={() => setConfirmOpen(true)}>حذف حسابي</button>
      </div>

      {confirmOpen && (
        <Dialog title={remove.isSuccess ? 'تم حذف حسابكِ' : 'حذف الحساب نهائياً'} onClose={close}>
          <div className="danger-dialog">
            {remove.isSuccess ? (
              <>
                <p>تم حذف بياناتكِ الشخصية وتسجيل خروجكِ من كل الأجهزة. شكراً لأنكِ كنتِ معنا.</p>
                <button type="button" className="btn-primary" onClick={finish}>العودة للمتجر</button>
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (typed.trim() === CONFIRM_WORD) remove.mutate() }}>
                <p>عند الحذف:</p>
                <ul>
                  <li>يُحذف اسمكِ ورقمكِ وعنوانكِ وموقعكِ وبريدكِ نهائياً.</li>
                  <li>تبقى سجلات الطلبات <b>بدون أي بيانات تعريفية</b> لأغراض المحاسبة.</li>
                  <li>يُسجَّل خروجكِ من كل الأجهزة.</li>
                  <li>يمكنكِ إنشاء حساب جديد لاحقاً بنفس الرقم، لكن بدون سجلكِ السابق.</li>
                </ul>
                <p className="danger-dialog__tip">💡 قد ترغبين بـ<button type="button" className="link-button" onClick={() => exportData.mutate()}>تنزيل نسخة من بياناتكِ</button> أولاً.</p>
                <label className="field-label block">
                  للتأكيد اكتبي كلمة «{CONFIRM_WORD}»
                  <input className="form-field mt-2" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" disabled={remove.isPending} aria-describedby="delete-hint" />
                </label>
                <p id="delete-hint" className="sr-only">هذا الإجراء لا يمكن التراجع عنه</p>
                {remove.isError && <p role="alert" className="field-error">{getApiErrorMessage(remove.error)}</p>}
                <div className="danger-dialog__actions">
                  <button type="submit" className="btn-danger" disabled={typed.trim() !== CONFIRM_WORD || remove.isPending}>
                    {remove.isPending ? 'جارٍ الحذف…' : 'حذف حسابي نهائياً'}
                  </button>
                  <button type="button" className="btn-ghost" onClick={close} disabled={remove.isPending}>إلغاء</button>
                </div>
              </form>
            )}
          </div>
        </Dialog>
      )}
    </section>
  )
}
