import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services'
import { useThemeStore } from '@/stores/themeStore'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()
  const state = location.state as { email?: string; otp?: string; type?: string } || {}
  const { email = '', otp = '', type = 'forgot-password' } = state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword({ email, otp, new_password: newPassword })
      
      if (type === 'change-password') {
        toast.success('Đổi mật khẩu thành công!')
        navigate('/profile')
      } else {
        toast.success('Đặt lại mật khẩu thành công!')
        navigate('/login')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đặt lại mật khẩu thất bại')
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
          <span className="text-5xl">🔒</span>
          <h1 className="mt-3 text-2xl font-bold">Đặt lại mật khẩu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nhập mật khẩu mới cho tài khoản <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Mật khẩu mới</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Đặt lại mật khẩu
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
