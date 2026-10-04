import { t } from '../i18n'
import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../api/gazabella'
import { resolveWhatsapp, STORE_INFO } from '../content/storeInfo'

/** بيانات التواصل فقط (/settings) — خفيف للزر العائم والفوتر، بدون طلب مناطق التوصيل */
export function useSupportContact() {
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings, staleTime: 5 * 60_000 })
  return {
    whatsapp: resolveWhatsapp(settings?.social_links),
    phone: settings?.support?.phone ?? settings?.phone ?? null,
    email: settings?.support?.email ?? settings?.email ?? null,
    address: settings?.address ?? null,
    supportHours: settings?.support?.hours || t(STORE_INFO.supportHours),
    supportResponse: settings?.support?.response_time || t(STORE_INFO.supportResponse),
  }
}
