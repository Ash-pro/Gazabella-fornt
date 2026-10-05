export interface SavedAddress { city: string; neighborhood: string; street: string }

/** توحيد للمقارنة فقط: «خانيونس» = «خان يونس»، وبدون همزات أو «ال» أو مسافات */
const norm = (s: string) => s.replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[\s\-ـ]+/g, '').toLowerCase()

/**
 * عنوان الملف الشخصي (مدينة + سطر عنوان واحد) ← حقول صفحة إتمام الطلب.
 * المدينة تُقبل فقط إن طابقت منطقة توصيل حالية حتى تُحسب الرسوم صحيحة؛
 * وإن لم تُكتب في خانة المدينة نبحث عنها داخل سطر العنوان.
 */
export function savedAddressFrom(profile: { city?: string | null; address?: string | null } | null | undefined, zoneNames: string[]): SavedAddress | null {
  const address = (profile?.address ?? '').trim()
  const rawCity = (profile?.city ?? '').trim()
  if (!address && !rawCity) return null
  const cityKey = norm(rawCity)
  const city = (cityKey && zoneNames.find((z) => norm(z) === cityKey || norm(z).includes(cityKey) || cityKey.includes(norm(z))))
    || zoneNames.find((z) => norm(address).includes(norm(z))) || ''
  // الفواصل الشائعة: ، , - – — / |
  let parts = address.split(/\s*[،,/|–—]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean)
  // نحذف المدينة إن تكررت داخل العنوان
  if (parts.length > 1) parts = parts.filter((p) => norm(p) !== norm(city || rawCity) || !norm(p))
  if (parts.length <= 1) return { city, neighborhood: '', street: parts[0] ?? '' }
  const [neighborhood, ...rest] = parts
  return { city, neighborhood, street: rest.join('، ') }
}
