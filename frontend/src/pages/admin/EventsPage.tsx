import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Edit, Trash2, Calendar, Ticket, Image,
  DoorOpen, X, ChevronRight, Upload, LoaderIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { eventService, roomService, bannerService, uploadService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ==================== Types ====================

interface TicketTypeForm {
  id?: string
  name: string
  description: string
  price: number
  original_price: number
  quantity_total: number
  quantity_sold: number
  max_per_user: number
}

interface EventForm {
  title: string
  description: string
  content: string
  location: string
  category: string
  status: string
  start_time: string
  end_time: string
  banner_image: string
  sub_banners: string[]
  show_sub_banners: boolean
  max_tickets_per_user: number
  room_ids: string[]
  ticket_types: TicketTypeForm[]
}

interface BannerForm {
  title: string
  image_url: string
  link_url: string
  priority: number
  is_active: boolean
}

const emptyForm: EventForm = {
  title: '', description: '', content: '', location: '', category: '',
  status: 'draft', start_time: '', end_time: '', banner_image: '', sub_banners: [],
  show_sub_banners: true,
  max_tickets_per_user: 10,
  room_ids: [], ticket_types: [],
}

const emptyTicket: TicketTypeForm = {
  name: '', description: '', price: 0, original_price: 0, quantity_total: 100, quantity_sold: 0, max_per_user: -1,
}

const emptyBanner: BannerForm = {
  title: '', image_url: '', link_url: '', priority: 0, is_active: true,
}

const tabs = [
  { id: 'info', label: 'Thông tin', icon: Calendar },
  { id: 'tickets', label: 'Loại vé', icon: Ticket },
  { id: 'rooms', label: 'Phòng', icon: DoorOpen },
  { id: 'sub_banners', label: 'Ảnh phụ', icon: Image },
] as const

type TabId = typeof tabs[number]['id']

// ==================== Main Component ====================

// Helper to convert DB ISO string to local input format "YYYY-MM-DDTHH:mm"
const toLocalDatetimeInput = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Helper to convert local input format "YYYY-MM-DDTHH:mm" to DB ISO string
const toUtcIsoString = (localStr: string) => {
  if (!localStr) return '';
  const d = new Date(localStr);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

export default function AdminEventsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [form, setForm] = useState<EventForm>({ ...emptyForm })
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const queryClient = useQueryClient()

  // Fetch events
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', { search, page }],
    queryFn: () => eventService.getEvents({ search, page, limit: 20, status: '' }).then(r => r.data),
  })

  // Fetch rooms for selection
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomService.getRooms().then(r => r.data),
  })

  const rooms = roomsData?.data || []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'events'] }); toast.success('Đã xóa sự kiện') },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Lỗi khi xóa sự kiện')
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: string, status: string }) => eventService.updateEvent(data.id, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      toast.success('Đã cập nhật trạng thái sự kiện')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Lỗi cập nhật trạng thái')
    }
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editEvent ? eventService.updateEvent(editEvent.id, data) : eventService.createEvent(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      setShowModal(false)
      toast.success(editEvent ? 'Đã cập nhật sự kiện' : 'Đã tạo sự kiện')
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Lỗi khi lưu sự kiện')
    }
  })


  const openCreate = () => {
    setEditEvent(null)
    setForm({ ...emptyForm })
    setActiveTab('info')
    setShowModal(true)
  }

  const openEdit = (e: any) => {
    setEditEvent(e)
    setForm({
      title: e.title || '',
      description: e.description || '',
      content: e.content || '',
      location: e.location || '',
      category: e.category || '',
      status: e.status || 'draft',
      start_time: toLocalDatetimeInput(e.start_time),
      end_time: toLocalDatetimeInput(e.end_time),
      banner_image: e.banner_image || '',
      sub_banners: e.sub_banners || [],
      show_sub_banners: e.show_sub_banners !== false,
      max_tickets_per_user: e.max_tickets_per_user || 10,
      room_ids: e.room_ids || [],
      ticket_types: (e.ticket_types || []).map((tt: any) => ({
        id: tt.id,
        name: tt.name || '',
        description: tt.description || '',
        price: tt.price || 0,
        original_price: tt.original_price || 0,
        quantity_total: tt.quantity_total ?? 0,
        quantity_sold: tt.quantity_sold || 0,
        max_per_user: tt.max_per_user ?? e.max_tickets_per_user ?? 10,
      })),
    })

    setActiveTab('info')
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tên sự kiện')
      setActiveTab('info')
      return
    }

    // Convert local datetime strings to strict UTC ISO strings before sending
    const payload = {
      ...form,
      start_time: toUtcIsoString(form.start_time),
      end_time: toUtcIsoString(form.end_time),
    }

    saveMutation.mutate(payload)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)

    try {
      const res = await uploadService.upload(file, 'events')
      if (res.data?.success) {
        setForm(f => ({
          ...f,
          banner_image: res.data.data.url
        }))
        toast.success('Tải ảnh lên thành công')
      }
    } catch (err) {
      toast.error('Lỗi tải ảnh')
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleSubBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)

    try {
      const res = await uploadService.upload(file, 'events')
      const url = res.data?.data?.url || res.data?.url
      if (url) {
        setForm(f => ({
          ...f,
          sub_banners: [...f.sub_banners, url]
        }))
        toast.success('Tải ảnh phụ lên thành công')
      } else {
        console.error('Upload response:', res.data)
        toast.error('Upload thành công nhưng không nhận được URL ảnh')
      }
    } catch (err: any) {
      console.error('Sub-banner upload error:', err)
      toast.error(err?.response?.data?.message || 'Lỗi tải ảnh phụ')
    } finally {
      setUploadingBanner(false)
      // Reset file input so the same file can be uploaded again
      e.target.value = ''
    }
  }

  const removeSubBanner = (idx: number) => {
    setForm(f => ({
      ...f,
      sub_banners: f.sub_banners.filter((_, i) => i !== idx)
    }))
  }

  const addTicketType = () => {
    setForm(f => ({ ...f, ticket_types: [...f.ticket_types, { ...emptyTicket }] }))
  }

  const removeTicketType = (idx: number) => {
    setForm(f => ({ ...f, ticket_types: f.ticket_types.filter((_, i) => i !== idx) }))
  }

  const updateTicketType = (idx: number, field: keyof TicketTypeForm, value: any) => {
    setForm(f => ({
      ...f,
      ticket_types: f.ticket_types.map((tt, i) => i === idx ? { ...tt, [field]: value } : tt),
    }))
  }

  const toggleRoom = (roomId: string) => {
    setForm(f => ({
      ...f,
      room_ids: f.room_ids.includes(roomId)
        ? f.room_ids.filter(id => id !== roomId)
        : [...f.room_ids, roomId],
    }))
  }

  const events = data?.data || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Quản lý sự kiện</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate} className="gap-2 text-xs sm:text-sm"><Plus className="size-4" /> Tạo sự kiện</Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text" placeholder="Tìm kiếm..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-medium">Tên sự kiện</th>
            <th className="text-left p-3 font-medium">Danh mục</th>
            <th className="text-left p-3 font-medium">Trạng thái</th>
            <th className="text-left p-3 font-medium">Ngày bắt đầu</th>
            <th className="text-right p-3 font-medium">Thao tác</th>
          </tr></thead>
          <tbody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />) :
              events.map((e: any) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium max-w-[200px] truncate">
                    <div className="flex items-center gap-1.5">
                      {e.title}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{e.category || '—'}</td>
                  <td className="p-3">
                    <Select
                      value={e.status}
                      onChange={(v) => updateStatusMutation.mutate({ id: e.id, status: v })}
                      className="w-32"
                      options={[
                        { value: 'draft', label: 'Nháp' },
                        { value: 'published', label: 'Đã đăng' },
                        { value: 'cancelled', label: 'Đã hủy' },
                        { value: 'completed', label: 'Hoàn thành' },
                      ]}
                    />
                  </td>
                  <td className="p-3 text-muted-foreground">{e.start_time ? formatDate(e.start_time) : '—'}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Edit className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {events.map((e: any) => (
          <div key={e.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate flex items-center gap-1">
                  {e.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{e.category || 'Chưa phân loại'}</p>
              </div>
              <Select
                value={e.status}
                onChange={(v) => updateStatusMutation.mutate({ id: e.id, status: v })}
                className="w-32"
                options={[
                  { value: 'draft', label: 'Nháp' },
                  { value: 'published', label: 'Đã đăng' },
                  { value: 'cancelled', label: 'Đã hủy' },
                  { value: 'completed', label: 'Hoàn thành' },
                ]}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => openEdit(e)} className="flex-1 gap-1"><Edit className="size-3" /> Sửa</Button>
              <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(e.id)} className="gap-1"><Trash2 className="size-3 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* ==================== Create/Edit Modal with Tabs ==================== */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editEvent ? 'Sửa sự kiện' : 'Tạo sự kiện'} size="lg">
        {/* Tab Navigation */}
        <div className="flex border-b border-border -mx-6 px-6 mb-5 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
              {tab.id === 'tickets' && form.ticket_types.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{form.ticket_types.length}</span>
              )}
              {tab.id === 'rooms' && form.room_ids.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{form.room_ids.length}</span>
              )}
              {tab.id === 'sub_banners' && form.sub_banners.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{form.sub_banners.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* ===== Tab: Thông tin ===== */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Tên sự kiện *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Danh mục</label>
                  <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="Âm nhạc, Thể thao, ..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Địa điểm</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bắt đầu</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kết thúc</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm resize-none" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ảnh Banner</label>
                  {form.banner_image ? (
                    <div className="relative group rounded-lg overflow-hidden border border-border">
                      <img src={form.banner_image} className="w-full h-32 object-cover" alt="Banner" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer text-white flex items-center gap-1 text-sm hover:underline">
                          <Upload className="size-4" /> Đổi ảnh
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploadingBanner ? <LoaderIcon className="size-6 text-muted-foreground animate-spin mb-2" /> : <Upload className="size-6 text-muted-foreground mb-2" />}
                        <p className="text-xs text-muted-foreground">Nhấn để tải ảnh lên</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner} onChange={handleFileUpload} />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái (Khởi tạo)</label>
                  <Select value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}
                    options={[
                      { value: 'draft', label: 'Nháp' },
                      { value: 'published', label: 'Đã đăng' },
                      { value: 'cancelled', label: 'Đã hủy' },
                      { value: 'completed', label: 'Hoàn thành' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== Tab: Loại vé ===== */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {form.ticket_types.length === 0 ? 'Chưa có loại vé nào' : `${form.ticket_types.length} loại vé`}
                </p>
                <Button size="sm" variant="outline" onClick={addTicketType} className="gap-1.5">
                  <Plus className="size-3.5" /> Thêm loại vé
                </Button>
              </div>

              {form.ticket_types.map((tt, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Loại vé #{idx + 1}</span>
                    <button onClick={() => removeTicketType(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Tên vé *</label>
                      <input value={tt.name} onChange={e => updateTicketType(idx, 'name', e.target.value)}
                        placeholder="VD: Vé thường, VIP, ..."
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Giá (VNĐ) *</label>
                      <input type="number" min={0} value={tt.price} onChange={e => updateTicketType(idx, 'price', Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Giá gốc (VNĐ)</label>
                      <input type="number" min={0} value={tt.original_price} onChange={e => updateTicketType(idx, 'original_price', Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Số lượng phát hành (-1: Không giới hạn)</label>
                      <input type="number" min={-1} value={tt.quantity_total} onChange={e => updateTicketType(idx, 'quantity_total', Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Số lượt mua tối đa mỗi người</label>
                      <input type="number" min={-1} value={tt.max_per_user} onChange={e => updateTicketType(idx, 'max_per_user', Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Mô tả vé</label>
                      <input value={tt.description} onChange={e => updateTicketType(idx, 'description', e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
                    </div>
                  </div>
                </div>
              ))}

              {form.ticket_types.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="size-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nhấn "Thêm loại vé" để tạo vé cho sự kiện</p>
                </div>
              )}
            </div>
          )}

          {/* ===== Tab: Phòng ===== */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Chọn phòng cho sự kiện ({form.room_ids.length} đã chọn)
              </p>

              {rooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DoorOpen className="size-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có phòng nào. Hãy tạo phòng trước.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rooms.map((room: any) => {
                    const isSelected = form.room_ids.includes(room.id)
                    return (
                      <button
                        key={room.id}
                        onClick={() => toggleRoom(room.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        )}
                      >
                        <div>
                          <p className={cn('text-sm font-medium', isSelected && 'text-primary')}>{room.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {room.rows} hàng × {room.seats_per_row} ghế = {room.rows * room.seats_per_row} chỗ
                          </p>
                        </div>
                        <div className={cn(
                          'size-5 rounded-full border-2 flex items-center justify-center shrink-0',
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        )}>
                          {isSelected && <ChevronRight className="size-3 text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== Tab: Ảnh phụ ===== */}
          {activeTab === 'sub_banners' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ảnh phụ trình chiếu</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tải lên các ảnh phụ cho sự kiện, sẽ được hiển thị dạng slider trên trang chi tiết sự kiện.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Hiển thị slider:</span>
                    <Switch 
                      checked={form.show_sub_banners} 
                      onCheckedChange={(c: boolean) => setForm({ ...form, show_sub_banners: c })} 
                    />
                  </div>
                  <label className="cursor-pointer">
                     <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg shadow-sm border border-input bg-background hover:bg-muted hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                       {uploadingBanner ? <LoaderIcon className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Tải ảnh lên
                     </span>
                     <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner} onChange={handleSubBannerUpload} />
                  </label>
                </div>
              </div>

              {form.sub_banners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <Image className="size-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có ảnh phụ nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {form.sub_banners.map((url, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-border aspect-video">
                      <img src={url} className="w-full h-full object-cover" alt={`Sub-banner ${idx + 1}`} />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="icon" variant="destructive" onClick={() => removeSubBanner(idx)} className="size-8 rounded-full">
                           <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="mt-5 flex gap-3">
          <Button onClick={handleSave} loading={saveMutation.isPending} className="flex-1">
            {editEvent ? 'Cập nhật' : 'Tạo sự kiện'}
          </Button>
          <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Hủy</Button>
        </div>
      </Modal>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    published: 'bg-green-500/10 text-green-600 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  }
  const labels: Record<string, string> = { draft: 'Nháp', published: 'Đã đăng', cancelled: 'Đã hủy', completed: 'Hoàn thành' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[status] || ''}`}>{labels[status] || status}</span>
}
