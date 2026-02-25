import { Button } from '@/components/ui/Button'
import api from '@/services/api'
import { motion } from 'framer-motion'
import { CheckCircle2, Home, Loader2, Ticket, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

type PaymentStatus = 'loading' | 'success' | 'failed'

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Forward all VNPay query params to backend for verification
        const queryString = searchParams.toString()
        const res = await api.get(`/orders/vnpay-return?${queryString}`)
        
        if (res.data?.success) {
          setStatus('success')
          setMessage(res.data?.message || 'Thanh toán thành công!')
        } else {
          setStatus('failed')
          setMessage(res.data?.message || 'Thanh toán thất bại')
        }
      } catch (err: any) {
        setStatus('failed')
        setMessage(err.response?.data?.message || 'Xác thực thanh toán thất bại')
      }
    }

    verifyPayment()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Đang xác thực thanh toán...</h2>
              <p className="text-muted-foreground text-sm">Vui lòng đợi trong giây lát</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Thanh toán thành công!</h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  🎉 Vé của bạn đã được tạo thành công. Kiểm tra email để nhận thông tin vé chi tiết.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Trang chủ
                </Button>
                <Button
                  onClick={() => navigate('/my-tickets')}
                  className="flex-[2]"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  Xem vé của tôi
                </Button>
              </div>
            </motion.div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Thanh toán thất bại</h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
                <p className="text-sm text-red-700 dark:text-red-400">
                  Giao dịch không thành công. Số tiền sẽ không bị trừ. Vui lòng thử lại hoặc liên hệ hỗ trợ.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Trang chủ
                </Button>
                <Button
                  onClick={() => navigate('/events')}
                  className="flex-[2]"
                >
                  Quay lại mua vé
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
