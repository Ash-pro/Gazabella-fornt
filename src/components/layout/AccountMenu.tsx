import { t } from '../../i18n'
import { useEffect, useId, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { queryClient } from '../../lib/queryClient'
import { useAuthStore } from '../../stores/authStore'
import { Icon } from '../ui/Icon'

type IconName = Parameters<typeof Icon>[0]['name']

const LINKS: Array<{ to: string; icon: IconName; label: string }> = [
  { to: '/account', icon: 'sparkle', label: 'لوحتي' },
  { to: '/orders', icon: 'package', label: 'طلباتي' },
  { to: '/wallet', icon: 'wallet', label: 'محفظتي' },
  { to: '/?saved=true#products', icon: 'heart', label: 'المحفوظات' },
  { to: '/profile', icon: 'user', label: 'بياناتي وعنواني' },
]

/** بطاقة الحساب في الهيدر: تحية + قائمة منسدلة للتنقل السريع وتسجيل الخروج */
export function AccountMenu() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const here = pathname + search
  const [openedAt, setOpenedAt] = useState(here)
  // تُغلق تلقائياً عند الانتقال لصفحة أخرى
  const visible = open && openedAt === here

  const name = user?.name?.trim() ?? ''
  const firstName = name && !/^\+?\d/.test(name) ? name.split(/\s+/)[0] : null

  const logout = useMutation({
    mutationFn: gazabellaApi.logout,
    onSettled: () => {
      setOpen(false)
      navigate('/', { replace: true })
      useAuthStore.getState().clearSession()
      queryClient.removeQueries({ queryKey: ['orders'] })
      queryClient.removeQueries({ queryKey: ['session'] })
      queryClient.removeQueries({ queryKey: ['wallet'] })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  useEffect(() => {
    if (!visible) return
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [visible])

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <div className="account-menu" ref={root}>
      <button ref={trigger} type="button" className="account-chip" aria-haspopup="menu" aria-expanded={visible} aria-controls={visible ? menuId : undefined}
        aria-label={t('قائمة حسابي')} onClick={() => { setOpenedAt(here); setOpen(!visible) }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpenedAt(here); setOpen(true); window.setTimeout(() => root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 0) } }}>
        <span className="account-chip__avatar" aria-hidden="true">{firstName ? firstName.charAt(0) : <Icon name="user" className="size-4" />}</span>
        <span className="account-chip__text">{firstName ? t('أهلاً {firstName}', { firstName: firstName }) : t('حسابي')}</span>
        <Icon name="chevron" className={`account-chip__caret size-4 ${visible ? 'is-open' : ''}`} />
      </button>

      {visible && (
        <div className="account-pop" id={menuId} role="menu" aria-label={t('قائمة حسابي')} onKeyDown={onMenuKey}>
          <div className="account-pop__head">
            <span className="account-chip__avatar" aria-hidden="true">{firstName ? firstName.charAt(0) : <Icon name="user" className="size-4" />}</span>
            <div className="min-w-0"><b>{firstName ? name : t('حسابي')}</b>{user?.phone && <bdi className="num" dir="ltr">{user.phone}</bdi>}</div>
          </div>
          {LINKS.map((item) => (
            <Link key={item.to} role="menuitem" className="account-pop__item" to={item.to} aria-current={pathname === item.to ? 'page' : undefined} onClick={() => setOpen(false)}>
              <Icon name={item.icon} className="size-[18px]" />{t(item.label)}
            </Link>
          ))}
          <hr />
          <Link role="menuitem" className="account-pop__item" to="/contact" onClick={() => setOpen(false)}><Icon name="phone" className="size-[18px]" />{t('المساعدة والتواصل')}</Link>
          <button type="button" role="menuitem" className="account-pop__item account-pop__item--out" disabled={logout.isPending} onClick={() => logout.mutate()}>
            <Icon name="logout" className="size-[18px]" />{logout.isPending ? t('جارٍ الخروج…') : t('تسجيل الخروج')}
          </button>
        </div>
      )}
    </div>
  )
}
