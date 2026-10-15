import { t } from '../../i18n'
import { useState } from 'react'
import { ShareSheet } from '../share/ShareSheet'
import { Icon } from '../ui/Icon'

/** P1-6 مشاركة المنتج — تفتح لوحة المشاركة الغنية (P4-3) */
export function ShareButton({ title, url, text, image }: { title: string; url: string; text?: string; image?: string | null }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="icon-button share__btn" onClick={() => setOpen(true)} aria-label={t('مشاركة المنتج')}><Icon name="share" className="size-5" /></button>
      {open && <ShareSheet content={{ url, title, text, image, campaign: 'product' }} onClose={() => setOpen(false)} />}
    </>
  )
}
