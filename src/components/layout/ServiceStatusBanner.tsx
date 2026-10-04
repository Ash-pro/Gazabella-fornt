import { t } from '../../i18n'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { isMockMode } from '../../api/gazabella'
import { queryClient } from '../../lib/queryClient'
import { serviceStatus, statusUrl } from '../../lib/serviceStatus'
import { Icon } from '../ui/Icon'

const RETRY_MS = 20_000
const subscribeOnline = (cb: () => void) => { window.addEventListener('online', cb); window.addEventListener('offline', cb); return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb) } }

async function ping(): Promise<boolean> {
  try {
    const res = await fetch(statusUrl(import.meta.env.VITE_API_BASE_URL, window.location.origin), { cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    return res.ok
  } catch { return false }
}

/** شريط واحد أعلى الموقع عند انقطاع الإنترنت أو توقف الخادم، مع إعادة محاولة هادئة كل 20 ثانية */
export function ServiceStatusBanner() {
  const down = useSyncExternalStore(serviceStatus.subscribe, serviceStatus.isDown, () => false)
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const [checking, setChecking] = useState(false)

  const recheck = async () => {
    if (checking) return
    setChecking(true)
    const ok = await ping()
    setChecking(false)
    if (!ok) return
    serviceStatus.set(false)
    void queryClient.invalidateQueries()
  }

  useEffect(() => {
    if (!down || !online) return
    const id = window.setInterval(() => { void ping().then((ok) => { if (ok) { serviceStatus.set(false); void queryClient.invalidateQueries() } }) }, RETRY_MS)
    return () => window.clearInterval(id)
  }, [down, online])

  if (isMockMode()) return null
  if (!online) return <div className="service-banner" role="status"><Icon name="alert" className="size-4 shrink-0" /><span>{t('لا يوجد اتصال بالإنترنت. سنكمل تلقائياً عند عودة الاتصال.')}</span></div>
  if (!down) return null
  return (
    <div className="service-banner" role="status">
      <Icon name="alert" className="size-4 shrink-0" />
      <span>{t('الخدمة متوقفة مؤقتاً، ونعيد المحاولة تلقائياً. سلّتكِ محفوظة.')}</span>
      <button type="button" onClick={() => void recheck()} disabled={checking}>{checking ? t('نتحقق…') : t('إعادة المحاولة')}</button>
    </div>
  )
}
