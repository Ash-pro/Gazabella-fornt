import { useState, useEffect } from 'react'
import { promptPwaInstall, canInstallPwa } from '../../lib/registerSw'
import { useLocation } from 'react-router-dom'
import { useCartStore } from '../../stores/cartStore'
import { Icon } from '../ui/Icon'

export function PwaInstallPrompt() {
  const location = useLocation()
  const busy = useCartStore((s) => s.isDrawerOpen || !!s.cartToast)
  const [showPrompt, setShowPrompt] = useState(() => canInstallPwa() && !sessionStorage.getItem('gazabella-install-dismissed'))
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    function handleInstallable() {
      if (!sessionStorage.getItem('gazabella-install-dismissed')) setShowPrompt(true)
    }

    window.addEventListener('gazabella-pwa-installable', handleInstallable)
    return () => window.removeEventListener('gazabella-pwa-installable', handleInstallable)
  }, [])

  async function handleInstall() {
    const success = await promptPwaInstall()
    if (success) {
      setInstalled(true)
      setTimeout(() => setShowPrompt(false), 2000)
    }
  }

  if (!showPrompt || location.pathname !== '/' || busy) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-bounce-short lg:bottom-6 lg:left-auto lg:right-6">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--gold)]/30 bg-[#2A1A1F] p-4 text-white shadow-2xl backdrop-blur-lg">
        <img
          src="/brand/symbol/logo-192.webp"
          alt="Gazabella"
          className="size-12 rounded-xl bg-white p-1 shadow-sm shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[var(--gold)] font-extrabold text-xs">
            <Icon name="sparkle" className="size-3.5" />
            <span>تطبيق Gazabella للجوال</span>
          </div>
          <h4 className="text-sm font-extrabold truncate">ثبّتي التطبيق على شاشتكِ الرئيسية</h4>
          <p className="text-[11px] text-white/70 truncate">تصفح فائق السرعة بلمسة واحدة</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-extrabold text-[#2A1A1F] shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            {installed ? 'تم التثبيت ✓' : 'تثبيت'}
          </button>
          <button
            type="button"
            onClick={() => { sessionStorage.setItem('gazabella-install-dismissed', '1'); setShowPrompt(false) }}
            className="rounded-full p-1 text-white/50 hover:text-white"
            aria-label="إغلاق"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
