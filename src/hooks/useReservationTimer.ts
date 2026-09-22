import { useEffect } from 'react'
import { useCartStore } from '../stores/cartStore'
import { queryClient } from '../lib/queryClient'

/**
 * Local countdown timer for cart reservation.
 * No server heartbeat needed — the cart is refreshed via React Query.
 */
export function useReservationTimer() {
  const seconds = useCartStore((s) => s.secondsRemaining)
  const expires = useCartStore((s) => s.reservedUntil)

  useEffect(() => {
    let expiredChecked = false

    const tick = () => {
      if (!expires) return
      const parsed = Date.parse(expires)
      if (isNaN(parsed)) return
      const remaining = Math.max(0, Math.ceil((parsed - Date.now()) / 1000))
      useCartStore.getState().setReservation(expires, remaining)
      if (remaining === 0 && !expiredChecked) {
        expiredChecked = true
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    const visible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', visible)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [expires])

  return seconds
}
