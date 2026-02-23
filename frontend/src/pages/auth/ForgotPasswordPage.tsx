import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services'
import { useThemeStore } from '@/stores/themeStore'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      navigate('/verify-otp', { state: { email, type: 'forgot-password' } })
      toast.info('Mã OTP đã được gửi vào email')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi mã OTP')
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
        <div className="text-center mb-8">
          <span className="text-5xl">🔑</span>
          <h1 className="mt-3 text-2xl font-bold">Quên mật khẩu</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Nhập email để nhận mã xác thực đặt lại mật khẩu
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Gửi mã xác thực
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
