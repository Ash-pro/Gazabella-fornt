import { t } from '../../i18n'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { applyCoupon, couponsEnabled, removeCoupon } from '../../api/cartExtras'
import { getApiErrorMessage } from '../../lib/apiClient'
import { apiErrorCode } from '../../lib/checkoutAttempt'
import { demoFixtures } from '../../lib/demo'
import { formatPrice } from '../../lib/format'
import { queryClient } from '../../lib/queryClient'
import type { Cart } from '../../types/api'
import { DemoBadge } from '../ui/DemoBadge'
import { Icon } from '../ui/Icon'

function couponMessage(error: unknown): string {
  const code = apiErrorCode(error)
  const min = (error as { response?: { data?: { error?: { details?: { min_subtotal?: number } } } } })?.response?.data?.error?.details?.min_subtotal
  if (code === 'COUPON_INVALID') return t('الكود غير صحيح. تأكدي من كتابته.')
  if (code === 'COUPON_EXPIRED') return t('انتهت صلاحية هذا الكود.')
  if (code === 'COUPON_MIN_SUBTOTAL') return min ? t('هذا الكود لطلبات من {amount} فأكثر.', { amount: formatPrice(min) }) : t('قيمة السلة أقل من الحد المطلوب لهذا الكود.')
  if (code === 'COUPON_USAGE_LIMIT') return t('استُخدم هذا الكود من قبل.')
  return getApiErrorMessage(error)
}

/** P2-2 حقل الكوبون — السلة والدفع. الخادم يحسب الخصم؛ الواجهة تعرضه فقط */
export function CouponField({ cart, collapsible = false }: { cart: Cart; collapsible?: boolean }) {
  const [code, setCode] = useState('')
  const [open, setOpen] = useState(!collapsible)
  const setCart = (res: { data: Cart }) => queryClient.setQueryData(['cart'], res.data)
  const apply = useMutation({ mutationFn: () => applyCoupon(code, Number(cart.subtotal) || 0), onSuccess: (res) => { setCart(res); setCode('') } })
  const remove = useMutation({ mutationFn: removeCoupon, onSuccess: setCart })
  if (!couponsEnabled()) return null

  if (cart.coupon) return (
    <div className="coupon coupon--applied">
      <span><Icon name="check" className="size-4" /> <b dir="ltr">{cart.coupon.code}</b> <span className="num">−{formatPrice(Number(cart.coupon.discount))}</span> <DemoBadge show={!!cart.coupon.demo} /></span>
      <button type="button" className="text-link" disabled={remove.isPending} onClick={() => remove.mutate()}>{t('إزالة')}</button>
      {cart.coupon.description && <small>{cart.coupon.description}</small>}
    </div>
  )

  if (!open) return <button type="button" className="coupon-toggle text-link" onClick={() => setOpen(true)}>{t('عندكِ كود خصم؟')}</button>
  return (
    <form className="coupon" noValidate onSubmit={(e) => { e.preventDefault(); if (code.trim() && !apply.isPending) apply.mutate() }}>
      <label className="sr-only" htmlFor="coupon-code">{t('كود الخصم')}</label>
      <div className="coupon__row">
        <input id="coupon-code" className="form-field" dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={30} placeholder={t('كود الخصم')} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); apply.reset() }} aria-invalid={apply.isError} />
        <button type="submit" className="btn-ghost" disabled={!code.trim() || apply.isPending}>{apply.isPending ? t('جارٍ التحقق…') : t('تطبيق')}</button>
      </div>
      {apply.isError && <p className="field-error" role="alert">{couponMessage(apply.error)}</p>}
      {demoFixtures() && <small className="coupon__hint">{t('للتجربة: GAZA10 أو WELCOME15')}</small>}
    </form>
  )
}
