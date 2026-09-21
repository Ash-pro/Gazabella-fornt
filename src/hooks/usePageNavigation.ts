import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
const positions = new Map<string, number>()
export function usePageNavigation() {
  const location = useLocation()
  const type = useNavigationType()
  useEffect(() => {
    let frame = 0
    let attempts = 0
    const move = () => {
      if (location.hash) {
        const target = document.getElementById(location.hash.slice(1))
        if (target) target.scrollIntoView({behavior:'auto'})
        else if (attempts++ < 90) frame = requestAnimationFrame(move)
      } else window.scrollTo({top:type === 'POP' ? positions.get(location.key) || 0 : 0,behavior:'instant'})
    }
    frame = requestAnimationFrame(move)
    return () => { positions.set(location.key, window.scrollY); cancelAnimationFrame(frame) }
  }, [location.key, location.hash, type])
}
