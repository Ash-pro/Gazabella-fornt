import { t } from '../../i18n'
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { getImageUrl } from '../../lib/apiClient'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'

/**
 * معرض صور المنتج بملء الشاشة: الصورة كاملة داخل الشاشة بدون تمرير، تنقّل بالأسهم/السحب/لوحة المفاتيح،
 * عدّاد وصور مصغّرة، وتكبير بالنقر (أو النقر المزدوج على الجوال) مع تحريك نقطة التكبير.
 */
export function ProductLightbox({ title, images, start = 0, onClose }: { title: string; images: string[]; start?: number; onClose: () => void }) {
  const list = images.map((u) => getImageUrl(u)).filter((u): u is string => !!u)
  const [index, setIndex] = useState(Math.min(Math.max(start, 0), Math.max(list.length - 1, 0)))
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const swipe = useRef<number | null>(null)
  const swiped = useRef(false)
  const many = list.length > 1
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'

  const go = (step: number) => { if (!many) return; setZoomed(false); setIndex((i) => (i + step + list.length) % list.length) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') go(rtl ? 1 : -1)
      else if (e.key === 'ArrowRight') go(rtl ? -1 : 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function aim(e: MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
  }
  function down(e: PointerEvent<HTMLElement>) { if (!zoomed) swipe.current = e.clientX }
  function up(e: PointerEvent<HTMLElement>) {
    if (swipe.current === null) return
    const dx = e.clientX - swipe.current
    swipe.current = null
    if (Math.abs(dx) > 50) { swiped.current = true; go((dx < 0 ? 1 : -1) * (rtl ? -1 : 1)) }
  }

  if (!list.length) return null
  return (
    <Dialog title={title} onClose={onClose} className="lightbox">
      <div className="lightbox__body">
        <div
          className={`lightbox__stage${zoomed ? ' is-zoomed' : ''}`}
          onClick={(e) => { if (swiped.current) { swiped.current = false; return } aim(e); setZoomed((z) => !z) }}
          onPointerMove={(e) => { if (zoomed && e.pointerType === 'mouse') aim(e) }}
          onPointerDown={down}
          onPointerUp={up}
          role="button"
          tabIndex={0}
          aria-label={zoomed ? t('تصغير الصورة') : t('تكبير الصورة')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoomed((z) => !z) } }}
        >
          <img key={list[index]} src={list[index]} alt={`${title} — ${index + 1}`} style={{ transformOrigin: origin }} draggable={false} />
        </div>

        {many && (
          <>
            <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label={t('الصورة السابقة')}><Icon name="chevron" className="size-5" /></button>
            <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label={t('الصورة التالية')}><Icon name="chevron" className="size-5" /></button>
            <span className="lightbox__count num" dir="ltr" aria-live="polite">{index + 1} / {list.length}</span>
          </>
        )}
      </div>

      {many && (
        <div className="lightbox__thumbs">
          {list.map((src, i) => (
            <button key={src} type="button" onClick={() => { setZoomed(false); setIndex(i) }} aria-label={t('عرض الصورة {v1}', { v1: i + 1 })} aria-pressed={i === index}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <p className="lightbox__hint">{zoomed ? t('حرّكي المؤشر لاستكشاف التفاصيل — انقري للتصغير') : t('انقري على الصورة للتكبير')}</p>
    </Dialog>
  )
}
