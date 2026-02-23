import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Ticket, Calendar, MapPin, Search, Filter, X } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { orderService } from '@/services'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatDate, formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

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

export default function MyTicketsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const activeFiltersCount = [location, date, status].filter(Boolean).length

  const { data, isLoading } = useQuery({
    queryKey: ['my-tickets', { location, date, status, search: searchQuery }],
    queryFn: () => orderService.getMyTickets({ limit: 100, location, date, status, search: searchQuery }).then((r) => r.data.data),
  })

  // Keep a unified variable for tickets rendering
  const filteredTickets = data || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 shrink-0">
          <Ticket className="size-6 text-primary" />
          Vé của tôi
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo sự kiện hoặc mã vé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-10 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filter Popover */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all w-full sm:w-auto ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-background border-input hover:bg-muted'
              }`}
            >
              <Filter className="size-4" />
              <span className="font-medium hidden sm:inline">Bộ lọc</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {showFilters && (
              <>
                <div 
                  className="fixed inset-0 z-10 hidden sm:block delay-100" 
                  onClick={() => setShowFilters(false)}
                />
                <div className="absolute right-0 top-full sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 p-4 bg-card border border-border shadow-xl rounded-2xl z-20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">Lọc vé của bạn</h3>
                    <button 
                      onClick={() => setShowFilters(false)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Địa điểm</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Nhập địa điểm..."
                          className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ngày tổ chức</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Trạng thái vé</label>
                      <Select
                        value={status}
                        onChange={(v) => setStatus(v)}
                        placeholder="Tất cả trạng thái"
                        options={[
                          { value: '', label: 'Tất cả trạng thái' },
                          { value: 'valid', label: 'Hợp lệ' },
                          { value: 'used', label: 'Đã sử dụng' },
                          { value: 'cancelled', label: 'Đã hủy' },
                        ]}
                      />
                    </div>

                    {activeFiltersCount > 0 && (
                      <div className="mt-2 pt-4 border-t border-border">
                        <button
                          onClick={() => {
                            setLocation('')
                            setDate('')
                            setStatus('')
                          }}
                          className="w-full py-2 text-sm text-red-500 font-medium hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-xl">
          <Ticket className="size-12 mx-auto mb-4 opacity-50 text-primary" />
          <p>{searchQuery ? 'Không tìm thấy vé nào phù hợp' : 'Bạn chưa có vé nào'}</p>
          {!searchQuery && <p className="text-sm mt-1">Hãy mua vé để tham gia sự kiện!</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket: any, i: number) => (
            <motion.div
              key={ticket.id || ticket.ticket_code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg line-clamp-2">
                      {ticket.event?.title || 'Sự kiện'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-primary font-medium">
                        {ticket.ticket_type?.name || ticket.ticket_type_name || 'Vé tiêu chuẩn'}
                      </p>
                      {ticket.seat && (
                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                          {ticket.seat.room} • {ticket.seat.row} - Số {ticket.seat.number}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs sm:text-sm text-muted-foreground">
                      {ticket.event?.start_time && (
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                          <Calendar className="size-3.5" /> 
                          {formatDate(ticket.event.start_time)}
                        </span>
                      )}
                      {ticket.event?.location && (
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                          <MapPin className="size-3.5" /> 
                          <span className="truncate max-w-[200px]">{ticket.event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={cn(
                    'shrink-0 text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full border',
                    statusColors[ticket.status] || 'bg-muted text-muted-foreground'
                  )}>
                    {statusLabels[ticket.status] || ticket.status}
                  </span>
                </div>

                {/* QR Code (if valid) */}
                {ticket.status === 'valid' && ticket.qr_code && (
                  <div className="mt-5 flex justify-center border-t border-dashed border-border pt-5">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-border">
                      <img src={ticket.qr_code} alt="QR Code" className="size-32 sm:size-40 object-contain" />
                    </div>
                  </div>
                )}

                {/* Used Tag */}
                {ticket.status === 'used' && ticket.used_at && (
                  <div className="mt-5 flex justify-center border-t border-dashed border-border pt-5">
                    <div className="bg-gray-500/10 border border-gray-500/20 text-gray-500 px-6 py-4 rounded-xl text-center">
                      <p className="font-semibold">Vé đã được sử dụng</p>
                      <p className="text-sm mt-1">
                        Vào lúc: {formatDate(ticket.used_at)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm border-t border-border pt-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    Mã vé: <span className="font-mono bg-muted px-2 py-0.5 rounded-md text-foreground">{ticket.ticket_code}</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {ticket.price_at_purchase > 0 ? formatPrice(ticket.price_at_purchase) : 'Miễn phí'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
