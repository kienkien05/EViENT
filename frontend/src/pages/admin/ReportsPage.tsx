import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Báo cáo & Thống kê</h1>
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <BarChart3 className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Trang báo cáo thống kê</p>
        <p className="text-sm text-muted-foreground mt-1">Biểu đồ và báo cáo sẽ hiển thị khi có đủ dữ liệu</p>
      </div>
    </div>
  )
}
