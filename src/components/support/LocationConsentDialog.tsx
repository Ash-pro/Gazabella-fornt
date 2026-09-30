import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '../ui/Dialog'

type PermissionView = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'insecure'

async function readPermission(): Promise<PermissionView> {
  if (!window.isSecureContext) return 'insecure'
  if (!('geolocation' in navigator)) return 'unsupported'
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
    return (status?.state as PermissionView | undefined) ?? 'prompt'
  } catch {
    return 'prompt' // Safari القديم لا يدعم permissions.query
  }
}

/** شرح واضح قبل طلب إذن الموقع من المتصفح — يرفع نسبة القبول ويحقق الشفافية */
export function LocationConsentDialog({ onConfirm, onClose, busy = false }: { onConfirm: () => void; onClose: () => void; busy?: boolean }) {
  const [permission, setPermission] = useState<PermissionView>('checking')
  useEffect(() => { let alive = true; void readPermission().then((p) => { if (alive) setPermission(p) }); return () => { alive = false } }, [])

  const blocked = permission === 'denied' || permission === 'unsupported' || permission === 'insecure'
  return (
    <Dialog title="مشاركة موقعكِ الحالي" onClose={onClose}>
      <div className="location-consent">
        <p>لحفظ ملفكِ نحتاج موقعكِ الحالي <b>مرة واحدة</b> ليصل المندوب لعنوانكِ بدقة.</p>
        <ul>
          <li>يُرسل الموقع لحظة الحفظ فقط — <b>لا تتبع مستمر</b>.</li>
          <li>يراه فريق التوصيل فقط عند توصيل طلباتكِ، ولا تراه المتاجر.</li>
          <li>تحديث الملف اختياري؛ الرفض لا يؤثر على التسوق أو الطلب.</li>
        </ul>
        {permission === 'denied' && <p role="alert" className="location-consent__warn">إذن الموقع مرفوض حالياً في المتصفح. افتحي إعدادات الموقع من رمز القفل 🔒 بجانب الرابط، اسمحي بـ«الموقع»، ثم أعيدي المحاولة.</p>}
        {permission === 'unsupported' && <p role="alert" className="location-consent__warn">المتصفح لا يدعم تحديد الموقع. جرّبي متصفحاً آخر، أو تابعي التسوق دون تحديث الملف.</p>}
        {permission === 'insecure' && <p role="alert" className="location-consent__warn">تحديد الموقع يعمل فقط على رابط آمن (https).</p>}
        <p className="location-consent__more">التفاصيل في <Link to="/privacy" target="_blank" rel="noopener" className="text-link">سياسة الخصوصية</Link>.</p>
        <div className="location-consent__actions">
          <button type="button" className="btn-primary" disabled={blocked || busy || permission === 'checking'} onClick={onConfirm}>
            {busy ? 'جارٍ تحديد الموقع…' : permission === 'granted' ? 'موافقة وحفظ' : 'موافقة ومشاركة الموقع'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>ليس الآن</button>
        </div>
      </div>
    </Dialog>
  )
}
