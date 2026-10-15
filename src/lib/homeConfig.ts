import type { HomeSectionKey, HomeSettings } from '../types/api'

/** الترتيب الافتراضي (Docs/HOME_REVIEW_AR.md — الترتيب المستهدف) */
export const DEFAULT_HOME_ORDER: readonly HomeSectionKey[] = ['deals', 'best_sellers', 'picks', 'promo', 'new', 'budget', 'reorder', 'recent', 'services']

/** أقسام لا تظهر إلا بتفعيل صريح من الإدارة (تعتمد على دعم خاص في الباك اند) */
const OPT_IN: ReadonlySet<HomeSectionKey> = new Set(['best_sellers'])

/**
 * ترتيب أقسام الرئيسية الفعلي:
 * - إن أرسلت الإدارة settings.home.sections: نتبع ترتيبها وإظهارها، وأي مفتاح غير مذكور يُضاف بالترتيب الافتراضي
 * - بدونها: الترتيب الافتراضي، والأقسام الاختيارية مخفية
 */
export function resolveHomeOrder(home: HomeSettings | null | undefined): HomeSectionKey[] {
  const configured = home?.sections ?? []
  const listed = new Map(configured.map((s) => [s.key, s.enabled]))
  const order = [...configured.map((s) => s.key), ...DEFAULT_HOME_ORDER.filter((k) => !listed.has(k))]
  return order.filter((key, i) => order.indexOf(key) === i && (listed.get(key) ?? !OPT_IN.has(key)))
}
