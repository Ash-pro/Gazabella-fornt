import { t } from '../../i18n'
import { useMemo, useState } from 'react'
import { isTouchDevice, qrDataUrl, shareCard, shareHref, withUtm, type ShareChannel, type ShareContent } from '../../lib/share'
import { track } from '../../lib/analytics'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { ChannelIcon } from './ChannelIcon'

const CHANNELS: Array<{ id: ShareChannel; label: string; touchOnly?: boolean }> = [
  { id: 'whatsapp', label: 'واتساب' },
  { id: 'telegram', label: 'تيليجرام' },
  { id: 'facebook', label: 'فيسبوك' },
  { id: 'messenger', label: 'ماسنجر', touchOnly: true },
  { id: 'x', label: 'إكس' },
  { id: 'pinterest', label: 'بنترست' },
  { id: 'snapchat', label: 'سناب شات' },
  { id: 'email', label: 'البريد' },
  { id: 'sms', label: 'رسالة نصية', touchOnly: true },
]

/**
 * لوحة مشاركة غنية (P4-3 · P1-6): كل قنوات التواصل + نسخ الرابط + رمز QR + بطاقة ستوري (إنستغرام/حالة واتساب)
 * + مشاركة الجهاز. كل رابط يحمل utm_source للقناة لقياس الزيارات.
 */
export function ShareSheet({ content, lines = [], onClose }: { content: ShareContent; lines?: string[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(false)
  const [card, setCard] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')
  const touch = isTouchDevice()
  const canNative = typeof navigator.share === 'function'
  const qrSrc = useMemo(() => (qr ? qrDataUrl(withUtm(content.url, 'qr', content.campaign)) : ''), [qr, content])
  const log = (method: string) => track('share', { method, campaign: content.campaign })

  async function copy() {
    try { await navigator.clipboard.writeText(withUtm(content.url, 'copy', content.campaign)); setCopied(true); log('copy'); setTimeout(() => setCopied(false), 2200) } catch { /* غير متاح */ }
  }
  async function native() {
    try { await navigator.share({ title: content.title, text: content.text, url: withUtm(content.url, 'native', content.campaign) }); log('native') } catch { /* أُلغيت */ }
  }
  /** بطاقة PNG للستوري: مشاركة كملف على الجوال (إنستغرام/واتساب يظهران في القائمة)، وإلا تنزيل */
  async function story() {
    setCard('working')
    try {
      const blob = await shareCard(content, lines.length ? lines : [content.text ?? ''])
      if (!blob) throw new Error('canvas')
      const file = new File([blob], 'gazabella.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: content.title, text: withUtm(content.url, 'story', content.campaign) }).catch(() => undefined)
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gazabella.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      }
      log('story'); setCard('done')
    } catch { setCard('failed') }
  }

  return (
    <Dialog title={t('مشاركة')} onClose={onClose} bottom>
      <div className="share-sheet">
        <p className="share-sheet__title">{content.title}</p>

        {canNative && touch && <button type="button" className="share-sheet__native" onClick={() => void native()}><ChannelIcon name="device" /> {t('مشاركة عبر تطبيقات جهازكِ')}</button>}

        <ul className="share-sheet__grid">
          {CHANNELS.filter((c) => !c.touchOnly || touch).map((c) => (
            <li key={c.id}>
              <a className={`share-ch share-ch--${c.id}`} href={shareHref(c.id, content)} target={c.id === 'email' || c.id === 'sms' || c.id === 'messenger' ? undefined : '_blank'} rel="noopener noreferrer" onClick={() => log(c.id)}>
                <span className="share-ch__icon"><ChannelIcon name={c.id} /></span>
                <span>{t(c.label)}</span>
              </a>
            </li>
          ))}
          <li>
            <button type="button" className="share-ch share-ch--instagram" onClick={() => void story()} disabled={card === 'working'}>
              <span className="share-ch__icon"><ChannelIcon name="instagram" /></span>
              <span>{t('ستوري')}</span>
            </button>
          </li>
          <li>
            <button type="button" className="share-ch share-ch--qr" onClick={() => setQr((v) => !v)} aria-expanded={qr}>
              <span className="share-ch__icon"><ChannelIcon name="qr" /></span>
              <span>{t('رمز QR')}</span>
            </button>
          </li>
        </ul>

        {card === 'done' && <p className="share-sheet__note" role="status"><Icon name="check" className="size-4" /> {canNative ? t('اختاري إنستغرام أو واتساب لنشر البطاقة كستوري.') : t('نزّلنا البطاقة — انشريها كستوري وأضيفي الرابط.')}</p>}
        {card === 'failed' && <p className="field-error" role="alert">{t('تعذّر إنشاء البطاقة على هذا الجهاز.')}</p>}

        {qr && (
          <div className="share-sheet__qr">
            <img src={qrSrc} alt={t('رمز QR للرابط')} width="200" height="200" />
            <a className="text-link" href={qrSrc} download="gazabella-qr.svg" onClick={() => log('qr')}>{t('تنزيل الرمز')}</a>
          </div>
        )}

        <div className="share-sheet__copy">
          <input readOnly dir="ltr" value={content.url} aria-label={t('رابط المشاركة')} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="btn-primary" onClick={() => void copy()}><Icon name={copied ? 'check' : 'link'} className="size-4" /> {copied ? t('تم النسخ') : t('نسخ')}</button>
        </div>
      </div>
    </Dialog>
  )
}
