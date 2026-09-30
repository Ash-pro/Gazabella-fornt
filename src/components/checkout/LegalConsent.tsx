import { Link } from 'react-router-dom'

/** إقرار الموافقة على الشروط والخصوصية — يظهر قبل أي إجراء ينشئ حساباً أو طلباً */
export function LegalConsent({ action = 'بإتمام الطلب' }: { action?: string }) {
  return (
    <p className="legal-consent">
      {action} توافقين على <Link to="/terms" target="_blank" rel="noopener">شروط الاستخدام</Link> و<Link to="/privacy" target="_blank" rel="noopener">سياسة الخصوصية</Link> و<Link to="/returns" target="_blank" rel="noopener">سياسة الاسترجاع</Link>.
    </p>
  )
}
