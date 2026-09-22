import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { usePageNavigation } from '../../hooks/usePageNavigation'
import { useAuthStore } from '../../stores/authStore'
import { useCheckoutStore } from '../../stores/checkoutStore'
import { useCartStore } from '../../stores/cartStore'
import { queryClient } from '../../lib/queryClient'
import { disconnectEcho } from '../../lib/echo'
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents'
import { Footer } from './Footer'
import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'
import { CartDrawer } from '../cart/CartDrawer'
import { CartToast } from '../cart/CartToast'
import { PwaInstallPrompt } from '../pwa/PwaInstallPrompt'
import { ReservationBanner } from '../ui/ReservationBanner'
import { PageLoader } from '../ui/AsyncState'

export function AppShell() {
  usePageNavigation()
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (previous.token && !state.token) {
          queryClient.clear()
          useCheckoutStore.getState().reset()
          useCartStore.getState().clearReservation()
          disconnectEcho()
        }
      }),
    [],
  )
  useRealtimeEvents()

  return (
    <div className="min-h-screen flex flex-col pb-16 lg:pb-0">
      <a href="#main-content" className="skip-link">انتقل إلى المحتوى</a>
      <Header />
      <ReservationBanner />
      <CartDrawer />
      <CartToast />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<div className="container-page"><PageLoader /></div>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileBottomNav />
      <PwaInstallPrompt />
    </div>
  )
}
