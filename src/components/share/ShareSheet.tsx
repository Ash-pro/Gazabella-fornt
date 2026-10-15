import { t } from '../../i18n'
import { useMemo, useState } from 'react'
import { isTouchDevice, qrDataUrl, shareCard, shareHref, withUtm, type ShareChannel, type ShareContent } from '../../lib/share'
import { track } from '../../lib/analytics'
import { getImageUrl } from '../../lib/apiClient'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { ChannelIcon } from './ChannelIcon'

type Channel = { id: ShareChannel; label: string; touchOnly?: boolean }

/** تطبيقات التواصل — صف واحد متناسق (6 على الكمبيوتر، تمرير أفقي على الجوال) */
const APPS: Channel[] = [
  { id: 'whatsapp', label: 'واتساب' },
  { id: 'telegram', label: 'تيليجرام' },
  { id: 'messenger', label: 'ماسنجر', touchOnly: true },
  { id: 'facebook', label: 'فيسبوك' },
  { id: 'x', label: 'إكس' },
  { id: 'pinterest', label: 'بنترست' },
  { id: 'snapchat', label: 'سناب شات' },
]
/** قنوات مباشرة تظهر كأزرار بجانب ستوري وQR */
const DIRECT: Channel[] = [
  { id: 'email', label: 'البريد' },
  { id: 'sms', label: 'رسالة نصية', touchOnly: true },
]
const opensNewTab = (id: ShareChannel) => id !== 'email' && id !== 'sms' && id !== 'messenger'

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
  const visible = (c: Channel) => !c.touchOnly || touch
  const thumb = getImageUrl(content.image) ?? '/brand/symbol/logo-128.webp'
  const host = useMemo(() => { try { return new URL(content.url).host } catch { return '' } }, [content.url])

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
        <div className="share-sheet__preview">
          <img src={thumb} alt="" width="52" height="52" />
          <div>
            <b>{content.title}</b>
            {content.text && <p>{content.text}</p>}
            {host && <small dir="ltr">{host}</small>}
          </div>
        </div>

        {canNative && touch && <button type="button" className="share-sheet__native" onClick={() => void native()}><ChannelIcon name="device" /> {t('مشاركة عبر تطبيقات جهازكِ')}</button>}

        <section className="share-sheet__section" aria-labelledby="share-apps-label">
          <h3 id="share-apps-label" className="share-sheet__label">{t('شاركي عبر')}</h3>
          <ul className="share-sheet__apps">
            {APPS.filter(visible).map((c) => (
              <li key={c.id}>
                <a className={`share-ch share-ch--${c.id}`} href={shareHref(c.id, content)} target={opensNewTab(c.id) ? '_blank' : undefined} rel="noopener noreferrer" onClick={() => log(c.id)}>
                  <span className="share-ch__icon"><ChannelIcon name={c.id} /></span>
                  <span className="share-ch__label">{t(c.label)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <ul className="share-sheet__actions">
          <li>
            <button type="button" className="share-act share-act--instagram" onClick={() => void story()} disabled={card === 'working'} aria-busy={card === 'working'}>
              <span className="share-act__icon"><ChannelIcon name="instagram" /></span>
              <span>{t('ستوري')}</span>
            </button>
          </li>
          <li>
            <button type="button" className={`share-act share-act--qr${qr ? ' is-active' : ''}`} onClick={() => setQr((v) => !v)} aria-expanded={qr}>
              <span className="share-act__icon"><ChannelIcon name="qr" /></span>
              <span>{t('رمز QR')}</span>
            </button>
          </li>
          {DIRECT.filter(visible).map((c) => (
            <li key={c.id}>
              <a className={`share-act share-act--${c.id}`} href={shareHref(c.id, content)} onClick={() => log(c.id)}>
                <span className="share-act__icon"><ChannelIcon name={c.id} /></span>
                <span>{t(c.label)}</span>
              </a>
            </li>
          ))}
        </ul>

        {card === 'done' && <p className="share-sheet__note" role="status"><Icon name="check" className="size-4" /> {canNative ? t('اختاري إنستغرام أو واتساب لنشر البطاقة كستوري.') : t('نزّلنا البطاقة — انشريها كستوري وأضيفي الرابط.')}</p>}
        {card === 'failed' && <p className="field-error" role="alert">{t('تعذّر إنشاء البطاقة على هذا الجهاز.')}</p>}

        {qr && (
          <div className="share-sheet__qr">
            <img src={qrSrc} alt={t('رمز QR للرابط')} width="176" height="176" />
            <a className="text-link" href={qrSrc} download="gazabella-qr.svg" onClick={() => log('qr')}>{t('تنزيل الرمز')}</a>
          </div>
        )}

        <div className={`share-sheet__copy${copied ? ' is-copied' : ''}`}>
          <Icon name="link" className="size-4 share-sheet__copy-icon" />
          <input readOnly dir="ltr" value={content.url} aria-label={t('رابط المشاركة')} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={() => void copy()} aria-live="polite"><Icon name={copied ? 'check' : 'link'} className="size-4" /> {copied ? t('تم النسخ') : t('نسخ')}</button>
        </div>
      </div>
    </Dialog>
  )
}
