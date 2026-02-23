import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Calendar, Ticket, ShoppingCart, TrendingUp } from 'lucide-react'
import { eventService, userService, ticketService } from '@/services'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
  const { data: eventsData } = useQuery({
    queryKey: ['admin', 'events-count'],
    queryFn: () => eventService.getEvents({ limit: 1 }).then((r) => r.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users-count'],
    queryFn: () => userService.getUsers({ limit: 1 }).then((r) => r.data),
  })

  const { data: ticketsData } = useQuery({
    queryKey: ['admin', 'tickets-count'],
    queryFn: () => ticketService.getTickets({ limit: 1 }).then((r) => r.data),
  })

  const stats = [
    {
      label: 'Sự kiện',
      value: eventsData?.pagination?.total ?? '—',
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Người dùng',
      value: usersData?.pagination?.total ?? '—',
      icon: Users,
      color: 'from-green-500 to-green-600',
    },
    {
      label: 'Vé đã bán',
      value: ticketsData?.pagination?.total ?? '—',
      icon: Ticket,
      color: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Tăng trưởng',
      value: '+12%',
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-xl p-4 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`size-10 sm:size-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                <stat.icon className="size-5 sm:size-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Hoạt động gần đây</h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center py-8">
              Dữ liệu hoạt động sẽ hiển thị ở đây
            </p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Sự kiện sắp diễn ra</h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center py-8">
              Danh sách sự kiện sẽ hiển thị ở đây
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
