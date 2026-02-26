import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Clock, Ticket, UserPlus, FileEdit, ListTree, DollarSign, Calendar } from 'lucide-react'
import { notificationService, orderService } from '@/services'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'activities' | 'revenue'>('activities')
  const [activityDates, setActivityDates] = useState({ start: '', end: '' })
  const [revenueDates, setRevenueDates] = useState({ start: '', end: '', search: '' })

  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['admin', 'reports-activities', activityDates],
    queryFn: () => notificationService.getActivities({ 
      startDate: activityDates.start || undefined, 
      endDate: activityDates.end || undefined 
    }).then((r: any) => r.data),
    enabled: activeTab === 'activities',
  })

  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ['admin', 'reports-revenue', revenueDates],
    queryFn: () => orderService.getRevenueReport({ 
      startDate: revenueDates.start || undefined, 
      endDate: revenueDates.end || undefined,
      eventName: revenueDates.search || undefined 
    }).then((r: any) => r.data),
    enabled: activeTab === 'revenue',
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'ticket': return <Ticket className="size-4" />
      case 'user': return <UserPlus className="size-4" />
      case 'event': return <FileEdit className="size-4" />
      default: return <Clock className="size-4" />
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'ticket': return 'text-orange-500 bg-orange-500/10'
      case 'user': return 'text-green-500 bg-green-500/10'
      case 'event': return 'text-blue-500 bg-blue-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Báo cáo & Thống kê</h1>
      
      <div className="flex space-x-1 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('activities')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'activities' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
          }`}
        >
          <ListTree className="size-4" />
          Báo cáo hoạt động
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'revenue' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
          }`}
        >
          <DollarSign className="size-4" />
          Báo cáo doanh thu
        </button>
      </div>

      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Từ thời gian</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="size-4 text-muted-foreground" />
                  </div>
                  <input 
                    type="datetime-local" 
                    value={activityDates.start}
                    onChange={(e) => setActivityDates({ ...activityDates, start: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Đến thời gian</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="size-4 text-muted-foreground" />
                  </div>
                  <input 
                    type="datetime-local" 
                    value={activityDates.end}
                    onChange={(e) => setActivityDates({ ...activityDates, end: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <button 
                onClick={() => setActivityDates({ start: '', end: '' })}
                className="h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium whitespace-nowrap"
              >
                Xóa bộ lọc
              </button>
            </div>

            <div className="space-y-4">
              {isLoadingActivities ? (
                <p className="text-sm text-muted-foreground text-center py-8">Đang tải dữ liệu...</p>
              ) : activitiesData?.data?.length > 0 ? (
                <div className="space-y-4">
                  {activitiesData.data.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
                      <div className={`p-2 rounded-full mt-1 ${getColor(activity.type)}`}>
                        {getIcon(activity.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="size-3" />
                          {new Date(activity.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-8 pt-4 border-t border-border flex justify-center">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border">
                      * Dữ liệu hoạt động được theo dõi và lưu trữ tối đa trong 365 ngày gần nhất
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ListTree className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground">Không tìm thấy hoạt động nào trong khoảng thời gian này</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Từ thời gian</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="size-4 text-muted-foreground" />
                  </div>
                  <input 
                    type="datetime-local" 
                    value={revenueDates.start}
                    onChange={(e) => setRevenueDates({ ...revenueDates, start: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Đến thời gian</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="size-4 text-muted-foreground" />
                  </div>
                  <input 
                    type="datetime-local" 
                    value={revenueDates.end}
                    onChange={(e) => setRevenueDates({ ...revenueDates, end: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Tên sự kiện</label>
                <input 
                  type="text" 
                  placeholder="Tìm theo tên..."
                  value={revenueDates.search}
                  onChange={(e) => setRevenueDates({ ...revenueDates, search: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <button 
                onClick={() => setRevenueDates({ start: '', end: '', search: '' })}
                className="h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium whitespace-nowrap"
              >
                Xóa bộ lọc
              </button>
            </div>

            {isLoadingRevenue ? (
              <p className="text-sm text-muted-foreground text-center py-8">Đang tải dữ liệu doanh thu...</p>
            ) : revenueData?.data?.length > 0 ? (
              <div>
                <div className="mb-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6 text-center">
                  <p className="text-sm font-medium text-green-600 mb-2">Tổng doanh thu hệ thống</p>
                  <p className="text-4xl font-bold text-green-700">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueData.grandTotal || 0)}
                  </p>
                  <p className="text-xs text-green-600/70 mt-2">* Doanh thu được lưu trữ vô thời hạn</p>
                </div>
                
                <div className="rounded-xl border shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-medium">Sự kiện</th>
                        <th className="px-6 py-4 font-medium text-right">Số đơn hàng</th>
                        <th className="px-6 py-4 font-medium text-right">Số vé bán</th>
                        <th className="px-6 py-4 font-medium text-right">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.data.map((item: any, i: number) => (
                        <tr key={item.eventId} className={`bg-background hover:bg-muted/50 ${i !== revenueData.data.length - 1 ? 'border-b' : ''}`}>
                          <td className="px-6 py-4 font-medium text-foreground">{item.eventTitle}</td>
                          <td className="px-6 py-4 text-right text-muted-foreground">{item.orderCount}</td>
                          <td className="px-6 py-4 text-right text-muted-foreground">{item.totalTickets}</td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-sm text-muted-foreground">Không có dữ liệu doanh thu trong khoảng thời gian này</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
