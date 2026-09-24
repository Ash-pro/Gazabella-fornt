import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { User } from '../types/api'

interface AuthState {
  token: string | null
  user: User | null
  setSession: (token: string, user: User) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    {
      name: `gazabella_auth:${import.meta.env.VITE_DATA_SOURCE === 'mock' ? 'mock' : import.meta.env.VITE_API_BASE_URL || '/api/v1'}`,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
