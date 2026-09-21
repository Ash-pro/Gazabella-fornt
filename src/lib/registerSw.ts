// مسجل Service Worker ومدير تثبيت PWA
interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{outcome:'accepted'|'dismissed'}> }
let deferredPrompt: InstallPromptEvent | null = null

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('ServiceWorker registered with scope: ', reg.scope)
        })
        .catch((err) => {
          console.log('ServiceWorker registration failed: ', err)
        })
    })
  }

  // التقاط حدث التثبيت للتطبيق (BeforeInstallPrompt)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e as InstallPromptEvent
      window.dispatchEvent(new CustomEvent('gazabella-pwa-installable'))
    })
  }
}

export function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return Promise.resolve(false)
  }
  const prompt = deferredPrompt
  deferredPrompt = null
  void prompt.prompt()
  return prompt.userChoice.then((choiceResult: { outcome: string }) => {
    if (choiceResult.outcome === 'accepted') {
      deferredPrompt = null
      return true
    }
    return false
  })
}

export function canInstallPwa(): boolean {
  return Boolean(deferredPrompt)
}
