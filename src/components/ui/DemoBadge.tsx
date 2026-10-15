import { t } from '../../i18n'

/** R-1: وسم أي محتوى مصدره بيانات العرض التجريبي — لا يظهر أبداً لبيانات حقيقية */
export function DemoBadge({ show }: { show: boolean }) {
  if (!show) return null
  return <span className="demo-badge" title={t('هذه بيانات للعرض فقط وتُستبدل بالبيانات الحقيقية عند ربط الخادم')}>{t('عرض تجريبي')}</span>
}
