/// <reference types="vite/client" />
import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, Users, Ticket, Image,
  ShoppingCart, DoorOpen, QrCode, BarChart3,
  Menu, X, Sun, Moon, ChevronLeft,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { Button } from '@/components/ui/Button'
import { cn, getImageUrl } from '@/lib/utils'

const sidebarLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/events', icon: Calendar, label: 'Sự kiện' },
  { to: '/admin/users', icon: Users, label: 'Người dùng' },
  { to: '/admin/tickets', icon: Ticket, label: 'Vé' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Đơn hàng' },
  { to: '/admin/banners', icon: Image, label: 'Banner' },
  { to: '/admin/rooms', icon: DoorOpen, label: 'Phòng' },
  { to: '/admin/scanner', icon: QrCode, label: 'Quét QR' },
  { to: '/admin/reports', icon: BarChart3, label: 'Báo cáo' },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-screen bg-background">
      {/* ==================== Sidebar ==================== */}
      {/* Desktop: always visible | Mobile: overlay */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link to="/admin" className="flex items-center justify-center">
            <img src={`${import.meta.env.BASE_URL}images/banner.png`} alt="EViENT" className="h-10 w-auto object-contain dark:hidden" />
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="EViENT" className="h-10 w-auto object-contain hidden dark:block" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)] scrollbar-thin">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 touch-target',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )
              }
            >
              <link.icon className="size-5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          ))}

          {/* Back to user site */}
          <div className="pt-4 mt-4 border-t border-border">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
            >
              <ChevronLeft className="size-5 shrink-0" />
              <span>Về trang chủ</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* ==================== Mobile Sidebar Backdrop ==================== */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ==================== Main Content ==================== */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/profile">
                  <div className="size-8 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center hover:opacity-80 transition-opacity">
                    {user?.avatar_url ? (
                      <img src={getImageUrl(user.avatar_url, { width: 40 })} alt={user.full_name} className="size-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <span className="font-semibold text-xs uppercase">
                        {user?.full_name?.charAt(0) || 'A'}
                      </span>
                    )}
                  </div>
                </Link>
                <span className="text-sm font-semibold text-foreground">{user?.full_name || 'Admin'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
