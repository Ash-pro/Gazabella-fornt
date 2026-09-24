import { Link, useLocation } from 'react-router-dom'
import { isMockMode } from '../../api/gazabella'
import { Icon } from '../ui/Icon'

export function DemoRoleBar() {
  const location = useLocation()
  const isMock = isMockMode()

  function resetMockData() {
    if (window.confirm('هل تريد إعادة تعيين بيانات التجربة الافتراضية؟')) {
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

  if (!isMock) return null

  return (
    <aside aria-label="شريط المعاينة التجريبية" className="relative z-50 border-b border-[var(--primary)]/20 bg-[#2A1A1F] text-xs text-white">
      <div className="container-page flex flex-wrap items-center justify-between gap-2 py-2">
        {/* مؤشر النمط الحالي */}
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-400" />
          <span className="font-extrabold text-[var(--gold)]">Gazabella</span>
          <span className="rounded bg-white/10 px-2 py-0.5 font-bold text-white/90">
            {isMock ? '⚡ وضع البيانات الوهمية (Mock Mode)' : '🌐 متصل بالـ Real API'}
          </span>
        </div>

        {/* روابط التنقل السريع بين اللوحات الثلاث */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden text-[var(--text-3)] sm:inline">التبديل بين اللوحات:</span>

          <Link
            to="/"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
              location.pathname === '/' || location.pathname.startsWith('/products') || location.pathname.startsWith('/cart') || location.pathname.startsWith('/checkout')
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon name="bag" className="size-3.5" />
            <span>المتجر</span>
          </Link>

          <Link
            to="/merchant"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
              location.pathname.startsWith('/merchant')
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon name="store" className="size-3.5" />
            <span>لوحة التاجر</span>
          </Link>

          <Link
            to="/delivery"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
              location.pathname.startsWith('/delivery')
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon name="truck" className="size-3.5" />
            <span>لوحة التوصيل</span>
          </Link>

          {isMock && (
            <button
              type="button"
              onClick={resetMockData}
              title="إعادة تعيين السلة والطلبات للحالة الافتراضية"
              className="ms-2 flex items-center gap-1 rounded border border-white/20 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Icon name="refresh" className="size-3" />
              <span className="hidden md:inline">إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
