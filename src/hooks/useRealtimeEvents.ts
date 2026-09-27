/**
 * useRealtimeEvents
 *
 * Subscribes to Laravel Echo / Pusher channels when the user is authenticated.
 * Gracefully no-ops when the Echo back-end is not configured
 * (VITE_PUSHER_APP_KEY / VITE_PUSHER_HOST not set).
 */

import { useEffect } from 'react'
import { getEcho } from '../lib/echo'
import { useAuthStore } from '../stores/authStore'
import { queryClient } from '../lib/queryClient'
import { REALTIME_EVENTS, orderEventQueryKeys, userChannel, type OrderStatusEvent } from '../lib/realtime'

export function useRealtimeEvents(): void {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!token || !user) return

    let cancelled = false

    void getEcho().then((echo) => {
      if (!echo || cancelled) return

      // Use a single channel reference to avoid duplicate Pusher subscriptions
      const ch = echo.private(userChannel(user.id))

      // G-03 — تحديث القائمة وصفحة تفاصيل الطلب معاً (C-P1-03)
      ch.listen(REALTIME_EVENTS.orderStatus, (payload: unknown) => {
        for (const queryKey of orderEventQueryKeys(payload as OrderStatusEvent)) {
          void queryClient.invalidateQueries({ queryKey })
        }
      })

      // Invalidate cart when a reservation changes server-side
      ch.listen(REALTIME_EVENTS.cartReservation, () => {
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
      })
    })

    return () => {
      cancelled = true
      // Channel cleanup is handled globally in disconnectEcho (called on logout)
    }
  }, [token, user])
}
