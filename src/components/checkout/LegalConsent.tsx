import { t } from '../../i18n'
import { Link } from 'react-router-dom'

/** إقرار الموافقة على الشروط والخصوصية — يظهر قبل أي إجراء ينشئ حساباً أو طلباً */
export function LegalConsent({ action = t('بإتمام الطلب') }: { action?: string }) {
  return (
    <p className="legal-consent">
      {action} {t('توافقين على')} <Link to="/terms" target="_blank" rel="noopener">{t('شروط الاستخدام')}</Link> {t('و')}<Link to="/privacy" target="_blank" rel="noopener">{t('سياسة الخصوصية')}</Link> {t('و')}<Link to="/returns" target="_blank" rel="noopener">{t('سياسة الاسترجاع')}</Link>.
    </p>
  )
}
