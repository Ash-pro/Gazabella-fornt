import { useState } from 'react'
import { getLocale, setLocale } from '../../i18n'
import { Icon } from '../ui/Icon'

/** تبديل فوري بين العربية والإنجليزية — الاختيار يُحفظ على الجهاز. يعرض اسم اللغة التي سينتقل إليها. */
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
      <Icon name="globe" className="size-[18px]" />
      <span className="lang-switch__full">{next === 'en' ? 'English' : 'العربية'}</span>
      <span className="lang-switch__short" aria-hidden="true">{next === 'en' ? 'EN' : 'ع'}</span>
    </button>
  )
}
