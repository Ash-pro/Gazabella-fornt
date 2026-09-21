import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { gazabellaApi } from '../api/gazabella'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useCheckoutStore } from '../stores/checkoutStore'
import type { Cart } from '../types/api'
export function syncCart(cart: Cart) {
  queryClient.setQueryData(['cart'], cart)
  useCheckoutStore.getState().reset()
  const reservations = cart.items.flatMap((item) => item.reservation ? [item.reservation] : [])
  const nearest = reservations.sort((a, b) => Date.parse(a.expires_at) - Date.parse(b.expires_at))[0]
  useCartStore.getState().setReservation(nearest?.expires_at ?? null, nearest ? Math.max(0, Math.ceil((Date.parse(nearest.expires_at) - Date.now()) / 1000)) : null)
}
export function useProceedToCheckout() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: gazabellaApi.reserveCart,
    onSuccess: (response) => {
      syncCart(response.data)
      useCartStore.getState().setReservation(response.expires_at || response.reserved_until || null, response.seconds_remaining)
      useCartStore.getState().closeDrawer()
      navigate(useAuthStore.getState().token ? '/checkout' : '/auth?next=/checkout')
    },
  })
}
