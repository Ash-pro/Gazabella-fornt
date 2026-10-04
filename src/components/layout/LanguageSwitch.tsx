import { useState } from 'react'
import { getLocale, setLocale } from '../../i18n'

/** تبديل فوري بين العربية والإنجليزية — الاختيار يُحفظ على الجهاز */
export function LanguageSwitch() {
  const [busy, setBusy] = useState(false)
  const next = getLocale() === 'ar' ? 'en' : 'ar'
  return (
    <button
      type="button"
      className="lang-switch"
      lang={next}
      disabled={busy}
      aria-label={next === 'en' ? 'Switch to English' : 'التبديل إلى العربية'}
      onClick={() => { setBusy(true); void setLocale(next).finally(() => setBusy(false)) }}
    >
      {next === 'en' ? 'EN' : 'ع'}
    </button>
  )
}
