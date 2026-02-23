import { motion } from 'framer-motion'
import { ShieldAlert, Home, ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export default function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
            <ShieldAlert className="size-24 text-destructive relative z-10" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">403</h1>
          <h2 className="text-2xl font-semibold text-foreground">Truy cập bị từ chối</h2>
          <p className="text-muted-foreground mt-2">
            Rất tiếc, bạn không có quyền truy cập vào trang này. 
            Khu vực này chỉ dành riêng cho Quản trị viên (Admin).
          </p>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto gap-2"
          >
            <ChevronLeft className="size-4" />
            Quay lại
          </Button>
          
          <Link to="/" className="w-full sm:w-auto">
            <Button className="w-full gap-2">
              <Home className="size-4" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
