import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { queryClient } from '../lib/queryClient'
import { useCartStore } from '../stores/cartStore'
import { useCheckoutStore } from '../stores/checkoutStore'
import type { Cart } from '../types/api'
import { lineItems, track } from '../lib/analytics'

export function syncCart(cart: Cart) {
  queryClient.setQueryData(['cart'], cart)
  useCheckoutStore.getState().reset()
}

/** يُستدعى في onMutate قبل الحذف — نقرأ السطر من الكاش قبل أن يختفي */
export function trackCartRemoval(itemId: number) {
  const line = queryClient.getQueryData<Cart>(['cart'])?.items.find((i) => i.id === itemId)
  if (line) track('remove_from_cart', lineItems([line]))
}

export function trackCartView(cart: Cart | undefined) {
  if (cart?.items.length) track('view_cart', lineItems(cart.items))
}

export function useProceedToCheckout() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      useCartStore.getState().closeDrawer()
      navigate('/checkout')
    },
  })
}
