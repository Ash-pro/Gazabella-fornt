import { create } from 'zustand'

export interface CartToastInfo {
  productName: string
  variantName?: string
  thumbnailUrl?: string | null
  price?: string | number
}

interface CartUiState {
  reservedUntil: string | null
  secondsRemaining: number | null
  isDrawerOpen: boolean
  cartToast: CartToastInfo | null
  toastKey: number
  setReservation: (reservedUntil: string | null, secondsRemaining: number | null) => void
  tick: () => void
  clearReservation: () => void
  openDrawer: () => void
  closeDrawer: () => void
  showCartToast: (info: CartToastInfo) => void
  hideCartToast: () => void
}

export const useCartStore = create<CartUiState>((set) => ({
  reservedUntil: null,
  secondsRemaining: null,
  isDrawerOpen: false,
  cartToast: null,
  toastKey: 0,
  setReservation: (reservedUntil, secondsRemaining) =>
    set({ reservedUntil, secondsRemaining }),
  tick: () =>
    set((state) => ({
      secondsRemaining:
        state.secondsRemaining === null ? null : Math.max(0, state.secondsRemaining - 1),
    })),
  clearReservation: () => set({ reservedUntil: null, secondsRemaining: null }),
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  showCartToast: (info) =>
    set((state) => ({
      cartToast: info,
      toastKey: state.toastKey + 1,
    })),
  hideCartToast: () => set({ cartToast: null }),
}))

