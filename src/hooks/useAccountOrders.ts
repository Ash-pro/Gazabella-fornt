import { useQuery } from '@tanstack/react-query'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { isMvp0Api } from '../lib/apiContract'
import type { Order } from '../types/api'

/** حد أعلى معقول لسجل العميلة (7 صفحات × 15 ≈ 105 طلبات) — البحث والفلترة على الجهاز */
const MAX_PAGES = 7

export interface AccountOrders { orders: Order[]; total: number; truncated: boolean }

async function fetchAllOrders(): Promise<AccountOrders> {
  const first = await gazabellaApi.getOrders(1)
  const lastPage = Math.max(1, first.meta?.last_page ?? 1)
  const pages = Math.min(lastPage, MAX_PAGES)
  const rest = pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, i) => gazabellaApi.getOrders(i + 2))) : []
  const seen = new Set<number | string>()
  const orders = [first, ...rest].flatMap((r) => r.data).filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
  orders.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  return { orders, total: first.meta?.total ?? orders.length, truncated: lastPage > MAX_PAGES }
}

/** كل طلبات الحساب في كاش واحد — تستخدمه «طلباتي» وبطاقة الحساب وبحث الملف الشخصي */
export function useAccountOrders() {
  return useQuery({ queryKey: ['orders', 'all'], queryFn: fetchAllOrders, staleTime: 30_000 })
}

export const orderPath = (order: Pick<Order, 'id' | 'order_number'>) =>
  `/orders/${encodeURIComponent(String(isMockMode() || isMvp0Api() ? order.order_number : order.id))}`
