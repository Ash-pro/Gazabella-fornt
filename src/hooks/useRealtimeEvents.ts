import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { queryClient } from '../lib/queryClient'
import { getEcho, disconnectEcho } from '../lib/echo'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { isMockMode } from '../api/gazabella'

export function useRealtimeEvents() {
  const user = useAuthStore((state) => state.user)
  const clearReservation = useCartStore((state) => state.clearReservation)
  const navigate = useNavigate()

  useEffect(() => {
    // في وضع الداتا الوهمية (Mock Mode) أو في حال عدم وجود مستخدم: لا نشغل Reverb
    if (!user || isMockMode()) return

    try {
      const echo = getEcho()
      if (!echo) return

      const cartChannel = `cart.${user.id}`
      const orderChannel = `orders.${user.id}`

      echo.channel(cartChannel).listen('ReservationExpired', () => {
        clearReservation()
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
        navigate('/cart', { replace: true })
      })

      echo
        .private(orderChannel)
        .listen('OrderStatusChanged', (event: { order_number: string }) => {
          void queryClient.invalidateQueries({ queryKey: ['orders'] })
          void queryClient.invalidateQueries({ queryKey: ['order', event.order_number] })
        })
        .listen('PaymentConfirmed', (event: { order_number: string }) => {
          void queryClient.invalidateQueries({ queryKey: ['orders'] })
          void queryClient.invalidateQueries({ queryKey: ['order', event.order_number] })
          navigate(`/orders/${event.order_number}`, { replace: true })
        })
        .listen('PaymentFailed', (event: { order_number: string }) => {
          navigate(`/orders/${event.order_number}?payment=failed`, { replace: true })
        })

      return () => {
        try {
          echo.leave(cartChannel)
          echo.leave(orderChannel)
          disconnectEcho()
        } catch {
          // ignore cleanup errors
        }
      }
    } catch (err) {
      console.warn('Realtime events not available:', err)
    }
  }, [clearReservation, navigate, user])
}

