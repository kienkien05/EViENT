import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { authService } from '@/services'

export default function OTPVerifyPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()
  const state = location.state as {
    email: string
    type: 'login' | 'register' | 'forgot-password' | 'change-password'
    password?: string
    full_name?: string
  } | null

  useEffect(() => {
    if (!state?.email) {
      navigate('/login', { replace: true })
    } else {
      inputRefs.current[0]?.focus()
      if ((import.meta as any).env.VITE_USE_SEED_OTP === 'true' && (import.meta as any).env.VITE_SEED_OTP) {
        const seedOtp = (import.meta as any).env.VITE_SEED_OTP.toString().slice(0, 6)
        if (seedOtp.length === 6) {
          setOtp(seedOtp.split(''))
        }
      }
    }
  }, [state, navigate])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when complete
    if (newOtp.every((d) => d !== '') && value) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]
    text.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char
    })
    setOtp(newOtp)
    if (text.length === 6) handleVerify(text)
  }

  const handleResend = async () => {
    if (!state || resending) return
    setResending(true)
    try {
      if (state.type === 'register') {
        await authService.register({ email: state.email, password: state.password!, full_name: state.full_name! })
      } else {
        await authService.forgotPassword(state.email)
      }
      toast.success('Đã gửi lại mã OTP. Vui lòng kiểm tra email.')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi lại mã OTP')
    } finally {
      setResending(false)
    }
  }

  const handleVerify = async (otpCode: string) => {
    if (!state) return
    setLoading(true)
    try {
      if (state.type === 'forgot-password' || state.type === 'change-password') {
        navigate('/reset-password', { state: { email: state.email, otp: otpCode, type: state.type } })
        return
      }

      if (state.type === 'register') {
        const { data } = await authService.verifyRegister({
          email: state.email,
          otp: otpCode,
          password: state.password!,
          full_name: state.full_name!,
        })
        useAuthStore.getState().login({ token: data.data.token, user: data.data.user })
        toast.success('Đăng ký thành công!')
        navigate('/')
      } else {
        const { data } = await authService.verifyLogin({
          email: state.email,
          otp: otpCode,
        })
        useAuthStore.getState().login({ token: data.data.token, user: data.data.user })
        toast.success('Đăng nhập thành công!')
        navigate(data.data.user.role === 'admin' ? '/admin' : '/')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mã OTP không đúng')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
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
          <span className="text-5xl">🔐</span>
          <h1 className="mt-3 text-2xl font-bold">Xác thực OTP</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Nhập mã 6 số đã gửi đến <span className="font-medium text-foreground">{state?.email}</span>
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            ))}
          </div>

          <Button
            onClick={() => handleVerify(otp.join(''))}
            loading={loading}
            disabled={otp.some((d) => d === '')}
            className="w-full mt-6"
            size="lg"
          >
            Xác nhận
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Không nhận được mã?{' '}
            <button 
              onClick={handleResend}
              disabled={resending}
              className="text-primary hover:underline font-medium disabled:opacity-50"
            >
              {resending ? 'Đang gửi...' : 'Gửi lại'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
