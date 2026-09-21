import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { Icon } from '../ui/Icon'

export function MobileBottomNav() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const openDrawer = useCartStore((state) => state.openDrawer)
  const navigate = useNavigate()
  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: gazabellaApi.getCart })

  // لا نعرض الشريط السفلي داخل لوحة التاجر أو لوحة التوصيل لتفادي التداخل
  if (location.pathname.startsWith('/merchant') || location.pathname.startsWith('/delivery')) {
    return null
  }

  const cartCount = cart?.total_items || 0

  return (
    <nav
      aria-label="التنقل السفلي للجوال"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-white/95 backdrop-blur-lg lg:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 items-center h-16 px-2 text-center">
        {/* الرئيسية */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-extrabold transition-colors ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--text-3)] hover:text-[var(--text)]'
            }`
          }
        >
          <Icon name="sparkle" className="size-5" />
          <span>الرئيسية</span>
        </NavLink>

        {/* الفئات */}
        <button
          type="button"
          onClick={() => { navigate('/#categories') }}
          className="flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-extrabold text-[var(--text-3)] hover:text-[var(--primary)] transition-colors"
        >
          <Icon name="filter" className="size-5" />
          <span>الفئات</span>
        </button>

        {/* السلة السريعة المنزلقة */}
        <button
          type="button"
          onClick={openDrawer}
          className="relative flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-extrabold text-[var(--text-3)] hover:text-[var(--primary)] transition-colors"
          aria-label={`السلة، ${cartCount} عناصر`}
        >
          <div className="relative">
            <Icon name="bag" className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 grid min-w-[1.1rem] h-[1.1rem] place-items-center rounded-full bg-[var(--primary)] px-1 font-mono text-[9px] font-black text-white">
                {cartCount}
              </span>
            )}
          </div>
          <span>السلة</span>
        </button>

        {/* طلباتي / حسابي */}
        <NavLink
          to={token ? '/orders' : '/auth'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-extrabold transition-colors ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--text-3)] hover:text-[var(--text)]'
            }`
          }
        >
          <Icon name="user" className="size-5" />
          <span>{token ? 'طلباتي' : 'حسابي'}</span>
        </NavLink>
      </div>
    </nav>
  )
}
