import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DemoRoleBar } from './components/layout/DemoRoleBar'
import { PageLoader } from './components/ui/AsyncState'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { isMockMode } from './api/gazabella'
import { useAuthStore } from './stores/authStore'

import { ProductsPage } from './pages/ProductsPage'
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })))
const CartPage = lazy(() => import('./pages/CartPage').then((module) => ({ default: module.CartPage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })))
const MerchantDashboard = lazy(() => import('./pages/merchant/MerchantDashboard').then((module) => ({ default: module.MerchantDashboard })))
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard').then((module) => ({ default: module.DeliveryDashboard })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()
  if (!token) return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}

function OperationalPreview({ children }: { children: ReactNode }) {
  if (isMockMode()) return children
  return <div className="container-page py-16"><h1 className="section-title">اللوحة قيد الربط</h1><p className="mt-4">تُتاح هذه اللوحة بعد اعتماد تسجيل الدخول والصلاحيات من الباك اند.</p><a href="/" className="btn-primary mt-6">العودة للمتجر</a></div>
}
export default function App() {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col font-sans">
        <DemoRoleBar />
        <div className="flex-1">
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<ProductsPage />} />
              <Route path="products/:slug" element={<Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>} />
              <Route path="cart" element={<Suspense fallback={<PageLoader />}><CartPage /></Suspense>} />
              <Route path="auth" element={<Suspense fallback={<PageLoader />}><AuthPage /></Suspense>} />
              <Route path="checkout" element={<Suspense fallback={<PageLoader />}><ProtectedRoute><CheckoutPage /></ProtectedRoute></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<PageLoader />}><ProtectedRoute><OrdersPage /></ProtectedRoute></Suspense>} />
              <Route path="orders/:orderNumber" element={<Suspense fallback={<PageLoader />}><ProtectedRoute><OrderDetailPage /></ProtectedRoute></Suspense>} />
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
