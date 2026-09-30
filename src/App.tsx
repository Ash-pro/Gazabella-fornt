import { OrderLookupPage } from './pages/OrderLookupPage'
import { ProfilePage } from './pages/ProfilePage'
import { CheckoutReceiptPage } from './pages/CheckoutReceiptPage'
import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DemoRoleBar } from './components/layout/DemoRoleBar'
import { AnalyticsTracker } from './components/layout/AnalyticsTracker'
import { PageLoader } from './components/ui/AsyncState'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { useQuery } from '@tanstack/react-query'
import { ErrorState } from './components/ui/AsyncState'
import { getApiErrorMessage } from './lib/apiClient'
import { gazabellaApi, isMockMode } from './api/gazabella'
import { useAuthStore } from './stores/authStore'
import { isMvp0Api } from './lib/apiContract'

import { ProductsPage } from './pages/ProductsPage'
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })))
const CartPage = lazy(() => import('./pages/CartPage').then((module) => ({ default: module.CartPage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })))
const MerchantDashboard = lazy(() => import('./pages/merchant/MerchantDashboard').then((module) => ({ default: module.MerchantDashboard })))
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard').then((module) => ({ default: module.DeliveryDashboard })))
const DeliveryPolicyPage = lazy(() => import('./pages/info/PolicyPages').then((m) => ({ default: m.DeliveryPolicyPage })))
const ReturnsPolicyPage = lazy(() => import('./pages/info/PolicyPages').then((m) => ({ default: m.ReturnsPolicyPage })))
const PrivacyPage = lazy(() => import('./pages/info/PolicyPages').then((m) => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('./pages/info/PolicyPages').then((m) => ({ default: m.TermsPage })))
const FaqPage = lazy(() => import('./pages/info/SupportPages').then((m) => ({ default: m.FaqPage })))
const ContactPage = lazy(() => import('./pages/info/SupportPages').then((m) => ({ default: m.ContactPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()
  const session = useQuery({ queryKey: ['session'], queryFn: gazabellaApi.getMe, enabled: !!token, retry: false })
  if (!token) return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (session.isPending) return <PageLoader label="نتحقق من الجلسة…" />
  if (session.isError) return <ErrorState message={getApiErrorMessage(session.error)} onRetry={() => void session.refetch()} />
  return children
}

function OperationalPreview({ children }: { children: ReactNode }) {
  // اللوحات التشغيلية تعيش في Filament — في الإنتاج لا نكشف وجود هذه المسارات
  if (isMockMode()) return children
  return <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>
}
export default function App() {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col font-sans">
        <DemoRoleBar />
        <AnalyticsTracker />
        <div className="flex-1">
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<ProductsPage />} />
              <Route path="products/:slug" element={<Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>} />
              <Route path="cart" element={<Suspense fallback={<PageLoader />}><CartPage /></Suspense>} />
              <Route path="auth" element={<Suspense fallback={<PageLoader />}><AuthPage /></Suspense>} />
              <Route path="checkout" element={<Suspense fallback={<PageLoader />}>{isMvp0Api() ? <ProtectedRoute><CheckoutPage /></ProtectedRoute> : <CheckoutPage />}</Suspense>} />
              <Route path="checkout/receipt" element={<CheckoutReceiptPage />} />
              <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="orders/lookup" element={<OrderLookupPage />} />
              <Route path="orders" element={<Suspense fallback={<PageLoader />}><ProtectedRoute><OrdersPage /></ProtectedRoute></Suspense>} />
              <Route path="orders/:orderId" element={<Suspense fallback={<PageLoader />}><ProtectedRoute><OrderDetailPage /></ProtectedRoute></Suspense>} />
              <Route path="delivery-info" element={<DeliveryPolicyPage />} />
              <Route path="returns" element={<ReturnsPolicyPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="contact" element={<ContactPage />} />
            </Route>

            {/* لوحة تحكم التاجر */}
            <Route path="merchant" element={<OperationalPreview><Suspense fallback={<PageLoader />}><MerchantDashboard /></Suspense></OperationalPreview>} />

            {/* لوحة طلبات التوصيل */}
            <Route path="delivery" element={<OperationalPreview><Suspense fallback={<PageLoader />}><DeliveryDashboard /></Suspense></OperationalPreview>} />

            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  )
}
