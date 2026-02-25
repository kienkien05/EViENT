import { authService } from '@/services'
import { useAuthStore } from '@/stores/authStore'
import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

// Layouts
import AdminLayout from '@/components/layout/AdminLayout'
import UserLayout from '@/components/layout/UserLayout'

// Lazy load all pages for code splitting
const HomePage = lazy(() => import('@/pages/user/HomePage'))
const EventsPage = lazy(() => import('@/pages/user/EventsPage'))
const EventDetailPage = lazy(() => import('@/pages/user/EventDetailPage'))
const ProfilePage = lazy(() => import('@/pages/user/ProfilePage'))
const WalletPage = lazy(() => import('@/pages/user/WalletPage'))
const MyTicketsPage = lazy(() => import('@/pages/user/MyTicketsPage'))
const ContactPage = lazy(() => import('@/pages/user/ContactPage'))
const SearchPage = lazy(() => import('@/pages/user/SearchPage'))
const PaymentReturnPage = lazy(() => import('@/pages/user/PaymentReturnPage'))

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const OTPVerifyPage = lazy(() => import('@/pages/auth/OTPVerifyPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// Admin pages
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminEventsPage = lazy(() => import('@/pages/admin/EventsPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const AdminTicketsPage = lazy(() => import('@/pages/admin/TicketsPage'))
const AdminBannersPage = lazy(() => import('@/pages/admin/BannersPage'))
const AdminOrdersPage = lazy(() => import('@/pages/admin/OrdersPage'))
const AdminRoomsPage = lazy(() => import('@/pages/admin/RoomsPage'))
const QRScannerPage = lazy(() => import('@/pages/admin/QRScannerPage'))
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'))

// Error pages
const ForbiddenPage = lazy(() => import('@/pages/error/ForbiddenPage'))

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Đang tải...</p>
      </div>
    </div>
  )
}

// Protected Route
function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode
  requireAdmin?: boolean
}) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/forbidden" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { isAuthenticated } = useAuthStore()

  // Poll profile every 15 seconds to ensure user is still active
  // If an admin locks the account, getProfile will throw 401/403 and trigger automatic logout via interceptor.
  useEffect(() => {
    if (!isAuthenticated) return

    const checkActive = async () => {
      try {
        await authService.getProfile()
      } catch (error) {
        // Ignored, intercepted by axios
      }
    }

    const interval = setInterval(checkActive, 15000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-otp" element={<OTPVerifyPage />} />

        {/* User Routes */}
        <Route element={<UserLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/payment/vnpay-return" element={<PaymentReturnPage />} />
          <Route
            path="/profile"
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
          />
          <Route
            path="/wallet"
            element={<ProtectedRoute><WalletPage /></ProtectedRoute>}
          />
          <Route
            path="/my-tickets"
            element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>}
          />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="events" element={<AdminEventsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="tickets" element={<AdminTicketsPage />} />
          <Route path="banners" element={<AdminBannersPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="rooms" element={<AdminRoomsPage />} />
          <Route path="scanner" element={<QRScannerPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        {/* Error pages */}
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
