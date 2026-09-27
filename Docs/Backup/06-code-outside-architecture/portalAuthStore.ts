import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ─── Merchant Portal Auth ────────────────────────────────────────────────────

interface MerchantPortalUser {
  id: number
  name: string
  store_name: string
  store_id: number
  email: string
}

interface MerchantPortalState {
  token: string | null
  user: MerchantPortalUser | null
  setSession: (token: string, user: MerchantPortalUser) => void
  clearSession: () => void
}

export const useMerchantPortalStore = create<MerchantPortalState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    {
      name: 'gazabella_merchant_portal',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// ─── Delivery Portal Auth ────────────────────────────────────────────────────

interface DeliveryPortalUser {
  id: number
  name: string
  phone: string
  area: string
}

interface DeliveryPortalState {
  token: string | null
  user: DeliveryPortalUser | null
  setSession: (token: string, user: DeliveryPortalUser) => void
  clearSession: () => void
}

export const useDeliveryPortalStore = create<DeliveryPortalState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    {
      name: 'gazabella_delivery_portal',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
