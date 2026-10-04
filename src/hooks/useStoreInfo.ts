import { t } from '../i18n'
import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../api/gazabella'
import { resolveWhatsapp, STORE_INFO, type DeliveryZone } from '../content/storeInfo'

const pos = (v: number | null | undefined, fallback: number) => (typeof v === 'number' && v > 0 ? v : fallback)

/**
 * القيم التشغيلية الحيّة: الباك اند أولاً (/settings + /delivery-zones)،
 * ثم القيم الاحتياطية في STORE_INFO لأي حقل غائب أو عند تعذّر الاتصال.
 */
export function useStoreInfo() {
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings, staleTime: 5 * 60_000 })
  const zonesQuery = useQuery({ queryKey: ['delivery-zones'], queryFn: gazabellaApi.getDeliveryZones, staleTime: 10 * 60_000, retry: 1 })
  const settings = settingsQuery.data
  const p = settings?.policies ?? {}
  const sup = settings?.support

  const liveZones: DeliveryZone[] | null = zonesQuery.data?.length
    ? zonesQuery.data.map((z) => ({ id: z.id, name: z.name, fee: z.fee, etaMinutes: z.eta_minutes }))
    : null
  const deliveryZones: readonly DeliveryZone[] = liveZones ?? STORE_INFO.deliveryZones
  const threshold = p.free_delivery_threshold

  return {
    brand: settings?.store_name || STORE_INFO.brand,
    city: t(STORE_INFO.city),
    policiesUpdatedAt: p.updated_at || STORE_INFO.policiesUpdatedAt,
    supportHours: sup?.hours || t(STORE_INFO.supportHours),
    supportResponse: sup?.response_time || t(STORE_INFO.supportResponse),
    acceptanceWindowMinutes: pos(p.acceptance_window_minutes, STORE_INFO.acceptanceWindowMinutes),
    returnWindowDays: pos(p.return_window_days, STORE_INFO.returnWindowDays),
    damageReportHours: pos(p.damage_report_hours, STORE_INFO.damageReportHours),
    dataRetentionMonths: pos(p.data_retention_months, STORE_INFO.dataRetentionMonths),
    /** null = لا يوجد حد توصيل مجاني (0 يُعامل كغير مفعّل) */
    freeDeliveryThreshold: typeof threshold === 'number' && threshold > 0 ? threshold : null,
    codAvailable: p.cod_available !== false,
    /** طرق الدفع المفعّلة من الخادم (null = لم يحددها) */
    paymentMethods: p.payment_methods ?? null,
    deliveryZones,
    minDeliveryFee: Math.min(...deliveryZones.map((z) => z.fee)),
    zonesFromServer: Boolean(liveZones),
    whatsapp: resolveWhatsapp(settings?.social_links),
    phone: sup?.phone ?? settings?.phone ?? null,
    email: sup?.email ?? settings?.email ?? null,
    address: settings?.address ?? null,
  }
}

export type StoreInfoView = ReturnType<typeof useStoreInfo>
