import { t } from '../../i18n'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSupportContact } from '../../hooks/useSupportWhatsapp'
import { SupportLink } from './SupportLink'

/** مسارات لا يظهر فيها الزر حتى لا يزاحم زر الإجراء الأساسي */
const HIDDEN_ON = [/^\/checkout(\/|$)/, /^\/auth(\/|$)/, /^\/profile(\/|$)/]

/** على الجوال يتنحّى الزر أثناء التمرير للأسفل (القراءة والتصفح) ويعود عند التمرير للأعلى أو التوقف قرب بداية الصفحة، فلا يبقى فوق المحتوى والأزرار */
function useAwayWhileScrollingDown(): boolean {
  const [away, setAway] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        if (Math.abs(y - last) < 12) return
        setAway(y > last && y > 160)
        last = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])
  return away
}

export function SupportFab() {
  const { pathname } = useLocation()
  const away = useAwayWhileScrollingDown()
  const { whatsapp } = useSupportContact()
  if (!whatsapp || HIDDEN_ON.some((re) => re.test(pathname))) return null
  return (
    <aside aria-label={t('الدعم')}>
      <SupportLink className={away ? 'support-fab is-away' : 'support-fab'}><span className="support-fab__label">{t('واتساب')}</span></SupportLink>
    </aside>
  )
}
