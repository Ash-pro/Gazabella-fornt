import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface CheckoutState {
  confirmedOrderNumber: string | null
  setConfirmedOrderNumber: (n: string) => void
  reset: () => void
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      confirmedOrderNumber: null,
      setConfirmedOrderNumber: (confirmedOrderNumber) => set({ confirmedOrderNumber }),
      reset: () => set({ confirmedOrderNumber: null }),
    }),
    { name: 'gazabella_checkout', storage: createJSONStorage(() => sessionStorage) },
  ),
)
