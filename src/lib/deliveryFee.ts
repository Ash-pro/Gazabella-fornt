import { t } from '../i18n'
import type { Order } from '../types/api'

/** D-22 — يوحّد رسوم التوصيل والإعفاء التعويضي للعقدين (legacy · mvp0) */
export function normalizeDeliveryFee(
  raw: { delivery_fee?: unknown; shipping_fee?: unknown; delivery_fee_original?: unknown; delivery_waiver?: { reason?: string; label?: string } | null },
  amount: (value: unknown) => string,
): Pick<Order, 'delivery_fee' | 'delivery_fee_original' | 'delivery_waiver'> {
  const fee = amount(raw.delivery_fee ?? raw.shipping_fee)
  const w = raw.delivery_waiver
  const reasons = ['compensation', 'free_threshold', 'promotion'] as const
  const waiver = w && reasons.includes(w.reason as typeof reasons[number])
    ? { reason: w.reason as typeof reasons[number], label: w.label?.trim() || t('توصيل مجاني') }
    : null
  const original = raw.delivery_fee_original == null || raw.delivery_fee_original === '' ? null : amount(raw.delivery_fee_original)
  return { delivery_fee: fee, delivery_fee_original: waiver && original && Number(original) > Number(fee) ? original : null, delivery_waiver: waiver }
}
