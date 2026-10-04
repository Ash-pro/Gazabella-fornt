import { getLocale } from '../i18n'
/**
 * كاش محلي للبيانات العامة فقط (بانرات، إعدادات، تصنيفات…) — لا بيانات شخصية.
 * يُستخدم كـ placeholder حتى ترسم الصفحة بشكلها النهائي فوراً في الزيارات المتكررة
 * بدل أن تقفز العناصر عند وصول رد الـ API (CLS)، ثم تُستبدل بالبيانات الحديثة.
 */
const BASE = `gz_pub_v1:${import.meta.env.VITE_DATA_SOURCE === 'mock' ? 'mock' : import.meta.env.VITE_API_BASE_URL || '/api/v1'}:`
const prefix = () => `${BASE}${getLocale()}:`
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export const PUBLIC_QUERY_KEYS = ['banners', 'settings', 'categories', 'collections', 'delivery-zones'] as const

export function readPublicCache(key: string, now = Date.now()): unknown {
  try {
    const raw = localStorage.getItem(prefix() + key)
    if (!raw) return undefined
    const entry = JSON.parse(raw) as { at?: number; data?: unknown }
    if (typeof entry.at !== 'number' || now - entry.at > TTL_MS || entry.data == null) return undefined
    return entry.data
  } catch {
    return undefined
  }
}

export function writePublicCache(key: string, data: unknown, now = Date.now()): void {
  if (data == null) return
  try { localStorage.setItem(prefix() + key, JSON.stringify({ at: now, data })) } catch { /* التخزين ممتلئ أو غير متاح */ }
}
