import { t } from '../../i18n'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'gz_pwa_dismissed'

function isDismissed(): boolean {
  try { return localStorage.getItem(DISMISSED_KEY) === '1' } catch { return false }
}

function setDismissed(): void {
  try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
}

/** مسارات لا يظهر فيها الاقتراح حتى لا يغطي نماذج الطلب والدخول */
const HIDDEN_ON = /^\/(checkout|cart|auth|profile|orders)(\/|$)/

export function PwaInstallPrompt() {
  const { pathname } = useLocation()
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed or already installed (standalone mode)
    if (isDismissed()) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !prompt || HIDDEN_ON.test(pathname)) return null

  const handleInstall = async () => {
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      setVisible(false); setPrompt(null)
      if (outcome === 'dismissed') setDismissed()
    } catch {}
  }

  const handleDismiss = () => {
    setDismissed()
    setVisible(false)
  }

  return (
    <div className="pwa-install-prompt" role="complementary" aria-label={t('تثبيت التطبيق')}>
      <div className="pwa-install-content">
        <div className="pwa-install-icon" aria-hidden="true">
          <Icon name="bag" className="size-5" />
        </div>
        <div className="pwa-install-text">
          <b className="pwa-install-title">{t('أضيفي Gazabella لشاشتكِ')}</b>
          <p className="pwa-install-sub">{t('تجربة تطبيق أسرع وأسهل')}</p>
        </div>
      </div>
      <div className="pwa-install-actions">
        <button type="button" className="btn-primary pwa-install-btn" onClick={handleInstall}>
          {t('تثبيت')}
        </button>
        <button type="button" className="pwa-dismiss-btn" aria-label={t('إغلاق')} onClick={handleDismiss}>
          <Icon name="close" className="size-4" />
        </button>
      </div>
    </div>
  )
}
