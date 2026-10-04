import { t } from '../../i18n'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'
import { getApiErrorMessage } from '../../lib/apiClient'
import type { Order } from '../../types/api'

export function JawwalReferenceForm({
  order,
  onConfirmed,
}: {
  order: Order
  onConfirmed?: (order: Order) => void
}) {
  const [reference, setReference] = useState('')
  const client = useQueryClient()

  const confirm = useMutation({
    mutationFn: () => gazabellaApi.confirmJawwalPayment(order.order_number, reference.trim()),
    onSuccess: (updated) => {
      client.setQueryData(['order', String(updated.id)], updated)
      void client.invalidateQueries({ queryKey: ['orders'] })
      onConfirmed?.(updated)
    },
  })

  if (
    order.payment_method !== 'jawwal_pay' ||
    order.payment_status === 'paid' ||
    ['cancelled', 'refunded'].includes(order.status)
  )
    return null

  return (
    <section className="checkout-card mt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--primary)] text-sm text-white">
          💳
        </span>
        <h2 className="text-base font-bold">{t('تأكيد الدفع عبر جوال باي')}</h2>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--primary-dim)] px-4 py-3 text-sm leading-7">
        <p>
          {t('طلبك محفوظ برقم')}{' '}
          <b dir="ltr" className="font-mono text-[var(--primary)]">
            {order.order_number}
          </b>
          {t('. افتح تطبيق')} <b>{t('جوال باي')}</b> {t('وادفع المبلغ، ثم أدخل')} <b>{t('مرجع العملية')}</b> {t('من الإيصال هنا.')}
        </p>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          {t('⚠ لا تشارك رمز التحقق أو الرقم السري للمحفظة مع أحد.')}
        </p>
      </div>

      {/* Form */}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (reference.trim() && !confirm.isPending) confirm.mutate()
        }}
      >
        <div>
          <label className="field-label" htmlFor="payment-reference">
            {t('مرجع العملية من إيصال جوال باي')} <span className="text-red-500">*</span>
          </label>
          <input
            id="payment-reference"
            className={[
              'form-field',
              confirm.isError
                ? 'border-red-400 bg-red-50/40'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            dir="ltr"
            autoComplete="off"
            required
            maxLength={255}
            placeholder={t('أدخل المرجع كما يظهر في الإيصال')}
            value={reference}
            onChange={(e) => { setReference(e.target.value); confirm.reset() }}
            disabled={confirm.isPending}
          />
        </div>

        {/* Error */}
        {confirm.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
          >
            <span className="mt-px text-sm text-red-500">⚠</span>
            <p className="text-sm leading-snug text-red-700">{getApiErrorMessage(confirm.error)}</p>
          </div>
        )}

        {/* Success */}
        {confirm.isSuccess && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2"
          >
            <span className="text-sm text-green-600">✓</span>
            <p className="text-sm font-semibold text-green-700">{t('تم التحقق من الدفع بنجاح.')}</p>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={confirm.isPending || !reference.trim()}
        >
          {confirm.isPending ? t('جارٍ التحقق من الدفع…') : t('تأكيد الدفع')}
        </button>
      </form>
    </section>
  )
}
