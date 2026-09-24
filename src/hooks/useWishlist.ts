import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { gazabellaApi } from '../api/gazabella'
import { useAuthStore } from '../stores/authStore'
import { queryClient } from '../lib/queryClient'

export function useWishlist() {
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['wishlist'], queryFn: gazabellaApi.getWishlist, enabled: !!token })
  const toggle = useMutation({
    mutationKey: ['wishlist-toggle'],
    scope: { id: 'wishlist' },
    mutationFn: gazabellaApi.toggleWishlist,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['product'] })
    },
  })
  return { query, toggle, authenticated: !!token, toggleProduct: (slug: string) => {
    if (!token) { navigate('/auth?next=' + encodeURIComponent('/?saved=true')); return }
    toggle.mutate(slug)
  } }
}
