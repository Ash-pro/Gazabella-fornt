import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../api/gazabella'
import { resolveWhatsapp } from '../content/storeInfo'

/** رقم واتساب الدعم + بيانات التواصل من إعدادات المتجر */
export function useSupportContact() {
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings, staleTime: 5 * 60_000 })
  return {
    whatsapp: resolveWhatsapp(settings?.social_links),
    phone: settings?.phone ?? null,
    email: settings?.email ?? null,
    address: settings?.address ?? null,
  }
}
