import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useCheckoutStore } from '../stores/checkoutStore'
import type { Cart } from '../types/api'

export function syncCart(cart: Cart) {
  queryClient.setQueryData(['cart'], cart)
  useCheckoutStore.getState().reset()
}

export function useProceedToCheckout() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      useCartStore.getState().closeDrawer()
      navigate(useAuthStore.getState().token ? '/checkout' : '/auth?next=/checkout')
    },
  })
}
