import { useEffect } from 'react'
import { gazabellaApi } from '../api/gazabella'
import { useCartStore } from '../stores/cartStore'
import { queryClient } from '../lib/queryClient'
export function useReservationTimer() {
  const seconds = useCartStore((s) => s.secondsRemaining)
  const expires = useCartStore((s) => s.reservedUntil)
  useEffect(() => {
    let active = true
    let expiredChecked = false
    async function sync() {
      try {
        const data = await gazabellaApi.heartbeat()
        if (active) useCartStore.getState().setReservation(data.expires_at, data.seconds_remaining)
      } catch { /* The next visibility or periodic check retries without extending the reservation. */ }
    }
    const tick = () => {
      if (!expires) return
      const remaining = Math.max(0, Math.ceil((Date.parse(expires) - Date.now()) / 1000))
      useCartStore.getState().setReservation(expires, remaining)
      if (remaining === 0 && !expiredChecked) { expiredChecked = true; void sync(); void queryClient.invalidateQueries({ queryKey: ['cart'] }) }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    const heartbeat = window.setInterval(sync, 5 * 60_000)
    const visible = () => { if (document.visibilityState === 'visible') { tick(); void sync() } }
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('online', sync)
    return () => { active = false; clearInterval(timer); clearInterval(heartbeat); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', sync) }
  }, [expires])
  useEffect(() => { let active = true; gazabellaApi.heartbeat().then((data) => { if (active) useCartStore.getState().setReservation(data.expires_at, data.seconds_remaining) }).catch(() => {}); return () => { active = false } }, [])
  return seconds
}
