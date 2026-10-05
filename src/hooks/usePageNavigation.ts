import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// موضع التمرير لكل إدخال في السجل، مع الـ hash الذي حُفظ عنده: تغيير الـ hash داخل الصفحة يحمل المفتاح نفسه ولا يجوز أن يستعيد الموضع القديم
const positions = new Map<string, { top: number; hash: string }>()
export function usePageNavigation() {
  const location = useLocation()
  const type = useNavigationType()
  const preserveScroll = Boolean(location.state?.preserveScroll)
  const lastPath = useRef<string | null>(null)
  useEffect(() => {
    let frame = 0
    let attempts = 0
    let ran = false
    let stopSettle = () => {}
    // المحتوى فوق الهدف يصل لاحقًا من الخادم فيدفعه للأسفل: نعيد المحاذاة مع تغيّر ارتفاع الصفحة لفترة قصيرة،
    // ونتوقف فور تفاعل المستخدم حتى لا نخطف التمرير منه
    const settle = (id: string) => {
      const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
      const observer = new ResizeObserver(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }))
      const stop = () => { observer.disconnect(); window.clearTimeout(timer); events.forEach((name) => window.removeEventListener(name, stop)) }
      const timer = window.setTimeout(stop, 4000)
      events.forEach((name) => window.addEventListener(name, stop, { passive: true, once: true }))
      observer.observe(document.body)
      stopSettle = stop
    }
    const move = () => {
      ran = true
      const saved = positions.get(location.key)
      if (type === 'POP' && saved && saved.hash === location.hash) {
        window.scrollTo({top:saved.top,behavior:'instant'})
      } else if (preserveScroll) {
        return
      } else if (location.hash) {
        const target = document.getElementById(location.hash.slice(1))
        if (target) { target.scrollIntoView({behavior:'instant'}); settle(location.hash.slice(1)) }
        else if (attempts++ < 90) frame = requestAnimationFrame(move)
      } else {
        window.scrollTo({top:0,behavior:'instant'})
      }
      // صفحة جديدة: ننقل التركيز لبداية المحتوى حتى يبدأ منه الكيبورد وقارئ الشاشة (لا عند أول تحميل ولا إن كان التركيز داخل المحتوى أصلاً)
      const changed = lastPath.current !== null && lastPath.current !== location.pathname
      lastPath.current = location.pathname
      if (changed && type !== 'POP') {
        const main = document.getElementById('main-content')
        if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true })
      }
    }
    frame = requestAnimationFrame(move)
    return () => {
      // لا نحفظ موضعًا لتأثير أُلغي قبل أن يعمل (StrictMode) حتى لا يُستعاد الصفر بدل الانتقال للهدف
      if (ran) positions.set(location.key, { top: window.scrollY, hash: location.hash })
      if (positions.size > 100) positions.delete(positions.keys().next().value!)
      cancelAnimationFrame(frame)
      stopSettle()
    }
  }, [location.key, location.hash, location.pathname, type, preserveScroll])
}
