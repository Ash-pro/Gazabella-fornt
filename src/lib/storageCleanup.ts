/**
 * تنظيف مفاتيح التخزين القديمة عند تشغيل الموقع (مرة لكل تحميل، رخيص).
 * - بيانات العرض التجريبي (gazabella_mock_*) خارج وضع mock
 * - مفاتيح جلسات قديمة/لبيئات أخرى (gazabella_auth بلا لاحقة أو بلاحقة غير الحالية) — قد تحمل توكناً قديماً
 * - نسخ كاش عامة بصيغة قديمة (بلا لغة) أو لـ API آخر
 */
export function cleanupLegacyStorage(currentAuthKey: string): void {
  try {
    const mock = import.meta.env.VITE_DATA_SOURCE === 'mock'
    const api = mock ? 'mock' : import.meta.env.VITE_API_BASE_URL || '/api/v1'
    const pubOk = [`gz_pub_v1:${api}:ar:`, `gz_pub_v1:${api}:en:`]
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (!mock && k.startsWith('gazabella_mock_')) doomed.push(k)
      else if ((k === 'gazabella_auth' || k.startsWith('gazabella_auth:')) && k !== currentAuthKey) doomed.push(k)
      else if (k.startsWith('gz_pub_v1:') && !pubOk.some((p) => k.startsWith(p))) doomed.push(k)
    }
    doomed.forEach((k) => localStorage.removeItem(k))
  } catch { /* التخزين غير متاح — لا شيء نفعله */ }
}
