import { t } from '../../i18n'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
export function Dialog({ title, onClose, children, sheet = false, bottom = false, returnFocusRef }: { title: string; onClose: () => void; children: ReactNode; sheet?: boolean; bottom?: boolean; returnFocusRef?: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    // العنصر الذي فتح النافذة — لا نستبدله إن كان التركيز داخل النافذة نفسها (إعادة تشغيل الـ effect)
    const active = document.activeElement as HTMLElement | null
    if (active && !ref.current?.contains(active)) trigger.current = active
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!ref.current?.open) ref.current?.showModal()
    const previous = returnFocusRef?.current ?? trigger.current
    return () => {
      document.body.style.overflow = overflow
      requestAnimationFrame(() => { if (previous?.isConnected) previous.focus() })
    }
  }, [returnFocusRef])
  return createPortal(<dialog ref={ref} className={bottom ? 'app-dialog app-dialog--bottom' : sheet ? 'app-dialog app-dialog--sheet' : 'app-dialog'} onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }} aria-label={title}>
    <div className="dialog-inner">{bottom && <div className="sheet-handle" aria-hidden="true" />}<div className="dialog-heading"><h2>{title}</h2><button className="icon-button" type="button" aria-label={t('إغلاق')} onClick={onClose}><Icon name="close" className="size-5" /></button></div>{children}</div>
  </dialog>, document.body)
}
