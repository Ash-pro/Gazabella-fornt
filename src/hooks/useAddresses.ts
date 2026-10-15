import { useQuery } from '@tanstack/react-query'
import { addressBookEnabled, listAddresses } from '../api/cartExtras'
import { useAuthStore } from '../stores/authStore'

/** P2-4 دفتر العناوين للمسجلة — معطّل بلا تسجيل دخول أو بلا ميزة */
export function useAddresses() {
  const token = useAuthStore((s) => s.token)
  return useQuery({ queryKey: ['addresses'], queryFn: listAddresses, enabled: !!token && addressBookEnabled(), retry: false, staleTime: 5 * 60_000 })
}
