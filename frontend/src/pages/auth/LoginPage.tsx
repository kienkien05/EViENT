/// <reference types="vite/client" />
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sun, Moon, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { authService } from '@/services'
import { cn } from '@/lib/utils'

import bannerImg from '@/assets/images/banner.png'
import logoImg from '@/assets/images/logo.png'

export default function LoginPage() {
  const [step, setStep] = useState<'credentials' | 'register'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authService.login({ email, password })
      if (data.data?.token) {
        // Direct login (SKIP_OTP mode) — token returned immediately
        useAuthStore.getState().login({
          token: data.data.token,
          user: data.data.user,
        })
        toast.success('Đăng nhập thành công!')
        navigate(data.data.user.role === 'admin' ? '/admin' : '/')
      } else {
        // OTP flow — navigate to OTP verification page
        navigate('/verify-otp', {
          state: { email, type: 'login' },
        })
        toast.info('Vui lòng nhập mã OTP đã gửi vào email')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.register({ email, password, full_name: fullName })
      navigate('/verify-otp', {
        state: { email, password, full_name: fullName, type: 'register' },
      })
      toast.info('Vui lòng nhập mã OTP đã gửi vào email')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 bg-gradient-to-br from-primary/5 via-background to-orange-500/5">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full hover:bg-muted/50">
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}images/banner.png`} alt="EViENT" className="h-20 w-auto object-contain mx-auto dark:hidden" />
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="EViENT" className="h-20 w-auto object-contain mx-auto hidden dark:block" />
          <p className="mt-2 text-muted-foreground">
            {step === 'credentials' ? 'Đăng nhập vào tài khoản' : 'Tạo tài khoản mới'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <form onSubmit={step === 'credentials' ? handleLogin : handleRegister}>
            <div className="space-y-4">
              {step === 'register' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Họ và tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-11 pl-10 pr-12 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {step === 'credentials' && (
                <div className="text-right">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {step === 'credentials' ? 'Đăng nhập' : 'Đăng ký'}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {step === 'credentials' ? (
              <>
                Chưa có tài khoản?{' '}
                <button
                  onClick={() => setStep('register')}
                  className="text-primary hover:underline font-medium"
                >
                  Đăng ký
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{' '}
                <button
                  onClick={() => setStep('credentials')}
                  className="text-primary hover:underline font-medium"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
