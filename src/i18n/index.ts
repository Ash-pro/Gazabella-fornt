import { useSyncExternalStore } from 'react'

/**
 * لغتان: العربية (الأصل) والإنجليزية.
 * النص العربي نفسه هو المفتاح: t('اكتشفي المنتج') — بالعربية يُعرض كما هو،
 * وبالإنجليزية يُبحث عنه في en.ts (وإن لم يوجد يبقى العربي بدل نص فارغ).
 * اختبار tests/i18n.test.mjs يفشل إذا استُخدم نص في t() بلا ترجمة.
 */
export type Locale = 'ar' | 'en'

const STORAGE_KEY = 'gz_locale'
const listeners = new Set<() => void>()
let dictionary: Record<string, string> | null = null

function stored(): Locale {
  try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar' } catch { return 'ar' }
}
// العربية هي الافتراضية دائماً (جمهور المتجر)؛ الإنجليزية باختيار الزبونة وتُحفظ على جهازها
let locale: Locale = typeof localStorage === 'undefined' ? 'ar' : stored()

export const getLocale = (): Locale => locale
export const isRtl = (): boolean => locale === 'ar'
/** لغة التواريخ والأرقام — أرقام لاتينية في اللغتين */
export const dateLocale = (): string => (locale === 'en' ? 'en-GB' : 'ar-PS-u-nu-latn')

export function translate(text: string, lang: Locale, dict: Record<string, string> | null, vars?: Record<string, string | number>): string {
  const base = lang === 'en' ? dict?.[text] ?? text : text
  return vars ? base.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match)) : base
}

/** ترجمة نص واجهة. المتغيرات بصيغة {name}. */
export function t(text: string, vars?: Record<string, string | number>): string {
  return translate(text, locale, dictionary, vars)
}

/** صياغة العدد: عربي (مفرد/مثنى/جمع) وإنجليزي (مفرد/جمع) */
export function plural(count: number, forms: { one: string; two: string; few: string; many: string }): string {
  if (locale === 'en') return t(count === 1 ? forms.one : forms.many, { n: count })
  const form = count === 1 ? forms.one : count === 2 ? forms.two : count >= 3 && count <= 10 ? forms.few : forms.many
  return t(form, { n: count })
}

function applyDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}

async function loadDictionary(lang: Locale) {
  if (lang === 'en' && !dictionary) dictionary = (await import('./en')).default
}

/** قبل أول رسم: تحميل القاموس إن كانت اللغة المحفوظة إنجليزية */
export async function initLocale(): Promise<void> {
  try { await loadDictionary(locale) } catch { locale = 'ar' }
  applyDocument()
}

export async function setLocale(next: Locale): Promise<void> {
  if (next === locale) return
  await loadDictionary(next)
  locale = next
  try { localStorage.setItem(STORAGE_KEY, next) } catch { /* التخزين غير متاح */ }
  applyDocument()
  listeners.forEach((listener) => listener())
}

export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** يُستخدم في جذر التطبيق: تغيير اللغة يعيد رسم الشجرة كلها فتُقرأ t() بالقيم الجديدة */
export function useLocale(): Locale {
  return useSyncExternalStore(onLocaleChange, getLocale, () => 'ar' as Locale)
}
