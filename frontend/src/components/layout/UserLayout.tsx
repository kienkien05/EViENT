import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Calendar, User, Ticket, Wallet,
  Menu, X, Sun, Moon, LogOut, LogIn,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { Button } from '@/components/ui/Button'
import NotificationBell from '@/components/NotificationBell'
import { SearchBar } from '@/components/ui/SearchBar'
import { cn, getImageUrl } from '@/lib/utils'

const navLinks = [
  { to: '/', icon: Home, label: 'Trang chủ', end: true },
  { to: '/events', icon: Calendar, label: 'Sự kiện' },
  { to: '/my-tickets', icon: Ticket, label: 'Vé của tôi', auth: true },
  { to: '/wallet', icon: Wallet, label: 'Ví', auth: true },
  { to: '/profile', icon: User, label: 'Tài khoản', auth: true },
]

export default function UserLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const visibleLinks = navLinks.filter(
    (link) => !link.auth || isAuthenticated
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ==================== Desktop Header ==================== */}
      <header className="hidden sm:block sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center">
            <img src="/images/banner.png" alt="EViENT" className="h-10 w-auto object-contain dark:hidden" />
            <img src="/images/logo.png" alt="EViENT" className="h-10 w-auto object-contain hidden dark:block" />
          </Link>

          {/* Desktop Nav */}
          <nav className="flex items-center gap-1">
            {visibleLinks.slice(0, 3).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <SearchBar />
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <NotificationBell />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="rounded-full overflow-hidden border border-border bg-muted/50 hover:bg-muted">
                    {user?.avatar_url ? (
                      <img src={getImageUrl(user.avatar_url, { width: 40 })} alt={user.full_name} className="size-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <span className="font-semibold text-sm uppercase">
                        {user?.full_name?.charAt(0) || <User className="size-4" />}
                      </span>
                    )}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { logout(); navigate('/') }}
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button size="sm" className="gap-2">
                  <LogIn className="size-4" />
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ==================== Main Content ==================== */}
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>

      {/* ==================== Mobile Bottom Navigation ==================== */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16">
          {visibleLinks.slice(0, 5).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors touch-target',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )
              }
            >
              <link.icon className="size-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </NavLink>
          ))}

          {/* Login button (if not authenticated) */}
          {!isAuthenticated && (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors touch-target',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <LogIn className="size-5" />
              <span className="text-[10px] font-medium">Đăng nhập</span>
            </NavLink>
          )}
        </div>
      </nav>

      {/* ==================== Footer (desktop only) ==================== */}
      <footer className="hidden sm:block bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/images/banner.png" alt="EViENT" className="h-8 w-auto object-contain dark:hidden" />
              <img src="/images/logo.png" alt="EViENT" className="h-8 w-auto object-contain hidden dark:block" />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 EViENT. Hệ thống quản lý sự kiện.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
