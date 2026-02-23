import { motion } from 'framer-motion'
import { Wallet, Info } from 'lucide-react'

export default function WalletPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Ví của tôi</h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-orange-600 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <Wallet className="size-4" />
          Số dư ví
        </div>
        <div className="mt-2 text-3xl font-bold">
          0 <span className="text-lg font-normal">VNĐ</span>
        </div>
      </motion.div>

      <div className="mt-6 bg-card border border-border rounded-2xl p-6 text-center">
        <Info className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Tính năng ví đang được phát triển</p>
        <p className="text-sm text-muted-foreground mt-1">
          Bạn sẽ sớm có thể nạp tiền và thanh toán qua ví EViENT
        </p>
      </div>
    </div>
  )
}
