import { t } from '../../i18n'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { gazabellaApi, CancelUnavailableError } from '../../api/gazabella'
import { getApiErrorMessage, getImageUrl } from '../../lib/apiClient'
import { queryClient } from '../../lib/queryClient'
import { formatDate, formatPrice } from '../../lib/format'
import { track } from '../../lib/analytics'
import { whatsappLink } from '../../content/storeInfo'
import { useStoreInfo } from '../../hooks/useStoreInfo'
import type { Order } from '../../types/api'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'

const MIN_REASON = 5
/** اختيارات سريعة تملأ خانة السبب — الكتابة تبقى إلزامية ويمكن تعديلها */
const REASONS: Array<{ code: string; label: string }> = [
  { code: 'changed_mind', label: 'غيّرت رأيي' },
  { code: 'ordered_by_mistake', label: 'طلبت بالخطأ' },
  { code: 'edit_order', label: 'أريد تعديل الطلب أو العنوان' },
  { code: 'delivery_time', label: 'موعد التوصيل لا يناسبني' },
  { code: 'found_better_price', label: 'وجدت سعراً أفضل' },
]

/** الإلغاء متاح قبل خروج الطلب للتوصيل؛ الخادم صاحب القرار النهائي عبر can_cancel */
function canCancelOrder(order: Pick<Order, 'status' | 'can_cancel'>): boolean {
  return order.can_cancel ?? ['pending', 'confirmed'].includes(order.status)
}

export function CancelOrderButton({ order, className = 'btn-cancel' }: { order: Order; className?: string }) {
  const store = useStoreInfo()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const valid = reason.trim().length >= MIN_REASON

  const cancel = useMutation({
    mutationFn: () => gazabellaApi.cancelOrder(order.id, { reason: reason.trim(), reason_code: code }),
    onSuccess: () => {
      track('order_cancel', { reason_code: code ?? 'other' })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['order'] })
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
  })
  if (!canCancelOrder(order) && !open) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (valid && !cancel.isPending) cancel.mutate()
  }
  function close() { setOpen(false); cancel.reset(); setTouched(false) }

  const unavailable = cancel.error instanceof CancelUnavailableError
  const viaWhatsapp = store.whatsapp ? whatsappLink(store.whatsapp, t('مرحباً Gazabella، أريد إلغاء طلبي رقم {order_number}. السبب: {reason}', { order_number: order.order_number, reason: reason.trim() })) : null
  const refunded = cancel.data?.refunded_to_wallet

  return (
    <>
      <button ref={trigger} type="button" className={className} onClick={() => setOpen(true)}>{t('إلغاء الطلب')}</button>
      {open && (
        <Dialog title={cancel.isSuccess ? t('تم إلغاء الطلب') : t('إلغاء الطلب')} onClose={close} returnFocusRef={trigger}>
          {cancel.isSuccess ? (
            <div className="cancel-done">
              <span className="trk-badge"><Icon name="check" className="size-7" /></span>
              <p>{t('ألغينا طلبكِ رقم')} <bdi className="num" dir="ltr">{order.order_number}</bdi>.</p>
              {refunded && Number(refunded) > 0 && <p className="cancel-refund">{t('أضفنا {amount} إلى محفظتكِ لتستخدميها في طلب قادم.', { amount: formatPrice(refunded) })}</p>}
              <button type="button" className="btn-primary w-full" onClick={close}>{t('تم')}</button>
            </div>
          ) : (
            <form className="cancel-form" onSubmit={submit} noValidate>
              <div className="cancel-order">
                <div className="cancel-order__head">
                  <bdi className="num" dir="ltr">{order.order_number}</bdi>
                  <span className="num">{formatDate(order.created_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <ul>
                  {order.items.map((item, i) => {
                    const src = getImageUrl(item.image_url)
                    return (
                      <li key={item.id || i}>
                        <span className="acct-thumb">{src ? <img src={src} alt="" loading="lazy" /> : <Icon name="package" className="size-5" />}</span>
                        <span className="min-w-0 flex-1">{item.product_name}<small className="num"> × {item.quantity}</small></span>
                        <b className="num">{formatPrice(item.subtotal)}</b>
                      </li>
                    )
                  })}
                </ul>
                <div className="cancel-order__total"><span>{t('الإجمالي')}</span><strong className="num">{formatPrice(order.total)}</strong></div>
              </div>

              <fieldset>
                <legend className="field-label">{t('لماذا تريدين إلغاء الطلب؟')} <span aria-hidden="true">*</span></legend>
                <div className="cancel-chips">
                  {REASONS.map((r) => (
                    <button key={r.code} type="button" className="cancel-chip" aria-pressed={code === r.code} onClick={() => { setCode(r.code); setReason(t(r.label)) }}>{t(r.label)}</button>
                  ))}
                </div>
                <textarea className="form-field" rows={3} maxLength={500} required aria-label={t('سبب الإلغاء')} placeholder={t('اكتبي سبب الإلغاء…')}
                  value={reason} onChange={(e) => { setReason(e.target.value); if (code && e.target.value !== t(REASONS.find((r) => r.code === code)?.label ?? '')) setCode(null) }}
                  aria-invalid={touched && !valid} aria-describedby="cancel-reason-help" />
                <p id="cancel-reason-help" className={touched && !valid ? 'field-error' : 'cancel-help'} role={touched && !valid ? 'alert' : undefined}>{touched && !valid ? t('سبب الإلغاء مطلوب — اكتبي {n} أحرف على الأقل.', { n: MIN_REASON }) : t('يساعدنا السبب على تحسين الخدمة.')}</p>
              </fieldset>

              <p className="cancel-warn"><Icon name="alert" className="size-4 shrink-0 mt-0.5" />{t('لا يمكن التراجع بعد الإلغاء. إن أردتِ المنتجات لاحقاً يمكنكِ إعادة الطلب.')}</p>

              {cancel.isError && (
                <div className="trk-error" role="alert">
                  <Icon name="alert" className="size-5 shrink-0" />
                  <div>
                    <p>{unavailable ? t('الإلغاء من الموقع يُفعَّل قريباً. لإلغاء هذا الطلب الآن راسلينا على واتساب.') : getApiErrorMessage(cancel.error)}</p>
                    {unavailable && viaWhatsapp && <a className="btn-whatsapp mt-2" href={viaWhatsapp} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" className="size-5" />{t('إلغاء الطلب عبر واتساب')}</a>}
                  </div>
                </div>
              )}

              <div className="cancel-actions">
                <button type="button" className="btn-ghost" onClick={close}>{t('تراجع')}</button>
                <button className="btn-danger" disabled={cancel.isPending}>{cancel.isPending ? t('جارٍ الإلغاء…') : t('تأكيد إلغاء الطلب')}</button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </>
  )
}
