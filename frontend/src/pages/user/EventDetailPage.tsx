import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Ticket, AlertCircle, Image } from 'lucide-react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { eventService, orderService, roomService } from '@/services'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { getImageUrl, formatDateTime, formatPrice } from '@/lib/utils'
import SeatMap, { Seat, Room } from '@/components/ui/SeatMap'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({})
  const [selectedSeats, setSelectedSeats] = useState<{ seat: Seat; ticketTypeId: string }[]>([])
  const [buying, setBuying] = useState(false)
  const [bookingStep, setBookingStep] = useState<1 | 2>(1)

  // Slider state
  const [currentSlide, setCurrentSlide] = useState(0)

  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEventById(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  // Fetch all rooms to map with event
  const { data: allRoomsRes, isLoading: isRoomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomService.getRooms().then(r => r.data),
    enabled: showBuyModal,
  })

  // Fetch occupied seats for this event to block them in the UI
  const { data: soldSeatsRes } = useQuery({
    queryKey: ['sold-seats', id],
    queryFn: () => orderService.getSoldSeats(id!).then(r => r.data),
    enabled: showBuyModal && !!id,
  })

  const isLoading = isEventLoading

  // Determine the relevant room for this event
  const eventRoom = useMemo(() => {
    if (!event || !allRoomsRes) return null
    const roomsArray = Array.isArray(allRoomsRes) ? allRoomsRes : (allRoomsRes as any).data || []
    return roomsArray.find((r: any) => r.events?.some((e: any) => e.id === event.id || e._id === event.id)) as Room | null
  }, [event, allRoomsRes])

  const soldSeats: string[] = Array.isArray(soldSeatsRes?.data) ? soldSeatsRes.data : []

  const totalTicketsSelected = Object.values(selectedTickets).reduce((a, b) => a + b, 0)

  const handleQuantityChange = (ticketId: string, qty: number) => {
    // Get per-ticket-type max from the API data
    const ticketType = event?.ticket_types?.find((tt: any) => (tt._id || tt.id) === ticketId)
    const typeMaxPerUser = ticketType?.max_per_user ?? -1

    setSelectedTickets((prev) => {
      const newQty = Math.max(0, qty)

      // Enforce per-ticket-type max_per_user
      if (typeMaxPerUser !== -1 && newQty > typeMaxPerUser) {
        toast.info(`Loại vé này chỉ cho phép mua tối đa ${typeMaxPerUser} vé mỗi người`)
        return prev
      }

      const newMap = { ...prev, [ticketId]: newQty }

      // If we reduce ticket quantity below selected seats, trim seats for this type
      setSelectedSeats(prevSeats => {
        const typeSeats = prevSeats.filter(s => s.ticketTypeId === ticketId)
        if (newQty < typeSeats.length) {
            const seatsToKeep = typeSeats.slice(0, newQty)
            return [
                ...prevSeats.filter(s => s.ticketTypeId !== ticketId),
                ...seatsToKeep
            ]
        }
        return prevSeats
      })

      return newMap
    })
  }

  const handleSeatToggle = (seat: Seat) => {
    setSelectedSeats(prev => {
      const existingSelection = prev.find(s => s.seat.id === seat.id)
      
      if (existingSelection) {
        // Toggle off if already selected by the user
        return prev.filter(s => s.seat.id !== seat.id)
      } else {
        // Find which ticket type this seat is configured for
        const allowedTypes = event.ticket_types.filter((tt: any) => {
            const eventLocks = (seat as any).locks?.filter((l: any) => l.eventId === id) || [];
            if (eventLocks.length === 0) return true; // generic seat
            const hasGeneralEventLock = eventLocks.some((l: any) => !l.ticketTypeId)
            if (hasGeneralEventLock) return false;
            return eventLocks.some((l: any) => l.ticketTypeId === (tt._id || tt.id))
        }).map((tt: any) => tt._id || tt.id);

        // Find the first ticket type the user is trying to buy that matches the allowed types for this seat
        const matchedTypeForCart = allowedTypes.find((typeId: string) => {
            const currentSelectedQtyForType = prev.filter(s => s.ticketTypeId === typeId).length
            const maxQtyForType = selectedTickets[typeId] || 0
            return currentSelectedQtyForType < maxQtyForType
        })

        if (!matchedTypeForCart) {
            toast.info('Bạn cần chọn thêm số lượng loại vé tương ứng với khu vực ghế này trước khi chọn tĩnh.')
            return prev
        }

        return [...prev, { seat, ticketTypeId: matchedTypeForCart }]
      }
    })
  }

  // Pre-process room seats: Only seats that belong to the ticket types the user has selected (qty > 0) are active
  const processedRoom = useMemo(() => {
    if (!eventRoom) return null

    const selectedTicketTypes = Object.entries(selectedTickets)
        .filter(([, qty]) => qty > 0)
        .map(([id]) => id);

    const newSeats = eventRoom.seats.map(s => {
       if (!s.isActive) return s;

       const eventLocks = (s as any).locks?.filter((l: any) => l.eventId === id) || [];
       if (eventLocks.length > 0) {
           const hasGeneralEventLock = eventLocks.some((l: any) => !l.ticketTypeId)
           if (hasGeneralEventLock) return { ...s, isActive: false }
           
           // If the seat is locked to specific types, check if user has selected ANY of those types
           const isMatchedToCart = eventLocks.some((l: any) => selectedTicketTypes.includes(l.ticketTypeId))
           if (isMatchedToCart) {
               return { ...s, isActive: true } 
           } else {
               return { ...s, isActive: false }
           }
       }
       return s; // available to anyone if no specific lock
    })

    return { ...eventRoom, seats: newSeats }
  }, [eventRoom, selectedTickets, id])

  const totalAmount = event?.ticket_types?.reduce(
    (sum: number, tt: any) => sum + (selectedTickets[tt._id || tt.id] || 0) * tt.price,
    0
  ) || 0

  const handleBuy = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để mua vé')
      return
    }
    
    // Validate that at least one ticket is selected
    if (totalTicketsSelected === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 vé')
      return
    }

    setShowBuyModal(true)
    setBookingStep(1)
  }

  // Combine main banner and sub banners
  const allBanners = useMemo(() => {
    if (!event) return []
    const mainBanner = event.banner_image || event.bannerImage || ''
    const subBanners = event.sub_banners || event.subBanners || []
    
    // Check toggle to show sub banners
    const showSubBanners = event.show_sub_banners !== false && event.showSubBanners !== false

    if (showSubBanners) {
      return [mainBanner, ...subBanners].filter(Boolean)
    }
    return [mainBanner].filter(Boolean)
  }, [event])

  // Auto-advance slider
  useEffect(() => {
    if (allBanners.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allBanners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [allBanners.length])

  const handleNextSlide = () => {
    if (allBanners.length <= 1) return
    setCurrentSlide((prev) => (prev + 1) % allBanners.length)
  }

  const handlePrevSlide = () => {
    if (allBanners.length <= 1) return
    setCurrentSlide((prev) => (prev - 1 + allBanners.length) % allBanners.length)
  }

  const handleGoToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const handleConfirmOrder = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để mua vé')
      return
    }

    const items = Object.entries(selectedTickets)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => {
        const tt = event.ticket_types.find((t: any) => (t._id || t.id) === ticketTypeId)
        return {
           ticket_type_id: ticketTypeId,
           ticket_type_name: tt?.name,
           quantity,
           unit_price: tt?.price,
        }
      })

    if (items.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 vé')
      return
    }

    const hasSelectableSeats = eventRoom && processedRoom?.seats?.some(s => s.isActive)
    if (hasSelectableSeats && selectedSeats.length !== totalTicketsSelected) {
      toast.error(`Vui lòng chọn đủ ${totalTicketsSelected} ghế tương ứng với số vé.`)
      return
    }

    setBuying(true)
    try {
      const seat_assignments = selectedSeats.map(s => ({
        roomName: eventRoom?.name || 'Phòng chiếu',
        row: s.seat.row,
        number: s.seat.number,
        ticket_type_id: s.ticketTypeId
      }))

      await orderService.createOrder({
        event_id: id,
        items,
        seat_assignments: seat_assignments.length > 0 ? seat_assignments : undefined,
        buyer_info: user ? {
          fullName: user.full_name,
          email: user.email,
        } : undefined,
        event_snapshot: {
          title: event.title,
          startTime: event.start_time || event.startTime,
          endTime: event.end_time || event.endTime,
          location: event.location,
          bannerImage: event.banner_image || event.bannerImage,
        },
      })
      toast.success('Mua vé thành công!')
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      setShowBuyModal(false)
      setSelectedTickets({})
      setSelectedSeats([])
      setBookingStep(1)
      navigate('/my-tickets')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mua vé thất bại')
    } finally {
      setBuying(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="w-full aspect-video rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Không tìm thấy sự kiện
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Banner Slider */}
        <div className="w-full bg-black/5 dark:bg-black/20 rounded-xl shadow-md overflow-hidden relative flex items-center justify-center aspect-[21/9] sm:aspect-[3/1] sm:max-h-[500px]">
          {allBanners.length > 0 ? (
            <>
              {allBanners.map((imgUrl, i) => (
                <div
                  key={i}
                  className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                  style={{
                    opacity: i === currentSlide ? 1 : 0,
                    zIndex: i === currentSlide ? 1 : 0,
                  }}
                >
                  <img
                    src={getImageUrl(imgUrl, { width: 1200 })}
                    alt={`${event.title} - ảnh ${i + 1}`}
                    className="w-full h-full object-contain bg-black/5 dark:bg-black/20"
                    crossOrigin="anonymous"
                  />
                </div>
              ))}

              {/* Slider Controls */}
              {allBanners.length > 1 && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black/30 to-transparent z-10 flex items-center justify-start pl-2">
                    <button onClick={handlePrevSlide}
                      className="size-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-all active:scale-90 cursor-pointer">
                      <ChevronLeft className="size-5" />
                    </button>
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black/30 to-transparent z-10 flex items-center justify-end pr-2">
                    <button onClick={handleNextSlide}
                      className="size-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-all active:scale-90 cursor-pointer">
                      <ChevronRight className="size-5" />
                    </button>
                  </div>

                  {/* Progress and Dots */}
                  <div className="absolute bottom-0 left-0 right-0 z-10">
                    <div className="w-full h-1 bg-white/20">
                      <div
                        className="h-full bg-white/80 transition-none"
                        style={{ animation: `progress-fill 5s linear infinite` }}
                        key={`prog-${currentSlide}`}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-3 py-2 bg-gradient-to-t from-black/50 to-transparent">
                      <div className="flex items-center gap-2">
                        {allBanners.map((_, i) => (
                          <button key={i} onClick={() => handleGoToSlide(i)}
                            className={`rounded-full cursor-pointer transition-all duration-300 ${
                              i === currentSlide
                                ? 'w-6 h-2 bg-white shadow-md'
                                : 'size-2 bg-white/40 hover:bg-white/80'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-white/70 text-[10px] font-medium tabular-nums">
                        {currentSlide + 1}/{allBanners.length}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-12">
              <Image className="size-12 mb-3 opacity-20" />
              <p>Chưa có ảnh sự kiện</p>
            </div>
          )}
        </div>

        <style>{`
          @keyframes progress-fill {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>

        {/* Title & Meta */}
        <div className="mt-6">
          <h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {(event.start_time || event.startTime) && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4" />
                {formatDateTime(event.start_time || event.startTime)}
                {(event.end_time || event.endTime) && ` - ${formatDateTime(event.end_time || event.endTime)}`}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="mt-6 prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Content */}
        {event.content && (
          <div
            className="mt-6 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: event.content }}
          />
        )}


        {/* Ticket Types */}
        {event.ticket_types && event.ticket_types.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Ticket className="size-5" />
              Loại vé
            </h2>
            <div className="space-y-3">
              {event.ticket_types.map((tt: any) => {
                const ttId = tt._id || tt.id;
                return (
                  <div
                    key={ttId}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
                  >
                    <div>
                      <h3 className="font-semibold">{tt.name}</h3>
                      {tt.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{tt.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-primary font-bold">{formatPrice(tt.price)}</span>
                        {tt.original_price > tt.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(tt.original_price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {tt.quantity_total === -1 ? 'Không giới hạn' : `Còn: ${Math.max(0, (tt.quantity_total || 0) - (tt.quantity_sold || 0))}`}
                    </span>
                  </div>
                )
              })}
            </div>

            <Button
              onClick={() => setShowBuyModal(true)}
              size="lg"
              className="w-full mt-6"
            >
              Mua vé ngay
            </Button>
          </div>
        )}
      </motion.div>

      {/* Buy Modal */}
      <Modal
        isOpen={showBuyModal}
        onClose={() => {
          setShowBuyModal(false)
          setSelectedSeats([])
          setBookingStep(1)
        }}
        title={bookingStep === 1 ? "Bước 1: Chọn vé & Chỗ ngồi" : "Bước 2: Xác nhận thanh toán"}
        size="lg"
      >
        <div className={`flex flex-col ${bookingStep === 1 && eventRoom && processedRoom?.seats?.some(s => s.isActive) ? 'md:flex-row' : ''} gap-6 ${bookingStep === 1 && eventRoom && processedRoom?.seats?.some(s => s.isActive) ? 'h-[75vh] md:h-auto' : ''} overflow-hidden`}>
          
          {/* STEP 1: Left Side Ticket Selection */}
          {bookingStep === 1 && (
            <div className={`${eventRoom && processedRoom?.seats?.some(s => s.isActive) ? 'flex-1 border-r border-border pr-6' : 'w-full'} overflow-y-auto custom-scrollbar`}>
              <h3 className="font-semibold mb-3">Số lượng vé</h3>
              <div className="space-y-4">
                {event.ticket_types?.map((tt: any) => {
                  const ttId = tt._id || tt.id
                  const isUnlimited = tt.quantity_total === -1;
                  const remaining = isUnlimited ? Infinity : Math.max(0, (tt.quantity_total || 0) - (tt.quantity_sold || 0))
                  const qty = selectedTickets[ttId] || 0
                  const typeSelectedSeats = selectedSeats.filter(s => s.ticketTypeId === ttId).length
                  
                  return (
                    <div 
                      key={ttId} 
                      className="flex flex-col py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-foreground">{tt.name}</p>
                            <p className="font-bold text-sm text-muted-foreground">{formatPrice(tt.price)}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 relative z-10">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleQuantityChange(ttId, qty - 1) }}
                                disabled={qty === 0}
                                className="size-8 rounded-lg border border-input flex items-center justify-center hover:bg-muted disabled:opacity-40"
                            >
                                −
                            </button>
                            <span className="w-8 text-center font-medium">{qty}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleQuantityChange(ttId, qty + 1) }}
                                disabled={(!isUnlimited && qty >= remaining) || (tt.max_per_user !== -1 && qty >= tt.max_per_user)}
                                className="size-8 rounded-lg border border-input flex items-center justify-center hover:bg-muted disabled:opacity-40 flex-shrink-0"
                            >
                                +
                            </button>
                          </div>
                      </div>
                      {eventRoom && processedRoom?.seats?.some(s => s.isActive) && qty > 0 && (
                          <div className="text-right mt-1 text-xs">
                              <span className="text-muted-foreground mr-1">Đã xếp chỗ:</span>
                              <span className={`font-bold ${typeSelectedSeats === qty ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  {typeSelectedSeats} / {qty}
                              </span>
                          </div> 
                      )}
                    </div>
                  )
                })}
              </div>

              {totalAmount > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Số vé đã chọn:</span>
                    <span className="font-semibold">{totalTicketsSelected} vé</span>
                  </div>
                  {eventRoom && processedRoom?.seats?.some(s => s.isActive) && (
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Số ghế đã xếp:</span>
                        <span className={`font-semibold ${selectedSeats.length === totalTicketsSelected ? "text-emerald-500" : "text-amber-500"}`}>
                        {selectedSeats.length} / {totalTicketsSelected} ghế
                        </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                    <span className="font-medium">Tạm tính:</span>
                    <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                  <Button 
                      onClick={() => {
                          if (totalTicketsSelected === 0) {
                              toast.error('Vui lòng chọn ít nhất 1 vé')
                              return
                          }
                          const hasSelectableSeats = eventRoom && processedRoom?.seats?.some(s => s.isActive)
                          if (hasSelectableSeats && selectedSeats.length !== totalTicketsSelected) {
                            toast.error(`Vui lòng chọn đủ ${totalTicketsSelected} ghế trên sơ đồ bên phải tương ứng với số lượng vé.`)
                            return
                          }
                          setBookingStep(2)
                      }}
                      disabled={totalAmount === 0 || (eventRoom ? (processedRoom?.seats?.some(s => s.isActive) ? selectedSeats.length !== totalTicketsSelected : false) : false)} 
                      className="w-full"
                  >
                      Tiếp tục thanh toán {formatPrice(totalAmount)}
                  </Button>
              </div>
            </div>
          )}

          {/* STEP 1: Right Side Seat Map */}
          {bookingStep === 1 && eventRoom && processedRoom?.seats?.some(s => s.isActive) && (
            <div className="flex-[1.5] flex flex-col items-center bg-muted/20 border border-border rounded-xl p-4 overflow-y-auto custom-scrollbar relative">
              <div className="w-full flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Sơ đồ ghế ngồi</h3>
                  {totalTicketsSelected > 0 ? (
                      <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium border border-primary/20">
                          Vui lòng nhấp vào {totalTicketsSelected} ghế
                      </span>
                  ) : (
                      <span className="text-xs bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full font-medium border border-amber-500/20">
                          Hãy chọn số lượng vé trước
                      </span>
                  )}
              </div>
              
              {isRoomsLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    Đang tải sơ đồ...
                  </div>
                ) : (
                  <SeatMap 
                    room={processedRoom || eventRoom} 
                    selectedSeats={selectedSeats.map(s => s.seat)}
                    onSeatToggle={handleSeatToggle}
                    maxSelectable={totalTicketsSelected} 
                    soldSeats={soldSeats}
                  />
                )}
            </div>
          )}

          {/* STEP 2: Checkout Summary */}
          {bookingStep === 2 && (
            <div className="w-full mx-auto max-w-lg">
                <div className="mb-6 pb-6 border-b border-border">
                    <h3 className="font-bold text-xl mb-4 text-center">Xác nhận thông tin</h3>
                    <div className="space-y-3">
                        {event.ticket_types?.map((tt: any) => {
                            const ttId = tt._id || tt.id
                            const qty = selectedTickets[ttId] || 0
                            if (qty === 0) return null;
                            const typeSelectedSeats = selectedSeats.filter(s => s.ticketTypeId === ttId)

                            return (
                                <div key={ttId} className="flex flex-col bg-muted/30 p-3 rounded-lg border border-border">
                                    <div className="flex justify-between font-medium">
                                        <span>{tt.name} ({qty} vé)</span>
                                        <span className="text-primary">{formatPrice(tt.price * qty)}</span>
                                    </div>
                                    {typeSelectedSeats.length > 0 && (
                                        <div className="text-sm text-muted-foreground mt-1">
                                            Ghế: {typeSelectedSeats.map(s => `${s.seat.row} - Số ${s.seat.number}`).join(', ')}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="p-5 rounded-xl bg-primary/10 border border-primary/20 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-lg">Tổng thanh toán:</span>
                        <span className="text-2xl font-bold text-primary">{formatPrice(totalAmount)}</span>
                    </div>
                </div>
                
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setBookingStep(1)}
                        className="flex-1"
                        disabled={buying}
                    >
                        Quay lại chọn vé
                    </Button>
                    <Button
                        onClick={handleConfirmOrder}
                        loading={buying}
                        className="flex-[2]"
                        size="lg"
                    >
                        Thanh toán ngay
                    </Button>
                </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
