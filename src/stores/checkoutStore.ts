import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CheckoutSession, Address } from '../types/api'
interface CheckoutState {
  beginAttempted: boolean
  session: CheckoutSession | null
  pendingOrder: { id: number; order_number: string } | null
  draft: Partial<Address> & { delivery_option_id?: number; notes?: string }
  markBeginAttempted: () => void
  setSession: (session: CheckoutSession) => void
  setPendingOrder: (order: { id: number; order_number: string }) => void
  setDraft: (draft: CheckoutState['draft']) => void
  reset: () => void
}
export const useCheckoutStore = create<CheckoutState>()(persist((set) => ({
  beginAttempted: false, session: null, pendingOrder: null, draft: {},
  markBeginAttempted: () => set({ beginAttempted: true }),
  setSession: (session) => set({ session }),
  setPendingOrder: (pendingOrder) => set({ pendingOrder }),
  setDraft: (draft) => set({ draft }),
  reset: () => set({ beginAttempted: false, session: null, pendingOrder: null, draft: {} }),
}), { name: 'gazabella_checkout', storage: createJSONStorage(() => sessionStorage) }))
