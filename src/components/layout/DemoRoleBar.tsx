import { Link, useLocation } from 'react-router-dom'
import { isMockMode } from '../../api/gazabella'
import { Icon } from '../ui/Icon'
import { t } from '../../i18n'

export function DemoRoleBar() {
  const location = useLocation()

  // الشريط خاص بوضع المحاكاة فقط — لا يظهر إطلاقاً مع الـ API الحقيقي
  if (!isMockMode()) return null

  function resetMockData() {
    if (window.confirm(t('هل تريد إعادة تعيين بيانات التجربة الافتراضية؟'))) {
      localStorage.removeItem('gazabella_mock_cart')
      localStorage.removeItem('gazabella_mock_orders')
      localStorage.removeItem('gazabella_mock_missions')
      localStorage.removeItem('gazabella_mock_prep')
      localStorage.removeItem('gazabella_mock_inventory')
      localStorage.removeItem('gazabella_mock_disputes')
      localStorage.removeItem('gazabella_demo_wishlist')
      sessionStorage.removeItem('gazabella_checkout')
      window.location.reload()
    }
  }

  const path = location.pathname
  const isStore = path === '/' || path.startsWith('/products') || path.startsWith('/cart') || path.startsWith('/checkout')
  const linkClass = (active: boolean) =>
    `flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
      active ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`

  return (
    <aside aria-label={t('شريط المعاينة التجريبية')} className="relative z-50 border-b border-[var(--primary)]/20 bg-[var(--c-ink-deep)] text-xs text-white">
      <div className="container-page flex flex-wrap items-center justify-between gap-2 py-2">
        {/* مؤشر النمط الحالي */}
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-400" />
          <span className="font-extrabold text-[var(--gold)]">Gazabella</span>
          <span className="rounded bg-white/10 px-2 py-0.5 font-bold text-white/90">
            ⚡ {t('وضع البيانات الوهمية (Mock Mode)')}
          </span>
        </div>

        {/* روابط التنقل السريع بين اللوحات الثلاث */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden text-[var(--text-3)] sm:inline">{t('التبديل بين اللوحات:')}</span>

          <Link to="/" className={linkClass(isStore)}>
            <Icon name="bag" className="size-3.5" />
            <span>{t('المتجر')}</span>
          </Link>

          <Link to="/merchant" className={linkClass(path.startsWith('/merchant'))}>
            <Icon name="store" className="size-3.5" />
            <span>{t('لوحة التاجر')}</span>
          </Link>

          <Link to="/delivery" className={linkClass(path.startsWith('/delivery'))}>
            <Icon name="truck" className="size-3.5" />
            <span>{t('لوحة التوصيل')}</span>
          </Link>

          <button
            type="button"
            onClick={resetMockData}
            title={t('إعادة تعيين السلة والطلبات للحالة الافتراضية')}
            className="ms-2 flex items-center gap-1 rounded border border-white/20 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Icon name="refresh" className="size-3" />
            <span className="hidden md:inline">{t('إعادة ضبط')}</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
