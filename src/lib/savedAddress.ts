export interface SavedAddress { city: string; neighborhood: string; street: string }

/**
 * عنوان الملف الشخصي (مدينة + سطر عنوان واحد) ← حقول صفحة إتمام الطلب.
 * المدينة تُقبل فقط إن كانت من مناطق التوصيل الحالية حتى تُحسب الرسوم صحيحة.
 */
export function savedAddressFrom(profile: { city?: string | null; address?: string | null } | null | undefined, zoneNames: string[]): SavedAddress | null {
  const address = (profile?.address ?? '').trim()
  const rawCity = (profile?.city ?? '').trim()
  if (!address && !rawCity) return null
  const city = zoneNames.find((z) => z === rawCity) ?? ''
  const parts = address.split(/[،,]/).map((p) => p.trim()).filter(Boolean)
  // نحذف المدينة إن كُتبت في بداية العنوان أيضاً
  if (parts.length > 1 && parts[0] === rawCity) parts.shift()
  const [neighborhood = '', ...rest] = parts.length > 1 ? parts : ['', ...parts]
  return { city, neighborhood, street: rest.join('، ') }
}
