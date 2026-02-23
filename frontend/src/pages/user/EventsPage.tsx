import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Calendar, MapPin, Flame, Filter, X } from 'lucide-react'
import { eventService } from '@/services'
import { Select } from '@/components/ui/Select'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { getImageUrl, formatDate, debounce } from '@/lib/utils'

export default function EventsPage() {
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [timeStatus, setTimeStatus] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const activeFiltersCount = [location, date, timeStatus].filter(Boolean).length

  const { data, isLoading } = useQuery({
    queryKey: ['events', { search, location, date, timeStatus, page }],
    queryFn: () => eventService.getEvents({ search, location, date, time_status: timeStatus, page, limit: 12 }).then((r) => r.data),
  })

  const events = data?.data || []
  const pagination = data?.pagination

  const handleSearch = debounce((value: string) => {
    setSearch(value)
    setPage(1)
  }, 400)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Sự kiện</h1>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-[2]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện..."
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
          />
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 px-4 rounded-xl border flex items-center gap-2 transition-all ${
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
              {/* Invisible backdrop to close on click outside */}
              <div 
                className="fixed inset-0 z-10 hidden sm:block delay-100" 
                onClick={() => setShowFilters(false)}
              />
              <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 sm:w-80 p-4 bg-card border border-border shadow-xl rounded-2xl z-20">
                <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Lọc sự kiện</h3>
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
                      onChange={(e) => { setLocation(e.target.value); setPage(1) }}
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
                      onChange={(e) => { setDate(e.target.value); setPage(1) }}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all cursor-pointer"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Trạng thái</label>
                  <Select
                    value={timeStatus}
                    onChange={(v) => { setTimeStatus(v); setPage(1) }}
                    placeholder="Tất cả trạng thái"
                    options={[
                      { value: '', label: 'Tất cả trạng thái' },
                      { value: 'upcoming', label: 'Sắp diễn ra' },
                      { value: 'ongoing', label: 'Đang diễn ra' },
                      { value: 'ended', label: 'Đã kết thúc' },
                    ]}
                  />
                </div>

                {activeFiltersCount > 0 && (
                  <div className="mt-2 pt-4 border-t border-border">
                    <button
                      onClick={() => {
                        setLocation('')
                        setDate('')
                        setTimeStatus('')
                        setPage(1)
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

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Calendar className="size-12 mx-auto mb-4 opacity-50" />
          <p>Không tìm thấy sự kiện nào</p>
        </div>
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

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.total_pages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`size-10 rounded-lg text-sm font-medium transition-colors ${
                page === i + 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
