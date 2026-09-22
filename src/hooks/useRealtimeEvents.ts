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

export function useRealtimeEvents(): void {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!token || !user) return

    let cancelled = false

    void getEcho().then((echo) => {
      if (!echo || cancelled) return

      // Use a single channel reference to avoid duplicate Pusher subscriptions
      const ch = echo.private(`App.Models.User.${user.id}`)

      // Invalidate the orders list whenever an order status changes
      ch.listen('.order.status.updated', () => {
        void queryClient.invalidateQueries({ queryKey: ['orders'] })
      })

      // Invalidate cart when a reservation changes server-side
      ch.listen('.cart.reservation.updated', () => {
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
      })
    })

    return () => {
      cancelled = true
      // Channel cleanup is handled globally in disconnectEcho (called on logout)
    }
  }, [token, user])
}
