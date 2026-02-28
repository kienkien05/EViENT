import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Ticket, Search, Flame } from 'lucide-react'
import { eventService, orderService } from '@/services'
import { useAuthStore } from '@/stores/authStore'
import { getImageUrl, formatDate, cn } from '@/lib/utils'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const { isAuthenticated, user } = useAuthStore()

  // Query Events
  const { data: eventsRes, isLoading: isEventsLoading } = useQuery({
    queryKey: ['search-events', q],
    queryFn: () => eventService.getEvents({ search: q, limit: 12 }).then((r) => r.data),
    enabled: !!q,
  })

  // Query Tickets (if authenticated)
  const { data: ticketsRes, isLoading: isTicketsLoading } = useQuery({
    queryKey: ['search-tickets', user?.id, q],
    queryFn: () => orderService.getMyTickets({ search: q, limit: 20 }).then((r) => r.data),
    enabled: !!q && isAuthenticated,
  })

  const events = eventsRes?.data || []
  const tickets = ticketsRes?.data || []

  const statusColors: Record<string, string> = {
    valid: 'bg-green-500/10 text-green-600 border-green-500/20',
    used: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  const statusLabels: Record<string, string> = {
    valid: 'Hợp lệ',
    used: 'Đã sử dụng',
    cancelled: 'Đã hủy',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Search className="size-8 text-primary" />
          {q ? `Kết quả tìm kiếm cho "${q}"` : 'Nhập từ khóa để tìm kiếm'}
        </h1>
      </div>

      {!q && (
        <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-xl">
          <Search className="size-16 mx-auto mb-4 opacity-50" />
          <p>Hãy nhập tên sự kiện hoặc mã vé (nếu đã đăng nhập) vào ô tìm kiếm ở trên nhé!</p>
        </div>
      )}

      {q && (
        <div className="flex flex-col gap-12">
          {/* Events Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="size-5 text-primary" /> Sự kiện ({events.length})
            </h2>
            
            {isEventsLoading ? (
               <p className="text-muted-foreground">Đang tải...</p>
            ) : events.length === 0 ? (
               <p className="text-muted-foreground bg-muted/30 p-4 rounded-lg">Không tìm thấy sự kiện nào khớp với từ khóa.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {events.map((event: any, i: number) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      to={`/events/${event.id}`}
                      className="group block rounded-xl border border-border overflow-hidden bg-card hover:shadow-lg transition-all duration-300"
                    >
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={getImageUrl(event.banner_image, { width: 500 })}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          crossOrigin="anonymous"
                        />
                        {event.is_hot && (
                          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                            <Flame className="size-3" /> Hot
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>
                        <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                          {event.start_time && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" /> {formatDate(event.start_time)}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" /> <span className="truncate">{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Tickets Section */}
          {isAuthenticated && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Ticket className="size-5 text-primary" /> Vé của bạn ({tickets.length})
              </h2>

              {isTicketsLoading ? (
                 <p className="text-muted-foreground">Đang tải...</p>
              ) : tickets.length === 0 ? (
                 <p className="text-muted-foreground bg-muted/30 p-4 rounded-lg">Bạn chưa có vé nào khớp với từ khóa này.</p>
              ) : (
                <div className="space-y-4 max-w-4xl">
                  {tickets.map((ticket: any, i: number) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row"
                    >
                      <div className="p-4 sm:p-5 flex-1 relative">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs text-muted-foreground mb-1 mt-1">
                              Mã vé: <span className="text-foreground font-semibold">{ticket.ticket_code}</span>
                            </p>
                            <h3 className="font-semibold text-base sm:text-lg line-clamp-2 text-primary hover:underline cursor-pointer">
                              <Link to={`/my-tickets`}>{ticket.event?.title || 'Sự kiện'}</Link>
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm font-medium">
                                {ticket.ticket_type?.name || 'Vé tiêu chuẩn'}
                              </p>
                              {ticket.seat && (
                                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                                  {ticket.seat.room} • Ghế {ticket.seat.row}{ticket.seat.number}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end">
                            <span className={cn('text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 bg-muted rounded-full border', statusColors[ticket.status])}>
                              {statusLabels[ticket.status] || ticket.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
