import type { Order } from '../types/api'

/** المبلغ المخصوم من المحفظة إن وُجد (أكبر من صفر)، وإلا null */
export function walletApplied(order: Pick<Order, 'wallet_applied'>): string | null {
  const v = order.wallet_applied
  return v != null && Number(v) > 0 ? v : null
}

/** المبلغ المطلوب عند الاستلام: amount_due من الخادم عند استخدام المحفظة، وإلا إجمالي الطلب */
export function amountDue(order: Pick<Order, 'total' | 'amount_due' | 'wallet_applied'>): string {
  return walletApplied(order) && order.amount_due != null ? order.amount_due : order.total
}
