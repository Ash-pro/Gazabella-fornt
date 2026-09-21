import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
export function Dialog({ title, onClose, children, sheet = false, bottom = false }: { title: string; onClose: () => void; children: ReactNode; sheet?: boolean; bottom?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.showModal()
    return () => { document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  return createPortal(<dialog ref={ref} className={bottom ? 'app-dialog app-dialog--bottom' : sheet ? 'app-dialog app-dialog--sheet' : 'app-dialog'} onCancel={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose() }} aria-label={title}>
    <div className="dialog-inner">{bottom && <div className="sheet-handle" aria-hidden="true" />}<div className="dialog-heading"><h2>{title}</h2><button className="icon-button" type="button" aria-label="إغلاق" onClick={onClose}><Icon name="close" className="size-5" /></button></div>{children}</div>
  </dialog>, document.body)
}
