import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Calendar, Ticket, ShoppingCart, TrendingUp, Clock, UserPlus, FileEdit } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

  // Polling for recent activities
  const { data: recentActivities } = useQuery({
    queryKey: ['admin', 'recent-activities'],
    queryFn: async () => {
      const [tickets, users, events] = await Promise.all([
        ticketService.getTickets({ limit: 5 }).then(r => r.data.data || []),
        userService.getUsers({ limit: 5 }).then(r => r.data.data || []),
        eventService.getEvents({ limit: 5 }).then(r => r.data.data || []),
      ])

      const activities: any[] = []
      tickets.forEach((t: any) => {
        activities.push({
          id: `ticket-${t.id}`,
          type: 'ticket',
          title: `Vé ${t.ticket_code} đã được bán cho ${t.buyer_info?.full_name || t.buyer_info?.email || 'Khách vãng lai'}`,
          time: new Date(t.created_at || new Date()).getTime(),
          icon: Ticket,
          color: 'text-orange-500 bg-orange-500/10'
        })
      })
      users.forEach((u: any) => {
        activities.push({
          id: `user-${u.id}`,
          type: 'user',
          title: `Tài khoản ${u.full_name || u.email} vừa được tạo`,
          time: new Date(u.created_at || new Date()).getTime(),
          icon: UserPlus,
          color: 'text-green-500 bg-green-500/10'
        })
      })
      events.forEach((e: any) => {
        activities.push({
          id: `event-${e.id}`,
          type: 'event',
          title: `Sự kiện "${e.title}" đã được admin cập nhật/tạo`,
          time: new Date(e.updated_at || e.created_at || new Date()).getTime(),
          icon: FileEdit,
          color: 'text-blue-500 bg-blue-500/10'
        })
      })

      return activities.sort((a, b) => b.time - a.time).slice(0, 5)
    },
    refetchInterval: 5000,
  })

  // Polling for upcoming events
  const { data: upcomingEvents } = useQuery({
    queryKey: ['admin', 'upcoming-events'],
    queryFn: async () => {
      const { data } = await eventService.getEvents({ limit: 20, time_status: 'upcoming' });
      const events = data.data || [];
      // Sort by closest start time
      return events.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).slice(0, 5);
    },
    refetchInterval: 5000,
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
          <div className="space-y-4">
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full ${activity.color}`}>
                    <activity.icon className="size-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(activity.time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Chưa có hoạt động nào gần đây
              </p>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Sự kiện sắp diễn ra</h2>
          <div className="space-y-4">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((event: any) => (
                <Link to={`/admin/events/${event.id}/edit`} key={event.id} className="block">
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all cursor-pointer">
                    <img src={event.banner_image || '/placeholder-event.png'} alt={event.title} className="w-full sm:w-20 h-20 sm:h-auto aspect-video object-cover rounded-md" />
                    <div className="flex-1 space-y-2">
                      <p className="font-medium line-clamp-1">{event.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="size-3" />
                        <span>{new Date(event.start_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'long', timeStyle: 'short' })} (GMT+7)</span>
                      </div>
                      <CountdownTimer targetDate={event.start_time} />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Không có sự kiện nào sắp diễn ra
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime()
      if (difference <= 0) {
        setTimeLeft('Đã bắt đầu')
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      setTimeLeft(`Còn ${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`)
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className="text-xs font-medium text-orange-500">
      {timeLeft}
    </div>
  )
}
