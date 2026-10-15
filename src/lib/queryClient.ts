import { QueryClient } from '@tanstack/react-query'
import { PUBLIC_QUERY_KEYS, readPublicCache, writePublicCache } from './publicCache'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (count, error) => {
        const status = (error as { response?: { status?: number } }).response?.status
        return count < 1 && (!status || status >= 500)
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})

// البيانات العامة: آخر نسخة محفوظة تُعرض فوراً (placeholder) ثم تُحدَّث من الخادم
const publicKeys: readonly string[] = PUBLIC_QUERY_KEYS
// staleTime موحّد لكل مفتاح عام: الرأس والتذييل والرئيسية تستخدم نفس المفاتيح بإعدادات مختلفة،
// فكان أي مكوّن يُركَّب لاحقاً (أو عودة التركيز للنافذة) يعيد الطلب نفسه بعد أجزاء من الثانية.
// هذه البيانات تتغير نادراً (بانرات · أقسام · إعدادات · مناطق) — 5 دقائق كافية، ويبقى ‎refetch‎ اليدوي متاحاً.
const PUBLIC_STALE_MS = 5 * 60_000
for (const key of publicKeys) queryClient.setQueryDefaults([key], { placeholderData: () => readPublicCache(key), staleTime: PUBLIC_STALE_MS })
queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== 'updated' || event.action.type !== 'success') return
  const key = event.query.queryKey
  if (key.length === 1 && typeof key[0] === 'string' && publicKeys.includes(key[0])) writePublicCache(key[0], event.query.state.data)
})
