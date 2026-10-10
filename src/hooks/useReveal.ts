import { useCallback, useRef } from 'react'

/**
 * ظهور لطيف للأقسام مرة واحدة عند دخولها الشاشة.
 * - لا يُخفي شيئًا قبل التأكد: العناصر الظاهرة أصلًا أو مع تقليل الحركة أو دون IntersectionObserver تبقى ظاهرة.
 * - الحالة في data-reveal: "pending" (أسفل الشاشة بانتظار الظهور) ثم "in".
 */
export function useReveal<T extends HTMLElement>() {
  const observer = useRef<IntersectionObserver | null>(null)
  return useCallback((node: T | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node || node.dataset.reveal === 'in') return
    if (!node.dataset.reveal) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      const visible = node.getBoundingClientRect().top < window.innerHeight * 0.92
      if (reduced || visible || typeof IntersectionObserver === 'undefined') { node.dataset.reveal = 'in'; return }
      node.dataset.reveal = 'pending'
    }
    // pending: (أعد) المراقبة — قد يُستدعى المرجع مرتين في وضع التطوير
    observer.current = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        node.dataset.reveal = 'in'
        observer.current?.disconnect()
      }
    }, { rootMargin: '0px 0px -8% 0px' })
    observer.current.observe(node)
  }, [])
}
