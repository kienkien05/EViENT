import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Edit, Trash2, Ticket, Save, X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { eventService } from '@/services'
import { Skeleton, TableRowSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

interface TicketTypeForm {
  id?: string
  name: string
  description: string
  price: number
  original_price: number
  quantity_total: number
}

const emptyTicket: TicketTypeForm = {
  name: '', description: '', price: 0, original_price: 0, quantity_total: 100,
}

export default function AdminTicketsPage() {
  const [search, setSearch] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  
  // Modal states for creating/editing a ticket type
  const [showModal, setShowModal] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [ticketForm, setTicketForm] = useState<TicketTypeForm>({ ...emptyTicket })

  const queryClient = useQueryClient()

  // 1. Fetch all events (we need all to allow selecting one to manage its tickets)
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin', 'events', 'all', { status: '' }],
    queryFn: () => eventService.getEvents({ limit: 100, status: '' }).then((r) => r.data),
  })

  // 2. Fetch specific event details if an event is selected
  const { data: eventDetailRes, isLoading: isLoadingEventDetail } = useQuery({
    queryKey: ['admin', 'event', selectedEventId],
    queryFn: () => eventService.getEventById(selectedEventId).then(r => r.data),
    enabled: !!selectedEventId,
  })

  const events = eventsData?.data || []
  
  // Filter events by search term for the sidebar/list
  const filteredEvents = events.filter((e: any) => 
    e.title.toLowerCase().includes(search.toLowerCase())
  )

  const selectedEvent = eventDetailRes?.data
  const ticketTypes = selectedEvent?.ticket_types || []

  // Mutation to save changes to ticket types
  const saveEventMutation = useMutation({
    mutationFn: (updatedTicketTypes: any[]) => {
      // Create a payload that updates only the ticket_types of the event
      return eventService.updateEvent(selectedEventId, { ticket_types: updatedTicketTypes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', selectedEventId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'events', 'all'] })
      setShowModal(false)
      toast.success('Đã lưu thay đổi loại vé thành công')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Có lỗi khi lưu thay đổi. Thử lại sau.')
    }
  })

  // Set selected event automatically if not set and events are loaded
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id)
    }
  }, [events, selectedEventId])

  const openCreate = () => {
    setEditingIndex(null)
    setTicketForm({ ...emptyTicket })
    setShowModal(true)
  }

  const openEdit = (tt: any, index: number) => {
    setEditingIndex(index)
    setTicketForm({
      id: tt.id,
      name: tt.name || '',
      description: tt.description || '',
      price: tt.price || 0,
      original_price: tt.original_price || 0,
      quantity_total: tt.quantity_total || 0,
    })
    setShowModal(true)
  }

  const handleDelete = (index: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa loại vé này? Những vé đã bán vẫn sẽ tồn tại nhưng không thể mua mới.')) {
      const newTicketTypes = [...ticketTypes]
      newTicketTypes.splice(index, 1)
      saveEventMutation.mutate(newTicketTypes)
    }
  }

  const handleToggleVisibility = (index: number) => {
    const newTicketTypes = [...ticketTypes]
    const current = newTicketTypes[index]
    newTicketTypes[index] = {
      ...current,
      status: current.status === 'hidden' ? 'active' : 'hidden'
    }
    saveEventMutation.mutate(newTicketTypes)
  }

  const handleSaveModal = () => {
    if (!ticketForm.name.trim()) {
      toast.error('Vui lòng nhập tên vé')
      return
    }

    const newTicketTypes = [...ticketTypes]
    if (editingIndex !== null) {
      newTicketTypes[editingIndex] = { ...newTicketTypes[editingIndex], ...ticketForm }
    } else {
      newTicketTypes.push(ticketForm)
    }

    saveEventMutation.mutate(newTicketTypes)
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-6">
      
      {/* Sidebar: Event List */}
      <div className="w-full md:w-80 flex flex-col bg-card border border-border rounded-xl overflow-hidden shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg mb-4">Chọn sự kiện</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Tìm sự kiện..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {isLoadingEvents ? (
            <div className="p-4 opacity-50 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center p-4 text-sm text-muted-foreground">Không tìm thấy sự kiện nào</div>
          ) : (
            filteredEvents.map((event: any) => (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group",
                  selectedEventId === event.id 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="truncate pr-2">{event.title}</span>
                {event.ticket_types?.length > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                    selectedEventId === event.id ? "bg-primary/20" : "bg-muted-foreground/20 group-hover:bg-muted-foreground/30"
                  )}>
                    {event.ticket_types.length}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Ticket Types list for the selected event */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden min-h-[400px]">
        {!selectedEventId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <Ticket className="size-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Quản lý các loại vé</h3>
            <p className="text-sm mt-1 max-w-sm">Chọn một sự kiện từ danh sách bên trái để xem và quản lý các loại vé của sự kiện đó.</p>
          </div>
        ) : isLoadingEventDetail ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3 mb-6" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !selectedEvent ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Lỗi khi tải thông tin sự kiện
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold truncate max-w-lg" title={selectedEvent.title}>
                  Các loại vé: {selectedEvent.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tổng cộng {ticketTypes.length} loại vé
                </p>
              </div>
              <Button onClick={openCreate} className="gap-2 shrink-0">
                <Plus className="size-4" /> Thêm loại vé
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
              {ticketTypes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
                  <Ticket className="size-12 mb-4 opacity-20" />
                  <p className="font-medium">Sự kiện này chưa có loại vé nào</p>
                  <Button variant="outline" onClick={openCreate} className="mt-4 gap-2">
                    <Plus className="size-4" /> Tạo loại vé đầu tiên
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {ticketTypes.map((tt: any, index: number) => (
                    <div key={tt.id || index} className={cn(
                      'bg-background border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow',
                      tt.status === 'hidden' ? 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5' : 'border-border'
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-lg truncate flex items-center gap-2">
                            {tt.name}
                            {tt.status === 'hidden' && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded">Đang ẩn</span>
                            )}
                            {tt.quantity_sold >= tt.quantity_total && tt.status !== 'hidden' && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive px-2 py-0.5 rounded">Hết vé</span>
                            )}
                          </h3>
                          {tt.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tt.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleToggleVisibility(index)}
                            loading={saveEventMutation.isPending}
                            className={cn(
                              'h-8 w-8',
                              tt.status === 'hidden'
                                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            title={tt.status === 'hidden' ? 'Hiện loại vé trên trang bán' : 'Ẩn loại vé (chỉ dùng cấp thủ công)'}
                          >
                            {tt.status === 'hidden' ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(tt, index)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Edit className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(index)} loading={saveEventMutation.isPending} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Giá bán</p>
                          <p className="font-bold text-primary">{Number(tt.price).toLocaleString('vi-VN')} đ</p>
                          {tt.original_price > tt.price && (
                            <p className="text-xs text-muted-foreground line-through mt-0.5">{Number(tt.original_price).toLocaleString('vi-VN')} đ</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Số lượng</p>
                          <div className="flex items-end gap-1.5">
                            <p className="font-semibold">{tt.quantity_sold || 0}</p>
                            <p className="text-xs text-muted-foreground font-normal pb-[2px]">
                              / {tt.quantity_total === -1 ? 'Không giới hạn' : tt.quantity_total}
                            </p>
                          </div>
                          {tt.quantity_total !== -1 && (
                            <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all" 
                                style={{ width: `${Math.min(100, ((tt.quantity_sold || 0) / Math.max(1, tt.quantity_total)) * 100)}%` }} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Cập nhật */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingIndex !== null ? 'Sửa loại vé' : 'Thêm loại vé mới'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên loại vé <span className="text-destructive">*</span></label>
            <input 
              value={ticketForm.name} 
              onChange={e => setTicketForm(f => ({ ...f, name: e.target.value }))}
              placeholder="VD: Vé VIP, Vé thường..."
              className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Giá bán (VNĐ) <span className="text-destructive">*</span></label>
              <input 
                type="number" min={0} 
                value={ticketForm.price} 
                onChange={e => setTicketForm(f => ({ ...f, price: Number(e.target.value) }))}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Giá gốc (VNĐ)</label>
              <input 
                type="number" min={0} 
                value={ticketForm.original_price} 
                onChange={e => setTicketForm(f => ({ ...f, original_price: Number(e.target.value) }))}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" 
              />
              <p className="text-[10px] text-muted-foreground mt-1">(Tùy chọn) Giá trước khi giảm</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tổng số lượng vé phát hành<span className="text-destructive">*</span></label>
            <input 
              type="number" min={-1} 
              value={ticketForm.quantity_total} 
              onChange={e => setTicketForm(f => ({ ...f, quantity_total: Number(e.target.value) }))}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả chi tiết</label>
            <textarea 
              value={ticketForm.description} 
              onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="VD: Bao gồm 1 thức uống, vị trí ngồi gần sân khấu..."
              className="w-full p-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm resize-none custom-scrollbar" 
            />
          </div>

          <div className="pt-4 flex gap-3 border-t border-border">
            <Button 
              onClick={handleSaveModal} 
              loading={saveEventMutation.isPending} 
              className="flex-1 gap-2"
            >
              <Save className="size-4" /> Lưu loại vé
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
              Hủy
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
