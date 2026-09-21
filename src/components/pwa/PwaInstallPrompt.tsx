import { useEffect, useState } from 'react'
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

export function PwaInstallPrompt() {
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

  if (!visible || !prompt) return null

  const handleInstall = async () => {
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') setVisible(false)
    } catch {}
  }

  const handleDismiss = () => {
    setDismissed()
    setVisible(false)
  }

  return (
    <div className="pwa-install-prompt" role="complementary" aria-label="تثبيت التطبيق">
      <div className="pwa-install-content">
        <div className="pwa-install-icon" aria-hidden="true">
          <Icon name="bag" className="size-5" />
        </div>
        <div className="pwa-install-text">
          <b className="pwa-install-title">أضيفي Gazabella لشاشتكِ</b>
          <p className="pwa-install-sub">تجربة تطبيق أسرع وأسهل</p>
        </div>
      </div>
      <div className="pwa-install-actions">
        <button type="button" className="btn-primary pwa-install-btn" onClick={handleInstall}>
          تثبيت
        </button>
        <button type="button" className="pwa-dismiss-btn" aria-label="إغلاق" onClick={handleDismiss}>
          <Icon name="close" className="size-4" />
        </button>
      </div>
    </div>
  )
}
