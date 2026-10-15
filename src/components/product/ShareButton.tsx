import { t } from '../../i18n'
import { useState } from 'react'
import { track } from '../../lib/analytics'
import { Icon } from '../ui/Icon'

/** P1-6 مشاركة المنتج: مشاركة النظام على الجوال، وإلا قائمة صغيرة (واتساب · نسخ الرابط) */
export function ShareButton({ title, url }: { title: string; url: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function share() {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title, url }); track('share', { method: 'native' }) } catch { /* أُلغيت */ }
      return
    }
    setOpen((o) => !o)
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); track('share', { method: 'copy' }); setTimeout(() => setCopied(false), 2000) } catch { /* غير متاح */ }
  }

  return (
    <div className="share" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      <button type="button" className="icon-button share__btn" onClick={() => void share()} aria-expanded={open} aria-label={t('مشاركة المنتج')}><Icon name="share" className="size-5" /></button>
      {open && (
        <div className="share__menu" role="menu">
          <a role="menuitem" href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => track('share', { method: 'whatsapp' })}><Icon name="whatsapp" className="size-4" /> {t('واتساب')}</a>
          <button role="menuitem" type="button" onClick={() => void copy()}><Icon name={copied ? 'check' : 'link'} className="size-4" /> {copied ? t('تم النسخ') : t('نسخ الرابط')}</button>
        </div>
      )}
    </div>
  )
}
