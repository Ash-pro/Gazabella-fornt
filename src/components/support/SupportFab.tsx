import { t } from '../../i18n'
import { useLocation } from 'react-router-dom'
import { useSupportContact } from '../../hooks/useSupportWhatsapp'
import { whatsappLink } from '../../content/storeInfo'
import { track } from '../../lib/analytics'

/** مسارات لا يظهر فيها الزر حتى لا يزاحم زر الإجراء الأساسي */
const HIDDEN_ON = [/^\/checkout(\/|$)/, /^\/auth(\/|$)/, /^\/profile(\/|$)/]

function contextMessage(pathname: string): string {
  const order = /^\/orders\/([^/]+)$/.exec(pathname)?.[1]
  if (order && order !== 'lookup') return t('مرحباً Gazabella، عندي استفسار عن الطلب {v1}', { v1: decodeURIComponent(order) })
  const product = /^\/products\/([^/]+)$/.exec(pathname)?.[1]
  if (product) return t('مرحباً Gazabella، عندي استفسار عن منتج: {origin}{pathname}', { origin: window.location.origin, pathname: pathname })
  return t('مرحباً Gazabella، عندي استفسار')
}

export function SupportFab() {
  const { pathname } = useLocation()
  const { whatsapp } = useSupportContact()
  if (!whatsapp || HIDDEN_ON.some((re) => re.test(pathname))) return null
  return (
    <aside aria-label={t('الدعم')}>
    <a
      className="support-fab"
      href={whatsappLink(whatsapp, contextMessage(pathname))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('تواصلي معنا عبر واتساب')}
      onClick={() => track('contact', { channel: 'whatsapp', page: pathname.replace(/\/(orders|products)\/[^/]+$/, '/$1/:id') })}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5Z" />
        <path d="M8.5 9.5c.3 2.6 2.4 4.8 5 5.2l1.3-1.3 2 .8v1.6c-4.6.4-9.4-4.3-9-9h1.6l.8 2Z" fill="currentColor" stroke="none" />
      </svg>
      <span className="support-fab__label">{t('واتساب')}</span>
    </a>
    </aside>
  )
}
