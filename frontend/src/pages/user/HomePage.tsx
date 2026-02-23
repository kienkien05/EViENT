import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Calendar, Ticket, Headphones,
  Zap, Shield, Smartphone, Bell,
} from 'lucide-react'
import { bannerService } from '@/services'
import { getImageUrl } from '@/lib/utils'

export default function HomePage() {
  const { data: bannersData } = useQuery({
    queryKey: ['banners', 'active'],
    queryFn: () => bannerService.getBanners(true).then((r) => r.data.data),
  })

  // Banner carousel state — always include the default banner first
  const defaultBanner = { id: 'default', image_url: '/images/banner.png', link_url: '/events', title: 'EViENT' }
  const banners: any[] = [defaultBanner, ...(bannersData || [])]

  const [current, setCurrent] = useState(0)
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef(0)

  const goTo = useCallback((index: number) => {
    setCurrent(((index % banners.length) + banners.length) % banners.length)
  }, [banners.length])

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % banners.length)
  }, [banners.length])

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + banners.length) % banners.length)
  }, [banners.length])

  // Reset auto-play timer
  const resetAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    if (banners.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrent((i) => (i + 1) % banners.length)
      }, 5000)
    }
  }, [banners.length])

  // Auto-play on mount and when banners change
  useEffect(() => {
    resetAutoPlay()
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [resetAutoPlay])

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0]?.clientX ?? 0
    const diff = touchStartX.current - endX
    if (Math.abs(diff) > 50) {
      if (diff > 0) { next(); resetAutoPlay() }
      else { prev(); resetAutoPlay() }
    }
  }

  const handlePrev = () => { prev(); resetAutoPlay() }
  const handleNext = () => { next(); resetAutoPlay() }
  const handleGoTo = (i: number) => { goTo(i); resetAutoPlay() }

  return (
    <div className="min-h-screen">
      {/* ==================== Banner Carousel ==================== */}
      <section
        className="relative w-full overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides container */}
        <div className="relative w-full aspect-[21/9] sm:aspect-[3/1]">
          {banners.map((b: any, i: number) => (
              <div
                key={b.id || i}
                className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                style={{
                  opacity: i === current ? 1 : 0,
                  zIndex: i === current ? 1 : 0,
                }}
              >
              <Link to={b?.link_url || '/events'} className="block w-full h-full">
                <img
                  src={b.id === 'default' ? b.image_url : getImageUrl(b?.image_url, { width: 1920 })}
                  alt={b?.title || 'Banner'}
                  className="w-full h-full object-cover"
                  draggable={false}
                  crossOrigin="anonymous"
                />
              </Link>
            </div>
          ))}
        </div>

        {/* Left / Right nav arrows */}
        {banners.length > 1 && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-black/50 to-transparent z-10 flex items-center justify-start pl-2 sm:pl-4">
              <button onClick={handlePrev}
                className="size-10 sm:size-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-all active:scale-90 cursor-pointer">
                <ChevronLeft className="size-5 sm:size-6" />
              </button>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-black/50 to-transparent z-10 flex items-center justify-end pr-2 sm:pr-4">
              <button onClick={handleNext}
                className="size-10 sm:size-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-all active:scale-90 cursor-pointer">
                <ChevronRight className="size-5 sm:size-6" />
              </button>
            </div>
          </>
        )}

        {/* Bottom dot indicators + progress bar */}
        {banners.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-10">
            {/* Progress bar */}
            <div className="w-full h-1 bg-white/20">
              <div
                className="h-full bg-white/80 transition-none"
                style={{
                  animation: `progress-fill 5s linear infinite`,
                }}
                key={`prog-${current}`}
              />
            </div>
            {/* Dots + counter */}
            <div className="flex items-center justify-center gap-3 py-2.5 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center gap-2 z-20">
                {banners.map((_: any, i: number) => (
                  <button key={i} onClick={() => handleGoTo(i)}
                    className={`rounded-full cursor-pointer transition-all duration-300 ${
                      i === current
                        ? 'w-7 h-2.5 bg-white shadow-md'
                        : 'size-2.5 bg-white/40 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
              <span className="text-white/70 text-xs font-medium tabular-nums">
                {current + 1}/{banners.length}
              </span>
            </div>
          </div>
        )}

        {/* CSS animation for progress bar */}
        <style>{`
          @keyframes progress-fill {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </section>

      {/* ==================== Welcome Section ==================== */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold">
            Chào mừng đến với{' '}
            <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              EViENT
            </span>
          </h1>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Hệ thống quản lý sự kiện &amp; đặt vé trực tuyến. Khám phá hàng trăm sự kiện hấp dẫn, đặt vé nhanh chóng và dễ dàng.
          </p>
        </motion.div>

        {/* Quick access cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Link to="/events"
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300">
            <div className="size-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold">Sự kiện</h3>
            <p className="text-sm text-muted-foreground mt-1">Khám phá &amp; tìm kiếm sự kiện phù hợp</p>
          </Link>

          <Link to="/my-tickets"
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300">
            <div className="size-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ticket className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold">Vé của tôi</h3>
            <p className="text-sm text-muted-foreground mt-1">Quản lý vé đã đặt &amp; mã QR check-in</p>
          </Link>

          <Link to="/contact"
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300">
            <div className="size-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Headphones className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold">Liên hệ</h3>
            <p className="text-sm text-muted-foreground mt-1">Kết nối với đội ngũ hỗ trợ của chúng tôi</p>
          </Link>
        </motion.div>
      </section>

      {/* ==================== Communication Section ==================== */}
      <section className="bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-xl sm:text-2xl font-bold">Tại sao chọn EViENT?</h2>
            <p className="mt-2 text-muted-foreground text-sm max-w-xl mx-auto">
              Nền tảng được thiết kế để mang lại trải nghiệm tốt nhất cho cả người tổ chức và người tham dự.
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { Icon: Zap, title: 'Đặt vé nhanh', desc: 'Chỉ vài bước đơn giản' },
              { Icon: Shield, title: 'An toàn', desc: 'Bảo mật thông tin tuyệt đối' },
              { Icon: Smartphone, title: 'Mọi thiết bị', desc: 'Trải nghiệm mượt mà trên mobile & desktop' },
              { Icon: Bell, title: 'Thông báo', desc: 'Cập nhật sự kiện theo thời gian thực' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-4"
              >
                <div className="size-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.Icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold mt-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
