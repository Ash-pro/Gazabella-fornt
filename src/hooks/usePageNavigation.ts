import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const positions = new Map<string, number>()
export function usePageNavigation() {
  const location = useLocation()
  const type = useNavigationType()
  const preserveScroll = Boolean(location.state?.preserveScroll)
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
    }
    frame = requestAnimationFrame(move)
    return () => {
      positions.set(location.key, window.scrollY)
      if (positions.size > 100) positions.delete(positions.keys().next().value!)
      cancelAnimationFrame(frame)
    }
  }, [location.key, location.hash, type, preserveScroll])
}
