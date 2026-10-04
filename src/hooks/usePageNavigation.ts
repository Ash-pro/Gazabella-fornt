import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const positions = new Map<string, number>()
export function usePageNavigation() {
  const location = useLocation()
  const type = useNavigationType()
  const preserveScroll = Boolean(location.state?.preserveScroll)
  const lastPath = useRef<string | null>(null)
  useEffect(() => {
    let frame = 0
    let attempts = 0
    const move = () => {
      if (type === 'POP' && positions.has(location.key)) {
        window.scrollTo({top:positions.get(location.key)!,behavior:'instant'})
      } else if (preserveScroll) {
        return
      } else if (location.hash) {
        const target = document.getElementById(location.hash.slice(1))
        if (target) target.scrollIntoView({behavior:'instant'})
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
      positions.set(location.key, window.scrollY)
      if (positions.size > 100) positions.delete(positions.keys().next().value!)
      cancelAnimationFrame(frame)
    }
  }, [location.key, location.hash, location.pathname, type, preserveScroll])
}
