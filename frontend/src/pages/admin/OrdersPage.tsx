import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { ticketService, userService, eventService, orderService, roomService } from '@/services'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn, formatDateTime } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import SeatMap, { Room, Seat } from '@/components/ui/SeatMap'
import { useMemo } from 'react'

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)

  // Bulk Actions State
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])

  // Grant Ticket Modal State
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [grantTab, setGrantTab] = useState<'system' | 'email'>('system')
  const [selectedSeats, setSelectedSeats] = useState<{ seat: Seat; ticketTypeId: string }[]>([])
  const [grantForm, setGrantForm] = useState({
    user_id: '',
    guest_name: '',
    guest_email: '',
    event_id: '',
    ticket_type_id: '',
    quantity: 1,
  })

  // Edit Ticket Modal State
  const [editingTicket, setEditingTicket] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    status: '',
    seat_row: '',
    seat_number: ''
  })

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tickets', { search, status: statusFilter, event_id: eventFilter, date: dateFilter, page }],
    queryFn: () => ticketService.getTickets({ search, status: statusFilter || undefined, event_id: eventFilter || undefined, date: dateFilter || undefined, page, limit: 20 } as any).then((r) => r.data),
  })

  // Data for Select Dropdowns
  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users', 'all'],
    queryFn: () => userService.getUsers({ limit: 100 }).then((r) => r.data),
    enabled: showGrantModal,
  })

  const { data: eventsData } = useQuery({
    queryKey: ['admin', 'events', 'all', { status: '' }],
    queryFn: () => eventService.getEvents({ limit: 100, status: '' }).then((r) => r.data),
    enabled: showGrantModal,
  })

  const tickets = data?.data || []
  const users = usersData?.data || []
  const events = eventsData?.data || []

  // -------------- Seat Selection Logic ------------------ //
  const { data: allRoomsRes, isLoading: isRoomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomService.getRooms().then((r: any) => r.data),
    enabled: showGrantModal,
  })

  const { data: soldSeatsRes } = useQuery({
    queryKey: ['sold-seats', grantForm.event_id],
    queryFn: () => orderService.getSoldSeats(grantForm.event_id).then((r: any) => r.data),
    enabled: showGrantModal && !!grantForm.event_id,
  })

  const soldSeats: string[] = Array.isArray(soldSeatsRes?.data) ? soldSeatsRes.data : []
  const selectedEvent = events.find((e: any) => e.id === grantForm.event_id || e._id === grantForm.event_id)
  
  const eventRoom = useMemo(() => {
    if (!selectedEvent || !allRoomsRes) return null
    const roomsArray = Array.isArray(allRoomsRes) ? allRoomsRes : (allRoomsRes as any).data || []
    return roomsArray.find((r: any) => r.events?.some((e: any) => e.id === selectedEvent.id || e._id === selectedEvent.id)) as Room | null
  }, [selectedEvent, allRoomsRes])

  const ticketTypes = selectedEvent?.ticket_types || []

  const processedRoom = useMemo(() => {
    if (!eventRoom || !grantForm.event_id) return null

    // For manual grant, we just check if the selected ticket type is valid for seats
    const newSeats = eventRoom.seats.map(s => {
       if (!s.isActive) return s;

       const eventLocks = (s as any).locks?.filter((l: any) => l.eventId === grantForm.event_id) || [];
       if (eventLocks.length > 0) {
           const hasGeneralEventLock = eventLocks.some((l: any) => !l.ticketTypeId)
           if (hasGeneralEventLock) return { ...s, isActive: false }
           
           // If seat locked to specific types, check if the admin selected that type
           if (grantForm.ticket_type_id) {
             const isMatchedToCart = eventLocks.some((l: any) => l.ticketTypeId === grantForm.ticket_type_id)
             if (isMatchedToCart) return { ...s, isActive: true }
           }
           return { ...s, isActive: false }
       }
       return s; // available to anyone if no specific lock
    })

    return { ...eventRoom, seats: newSeats }
  }, [eventRoom, grantForm.ticket_type_id, grantForm.event_id])

  const handleSeatToggle = (seat: Seat) => {
    if (!grantForm.ticket_type_id) {
       toast.error("Vui lòng chọn loại vé trước khi chọn ghế")
       return
    }

    setSelectedSeats(prev => {
      const existingSelection = prev.find(s => s.seat.id === seat.id)
      
      if (existingSelection) {
        return prev.filter(s => s.seat.id !== seat.id)
      } else {
        const currentSelectedQtyForType = prev.filter(s => s.ticketTypeId === grantForm.ticket_type_id).length
        if (currentSelectedQtyForType >= grantForm.quantity) {
             toast.info(`Bạn chỉ đang cấp ${grantForm.quantity} vé loại này, không thể chọn thêm ghế.`)
             return prev
        }
        return [...prev, { seat, ticketTypeId: grantForm.ticket_type_id }]
      }
    })
  }

  // -------------- End Seat Selection Logic ------------------ //

  const statusColors: Record<string, string> = {
    valid: 'bg-green-500/10 text-green-600 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    used: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  // Grant Mutation
  const grantTicketMutation = useMutation({
    mutationFn: async () => {
      const tt = ticketTypes.find((t: any) => t.id === grantForm.ticket_type_id || t._id === grantForm.ticket_type_id)
      if (!tt) throw new Error('Vui lòng chọn loại vé')

      const payload: any = {
        event_id: grantForm.event_id,
        event_snapshot: selectedEvent,
        payment_method: 'free',
        items: [
          {
            ticket_type_id: tt.id || tt._id,
            ticket_type_name: tt.name,
            quantity: grantForm.quantity,
            unit_price: tt.price,
          }
        ]
      }

      if (grantTab === 'system') {
        payload.user_id = grantForm.user_id;
      } else {
        payload.buyer_info = {
          fullName: grantForm.guest_name,
          email: grantForm.guest_email
        };
      }

      const hasSelectableSeats = eventRoom && processedRoom?.seats?.some(s => s.isActive)
      if (hasSelectableSeats && selectedSeats.length > 0) {
        payload.seat_assignments = selectedSeats.map(s => ({
          roomName: eventRoom?.name || 'Phòng chiếu',
          row: s.seat.row,
          number: s.seat.number,
          ticket_type_id: s.ticketTypeId
        }))
      }

      return orderService.createOrder(payload)
    },
    onSuccess: () => {
      toast.success('Cấp vé thành công!')
      setShowGrantModal(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] })
      setGrantForm({ user_id: '', guest_name: '', guest_email: '', event_id: '', ticket_type_id: '', quantity: 1 })
      setSelectedSeats([])
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Có lỗi khi cấp vé. Thử lại sau.')
    }
  })

  const handleGrant = () => {
    if (!grantForm.event_id || !grantForm.ticket_type_id || grantForm.quantity < 1) {
      toast.error('Vui lòng điền đủ thông tin sự kiện, loại vé và số lượng')
      return
    }

    if (grantTab === 'system' && !grantForm.user_id) {
      toast.error('Vui lòng chọn người dùng nhận vé')
      return
    }

    if (grantTab === 'email' && (!grantForm.guest_name || !grantForm.guest_email)) {
      toast.error('Vui lòng nhập tên và email khách mời')
      return
    }
    
    // Basic email validation
    if (grantTab === 'email' && !/^\S+@\S+\.\S+$/.test(grantForm.guest_email)) {
      toast.error('Email khách mời không hợp lệ')
      return
    }

    const hasSelectableSeats = eventRoom && processedRoom?.seats?.some(s => s.isActive)
    if (hasSelectableSeats && selectedSeats.length !== grantForm.quantity) {
      toast.error(`Vui lòng chọn đủ ${grantForm.quantity} ghế trên sơ đồ cho số lượng vé.`)
      return
    }

    grantTicketMutation.mutate()
  }

  // Delete Order Mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => orderService.deleteOrder(orderId),
    onSuccess: () => {
      toast.success('Xóa đơn hàng thành công!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] })
    },
    onError: () => toast.error('Có lỗi xảy ra khi xóa đơn hàng')
  })

  // Edit Ticket Mutation
  const updateTicketMutation = useMutation({
    mutationFn: () => {
      const payload: any = { status: editForm.status }
      if (editForm.seat_row && editForm.seat_number) {
        payload.seatSnapshot = {
          ...editingTicket.seat,
          row: editForm.seat_row,
          number: parseInt(editForm.seat_number)
        }
      }
      return ticketService.updateTicket(editingTicket.id, payload)
    },
    onSuccess: () => {
      toast.success('Cập nhật vé thành công!')
      setEditingTicket(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] })
    },
    onError: () => toast.error('Có lỗi xảy ra khi cập nhật vé')
  })

  const handleDeleteOrder = (orderId: string) => {
    if (!orderId) {
      toast.error('Lỗi: Vé này không thuộc đơn hàng nào')
      return
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ đơn hàng và TẤT CẢ vé trong đơn này không? Chỗ ngồi sẽ được giải phóng.')) {
      deleteOrderMutation.mutate(orderId)
    }
  }

  // Bulk Update/Delete Mutations
  const bulkUpdateMutation = useMutation({
    mutationFn: (status: string) => ticketService.bulkUpdateTickets(selectedTickets, status),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái vé hàng loạt thành công!')
      setSelectedTickets([])
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] })
    },
    onError: () => toast.error('Có lỗi xảy ra khi cập nhật vé hàng loạt')
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: () => ticketService.bulkDeleteTickets(selectedTickets),
    onSuccess: () => {
      toast.success('Xóa vé hàng loạt thành công!')
      setSelectedTickets([])
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] })
    },
    onError: () => toast.error('Có lỗi xảy ra khi xóa vé hàng loạt')
  })

  // Checkbox Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && tickets) {
      setSelectedTickets(tickets.map((t: any) => t.id || t._id))
    } else {
      setSelectedTickets([])
    }
  }

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, ticketId: string) => {
    if (e.target.checked) {
      setSelectedTickets(prev => [...prev, ticketId])
    } else {
      setSelectedTickets(prev => prev.filter(id => id !== ticketId))
    }
  }

  const handleBulkUpdateStatus = (status: string) => {
    if (selectedTickets.length === 0) return
    if (window.confirm(`Bạn muốn chuyển trạng thái ${selectedTickets.length} vé đã chọn thành Hành động này?`)) {
      bulkUpdateMutation.mutate(status)
    }
  }

  const handleBulkDelete = () => {
    if (selectedTickets.length === 0) return
    if (window.confirm(`Bạn CÓ CHẮC CHẮN muốn xóa vĩnh viễn ${selectedTickets.length} vé đã chọn? Hành động này không thể hoàn tác.`)) {
      bulkDeleteMutation.mutate()
    }
  }

  const openEditModal = (t: any) => {
    setEditingTicket(t)
    setEditForm({
      status: t.status,
      seat_row: t.seat?.row || '',
      seat_number: t.seat?.number?.toString() || ''
    })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý đơn hàng (Vé đã bán)</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh sách tất cả các vé khách hàng đã mua hoặc được cấp</p>
        </div>
        <Button onClick={() => setShowGrantModal(true)} className="gap-2 shrink-0">
          <Plus className="size-4" /> Cấp vé
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm mã vé, tên, email..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
        </div>

        <Select value={eventFilter} onChange={(v) => { setEventFilter(v); setPage(1) }}
          placeholder="Tất cả sự kiện" className="w-full sm:w-48"
          options={[
            { value: '', label: 'Tất cả sự kiện' },
            ...events.map((e: any) => ({ value: e.id || e._id, label: e.title }))
          ]} />

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
          className="h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm w-full sm:w-40 cursor-pointer"
        />
        <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }}
          placeholder="Tất cả trạng thái" className="w-48"
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'valid', label: 'Hợp lệ' },
            { value: 'pending', label: 'Chờ thanh toán' },
            { value: 'used', label: 'Đã sử dụng' },
            { value: 'cancelled', label: 'Đã hủy' },
          ]} />
      </div>

      {/* Bulk Actions Bar */}
      {selectedTickets.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="text-sm font-medium text-primary">
            Đã chọn <span className="font-bold">{selectedTickets.length}</span> vé
          </div>
          <div className="flex items-center gap-2">
            <Select
              value=""
              onChange={handleBulkUpdateStatus}
              placeholder="Đổi trạng thái..."
              className="w-40 bg-white"
              options={[
                { value: '', label: 'Đổi trạng thái...' },
                { value: 'valid', label: 'Hợp lệ' },
                { value: 'used', label: 'Đã sử dụng' },
                { value: 'cancelled', label: 'Đã hủy' },
              ]}
            />
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 gap-1.5" onClick={handleBulkDelete}>
              <Trash2 className="size-4" /> Xóa
            </Button>
          </div>
        </div>
      )}

      {/* Desktop */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="w-12 p-3 text-center">
              <input
                type="checkbox"
                className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                checked={tickets?.length > 0 && selectedTickets.length === tickets.length}
                onChange={handleSelectAll}
              />
            </th>
            <th className="text-left p-3 font-medium">Mã vé</th>
            <th className="text-left p-3 font-medium">Người mua</th>
            <th className="text-left p-3 font-medium">T.Tin Vé & Chỗ</th>
            <th className="text-left p-3 font-medium">Sự kiện</th>
            <th className="text-left p-3 font-medium">Trạng thái</th>
            <th className="text-left p-3 font-medium">Ngày tạo</th>
            <th className="text-center p-3 font-medium">Hành động</th>
          </tr></thead>
          <tbody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />) :
              tickets.map((t: any) => (
                <tr key={t.id || t.ticket_code} className={cn("border-b border-border last:border-0 hover:bg-muted/30 transition-colors", selectedTickets.includes(t.id || t._id) && "bg-primary/5 hover:bg-primary/10")}>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      checked={selectedTickets.includes(t.id || t._id)}
                      onChange={(e) => handleSelectOne(e, t.id || t._id)}
                    />
                  </td>
                  <td className="p-3 font-mono text-xs max-w-[120px] truncate" title={t.order_id ? `Đơn ID: ${t.order_id}` : ''}>{t.ticket_code}</td>
                  <td className="p-3">
                    <p className="font-medium text-xs truncate max-w-[150px]">{t.buyer?.full_name || '—'}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{t.buyer?.email}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-xs">{t.ticket_type?.name || '—'}</p>
                    {t.seat && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">{t.seat.room} • {t.seat.row} - Số {t.seat.number}</span>}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">{t.event?.title || '—'}</td>
                  <td className="p-3"><span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', statusColors[t.status])}>{t.status}</span></td>
                  <td className="p-3 text-muted-foreground text-xs">{t.created_at ? formatDateTime(t.created_at) : '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEditModal(t)} className="text-blue-500 hover:text-blue-600 bg-blue-500/10 p-1.5 rounded" title="Sửa trạng thái & chỗ ngồi">
                        <Edit2 className="size-4" />
                      </button>
                      <button onClick={() => handleDeleteOrder(t.order_id)} className="text-red-500 hover:text-red-600 bg-red-500/10 p-1.5 rounded" title="Xóa toàn bộ đơn">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {tickets.map((t: any) => (
          <div key={t.id || t.ticket_code} className={cn("bg-card border rounded-xl p-4 transition-colors", selectedTickets.includes(t.id || t._id) ? "border-primary bg-primary/5" : "border-border")}>
            <div className="flex items-start gap-3">
              <div className="pt-1 shrink-0">
                <input
                  type="checkbox"
                  className="rounded border-input text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                  checked={selectedTickets.includes(t.id || t._id)}
                  onChange={(e) => handleSelectOne(e, t.id || t._id)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs">{t.ticket_code} {t.order_id && <span className="text-muted-foreground/50 text-[10px]">(Đơn: {t.order_id.substring(0, 6)}...)</span>}</p>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <span className="font-medium">{t.buyer?.full_name || '—'}</span>
                  {t.buyer?.email && <span className="text-muted-foreground text-[10px]">({t.buyer.email})</span>}
                </div>
                <p className="text-sm font-medium mt-1 truncate">{t.event?.title || '—'}</p>
                <p className="text-xs text-muted-foreground">{t.ticket_type?.name || '—'} {t.seat && `• ${t.seat.room} ${t.seat.row} - Số ${t.seat.number}`}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn('shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border', statusColors[t.status])}>{t.status}</span>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => openEditModal(t)} className="text-blue-500 bg-blue-500/10 p-1.5 rounded">
                    <Edit2 className="size-3" />
                  </button>
                  <button onClick={() => handleDeleteOrder(t.order_id)} className="text-red-500 bg-red-500/10 p-1.5 rounded">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grant Ticket Modal */}
      <Modal isOpen={showGrantModal} onClose={() => setShowGrantModal(false)} title="Cấp vé thủ công" size={eventRoom && processedRoom?.seats?.some(s => s.isActive) ? "lg" : "md"}>
        <div className={`flex flex-col ${eventRoom && processedRoom?.seats?.some(s => s.isActive) ? 'md:flex-row' : ''} gap-6 ${eventRoom && processedRoom?.seats?.some(s => s.isActive) ? 'h-[75vh] md:h-auto' : ''} overflow-hidden pt-2`}>
          
          <div className={`${eventRoom && processedRoom?.seats?.some(s => s.isActive) ? 'flex-[1.2] border-r border-border pr-6' : 'w-full'} overflow-y-auto custom-scrollbar`}>
            {/* Tabs */}
            <div className="flex space-x-2 border-b border-border mb-4">
              <button
                onClick={() => setGrantTab('system')}
                className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                  grantTab === 'system' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Cấp qua username
              </button>
              <button
                onClick={() => setGrantTab('email')}
                className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                  grantTab === 'email' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Cấp qua mail
              </button>
            </div>

            {grantTab === 'system' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Người dùng nhận vé</label>
                <SearchableSelect
                  value={grantForm.user_id}
                  onChange={v => setGrantForm(f => ({ ...f, user_id: v }))}
                  placeholder="-- Chọn khách hàng --"
                  searchPlaceholder="Tìm kiếm tên, email, SDT..."
                  options={[
                    ...users.map((u: any) => ({ value: u.id, label: `${u.full_name} (${u.email})` })),
                  ]}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên khách mời</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={grantForm.guest_name}
                    onChange={e => setGrantForm(f => ({ ...f, guest_name: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email gửi vé</label>
                  <input
                    type="email"
                    placeholder="nguyenvana@gmail.com"
                    value={grantForm.guest_email}
                    onChange={e => setGrantForm(f => ({ ...f, guest_email: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
              </div>
            )}

            <div className="border-t border-border/50 pt-4 mt-2">
              <div>
                <label className="block text-sm font-medium mb-1">Sự kiện</label>
                <SearchableSelect
                  value={grantForm.event_id}
                  onChange={v => {
                     setGrantForm(f => ({ ...f, event_id: v, ticket_type_id: '' }))
                     setSelectedSeats([])
                  }}
                  placeholder="-- Chọn sự kiện --"
                  searchPlaceholder="Tìm kiếm sự kiện..."
                  options={[
                    ...events.map((e: any) => ({ value: e.id, label: e.title })),
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Loại vé</label>
                <SearchableSelect
                  value={grantForm.ticket_type_id}
                  onChange={v => {
                     setGrantForm(f => ({ ...f, ticket_type_id: v }))
                     setSelectedSeats([]) // Reset seat selection if ticket type changes
                  }}
                  placeholder="-- Chọn loại vé --"
                  searchPlaceholder="Tìm loại vé..."
                  options={[
                    ...ticketTypes.map((tt: any) => {
                      const ttId = tt.id || tt._id;
                      return { value: ttId, label: `${tt.name} - ${tt.price.toLocaleString('vi-VN')}đ (Còn: ${tt.quantity_total})` }
                    }),
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số lượng vé muốn cấp</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={grantForm.quantity}
                  onChange={e => {
                      const qty = parseInt(e.target.value) || 1
                      setGrantForm(f => ({ ...f, quantity: qty }))
                      // Retain only seats up to the new quantity
                      setSelectedSeats(prev => prev.slice(0, qty))
                  }}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm text-center font-medium"
                />
              </div>
            </div>

            <div className="pt-6 flex gap-3">
              <Button
                onClick={handleGrant}
                loading={grantTicketMutation.isPending}
                className="flex-1"
                disabled={Boolean(eventRoom && processedRoom?.seats?.some(s => s.isActive) && selectedSeats.length !== grantForm.quantity)}
              >
                Cấp ngay
              </Button>
              <Button variant="outline" onClick={() => setShowGrantModal(false)} className="flex-1">
                Hủy
              </Button>
            </div>
          </div>

          {/* Right side Seat Map for granting tickets */}
          {eventRoom && processedRoom?.seats?.some(s => s.isActive) && (
            <div className="flex-[1.5] flex flex-col items-center bg-muted/20 border border-border rounded-xl p-4 overflow-y-auto custom-scrollbar relative">
              <div className="w-full flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Sơ đồ ghế ngồi</h3>
                  {grantForm.ticket_type_id ? (
                      <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${selectedSeats.length === grantForm.quantity ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                          Đã chọn {selectedSeats.length} / {grantForm.quantity} ghế
                      </span>
                  ) : (
                      <span className="text-xs bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full font-medium border border-amber-500/20">
                          Hãy chọn loại vé trước
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
                    maxSelectable={grantForm.quantity} 
                    soldSeats={soldSeats}
                  />
                )}
            </div>
          )}

        </div>
      </Modal>

      {/* Edit Ticket Modal */}
      <Modal isOpen={!!editingTicket} onClose={() => setEditingTicket(null)} title="Sửa vé Khách hàng">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái vé</label>
            <Select
              value={editForm.status}
              onChange={v => setEditForm(f => ({ ...f, status: v }))}
              options={[
                { value: 'valid', label: 'Hợp lệ (valid)' },
                { value: 'pending', label: 'Chờ TT (pending)' },
                { value: 'used', label: 'Đã sử dụng (used)' },
                { value: 'cancelled', label: 'Đã hủy (cancelled)' },
              ]}
            />
            <p className="text-xs text-muted-foreground mt-1">Lưu ý: Hủy vé sẽ giải phóng chỗ ngồi này cho người khác.</p>
          </div>

          {editingTicket?.seat && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Hàng ghế (Row)</label>
                <input
                  type="text"
                  value={editForm.seat_row}
                  onChange={e => setEditForm(f => ({ ...f, seat_row: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số ghế (Number)</label>
                <input
                  type="number"
                  value={editForm.seat_number}
                  onChange={e => setEditForm(f => ({ ...f, seat_number: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm"
                  min={1}
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <Button
              onClick={() => updateTicketMutation.mutate()}
              loading={updateTicketMutation.isPending}
              className="flex-1"
            >
              Cập nhật
            </Button>
            <Button variant="outline" onClick={() => setEditingTicket(null)} className="flex-1">
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
