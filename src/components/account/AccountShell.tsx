import { t } from '../../i18n'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { getApiErrorMessage } from '../../lib/apiClient'
import { queryClient } from '../../lib/queryClient'
import { formatDate, formatPrice } from '../../lib/format'
import { orderStatusLabel } from '../../lib/orderStatus'
import { orderMatches, summarizeOrders } from '../../lib/orderSearch'
import { orderPath, useAccountOrders } from '../../hooks/useAccountOrders'
import { useAuthStore } from '../../stores/authStore'
import { Icon } from '../ui/Icon'

type SearchProps =
  | { mode: 'filter'; value: string; onChange: (value: string) => void }
  | { mode: 'jump' }

const memberSince = (iso?: string) => {
  const date = iso ? new Date(iso) : null
  return date && !Number.isNaN(date.getTime()) ? formatDate(date, { month: 'long', year: 'numeric' }) : null
}

function initials(name?: string | null) {
  const clean = (name ?? '').trim()
  if (!clean || /^\+?\d/.test(clean)) return null
  return clean[0]
}

/** بحث الحساب: في «طلباتي» يفلتر القائمة مباشرة، وفي الملف الشخصي يعرض قائمة نتائج سريعة */
function AccountSearch(props: SearchProps) {
  const navigate = useNavigate()
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [local, setLocal] = useState('')
  const [open, setOpen] = useState(false)
  const value = props.mode === 'filter' ? props.value : local
  const setValue = props.mode === 'filter' ? props.onChange : setLocal
  const term = value.trim()
  const orders = useAccountOrders()
  const matches = props.mode === 'jump' && term ? (orders.data?.orders ?? []).filter((o) => orderMatches(o, term)) : []
  const showPanel = props.mode === 'jump' && open && !!term

  const searchStore = () => navigate(`/products?search=${encodeURIComponent(term)}`)

  return (
    <div className="acct-search" ref={wrapRef} role="search" aria-label={t('البحث في طلباتكِ')}
      onBlur={(e) => { if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false) }}
      onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); if (!term) (e.target as HTMLElement).blur() } }}>
      <Icon name="search" className="acct-search__icon size-5" />
      <input
        type="search" inputMode="search" enterKeyHint="search" autoComplete="off"
        aria-label={t('ابحثي برقم الطلب أو اسم المنتج')}
        placeholder={t('ابحثي برقم الطلب أو اسم المنتج…')}
        value={value}
        aria-controls={showPanel ? panelId : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setValue(e.target.value); setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !term) return
          e.preventDefault()
          if (props.mode === 'jump') navigate(matches.length ? `/orders?q=${encodeURIComponent(term)}` : `/products?search=${encodeURIComponent(term)}`)
        }}
      />
      {!!value && <button type="button" className="acct-search__clear" aria-label={t('مسح البحث')} onClick={() => setValue('')}><Icon name="close" className="size-4" /></button>}
      {showPanel && (
        <div className="acct-search__panel" id={panelId}>
          <p className="acct-search__group">{t('طلباتكِ')}</p>
          {orders.isLoading ? <p className="acct-search__empty">{t('نبحث في طلباتكِ…')}</p>
            : matches.length ? matches.slice(0, 4).map((order) => (
              <Link key={order.id} className="acct-search__item" to={orderPath(order)}>
                <Icon name="package" className="size-5 shrink-0 text-[var(--primary)]" />
                <span className="min-w-0 flex-1"><b className="num" dir="ltr">{order.order_number}</b><small className="truncate">{order.items.map((i) => i.product_name).join(t('، ')) || orderStatusLabel(order.status)}</small></span>
                <span className="num text-xs font-bold">{formatPrice(order.total)}</span>
              </Link>))
            : <p className="acct-search__empty">{t('لا يوجد طلب مطابق لـ«')}{term}».</p>}
          {matches.length > 4 && <Link className="acct-search__item" to={`/orders?q=${encodeURIComponent(term)}`}><Icon name="arrow" className="size-4 rtl:rotate-180" />{t('عرض كل النتائج (')}{matches.length})</Link>}
          <p className="acct-search__group">{t('المتجر')}</p>
          <button type="button" className="acct-search__item" onClick={searchStore}>
            <Icon name="bag" className="size-5 shrink-0 text-[var(--primary)]" />
            <span>{t('ابحثي عن «')}<b>{term}</b>{t('» في منتجات Gazabella')}</span>
          </button>
        </div>
      )}
    </div>
  )
}

/** إطار موحّد لصفحات الحساب: بطاقة العميلة + أرقام سريعة + تبويبات + بحث */
export function AccountShell({ active, search, children }: { active: 'orders' | 'profile'; search: SearchProps; children: ReactNode }) {
  const navigate = useNavigate()
  const storedUser = useAuthStore((s) => s.user)
  const session = useQuery({ queryKey: ['session'], queryFn: gazabellaApi.getMe, retry: false, staleTime: 60_000 })
  const user = session.data ?? storedUser
  const orders = useAccountOrders()
  const summary = summarizeOrders(orders.data?.orders ?? [])
  const logout = useMutation({
    mutationFn: gazabellaApi.logout,
    onSuccess: () => {
      navigate('/', { replace: true })
      useAuthStore.getState().clearSession()
      queryClient.removeQueries({ queryKey: ['orders'] })
      queryClient.removeQueries({ queryKey: ['session'] })
    },
  })
  const firstName = user?.name && !/^\+?\d/.test(user.name.trim()) ? user.name.trim().split(/\s+/)[0] : null
  const since = memberSince(user?.created_at)
  const stat = (n: number) => (orders.isLoading ? '—' : <span className="num">{n}</span>)

  return (
    <div className="container-page acct-page">
      <section className="acct-hero" aria-label={t('حسابي')}>
        <div className="acct-hero__top">
          <div className="acct-hero__id">
            <span className="acct-avatar" aria-hidden="true">{initials(user?.name) ?? <Icon name="user" className="size-6" />}</span>
            <div className="min-w-0">
              <h1 className="acct-hero__name">{firstName ? t('أهلاً {firstName}', { firstName: firstName }) : t('أهلاً بكِ')}</h1>
              <p className="acct-hero__sub">
                {user?.phone && <bdi className="num" dir="ltr">{user.phone}</bdi>}
                {since && <span>{t('عضوة منذ')} {since}</span>}
              </p>
            </div>
          </div>
          <button type="button" className="acct-logout" disabled={logout.isPending} onClick={() => logout.mutate()}>
            <Icon name="logout" className="size-4" />{logout.isPending ? t('جارٍ الخروج…') : t('تسجيل الخروج')}
          </button>
        </div>
        {logout.isError && <p role="alert" className="field-error relative z-[1]">{getApiErrorMessage(logout.error)}</p>}
        <dl className="acct-stats">
          <div className="acct-stat"><dt>{t('كل الطلبات')}</dt><dd>{stat(summary.count)}</dd></div>
          <div className="acct-stat"><dt>{t('جارية الآن')}</dt><dd>{stat(summary.active)}</dd></div>
          <div className="acct-stat"><dt>{t('مجموع المشتريات')}</dt><dd>{orders.isLoading ? '—' : <span className="num">{formatPrice(summary.spent)}</span>}</dd></div>
        </dl>
      </section>

      <div className="acct-toolbar">
        <nav className="acct-tabs" aria-label={t('أقسام الحساب')}>
          <Link to="/orders" className="acct-tab" aria-current={active === 'orders' ? 'page' : undefined}><Icon name="package" className="size-4" />{t('طلباتي')}</Link>
          <Link to="/profile" className="acct-tab" aria-current={active === 'profile' ? 'page' : undefined}><Icon name="user" className="size-4" />{t('الملف الشخصي')}</Link>
        </nav>
        <AccountSearch {...search} />
      </div>

      {children}
    </div>
  )
}
