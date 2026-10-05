import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../api/gazabella'

/** رصيد المحفظة وحركاتها — كاش واحد للوحة الحساب وصفحة المحفظة */
export function useWallet() {
  return useQuery({ queryKey: ['wallet'], queryFn: gazabellaApi.getWallet, staleTime: 30_000 })
}
