import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, SquarePen, Trash2, Power, PowerOff, Armchair, Grid3X3, Ticket, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomService, eventService } from '@/services'

export interface Room {
    id: string
    name: string
    rows: number
    seatsPerRow: number
    isActive: boolean
    seats: Seat[]
    events?: { id: string; title: string }[]
    eventIds?: string[]
}

export interface Seat {
    id: string
    row: string
    number: number
    isActive: boolean
}

export default function AdminRoomsPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // UI States
    const [search, setSearch] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
    const [formData, setFormData] = useState({ name: '', rows: 10, seatsPerRow: 10 })
    
    // Seat editing states
    const [pendingSeats, setPendingSeats] = useState<Seat[]>([])
    const [pendingSeatLocks, setPendingSeatLocks] = useState<{id: string, eventId: string, ticketTypeId: string | null, action: 'add' | 'remove'}[]>([])
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
    const [lockEventId, setLockEventId] = useState<string>('global')
    const [lockTicketTypeId, setLockTicketTypeId] = useState<string>('all')
    const [isSaving, setIsSaving] = useState(false)

    // Data Fetching
    const { data: roomsData, isLoading: isRoomsLoading } = useQuery({
        queryKey: ['admin-rooms'],
        queryFn: async () => {
            const res = await roomService.getRooms()
            return res.data
        }
    })
    
    // Fallback if structure changes
    const rooms: Room[] = useMemo(() => {
        if (!roomsData) return []
        if (Array.isArray(roomsData)) return roomsData
        const rAny = roomsData as any
        if (rAny.data && Array.isArray(rAny.data)) return rAny.data
        return []
    }, [roomsData])

    const { data: eventsData, isLoading: isEventsLoading } = useQuery({
        queryKey: ['admin-events'],
        queryFn: async () => {
            const res = await eventService.getEvents()
            return res.data
        }
    })
    
    const events = useMemo(() => {
        if (!eventsData) return []
        if (Array.isArray(eventsData)) return eventsData
        const dataAny = eventsData as any
        if (dataAny.data && Array.isArray(dataAny.data)) return dataAny.data
        if (dataAny.events && Array.isArray(dataAny.events)) return dataAny.events
        return []
    }, [eventsData])

    // Mutations
    const createMutation = useMutation({
        mutationFn: (newRoom: Partial<Room> & { seats_per_row?: number }) => roomService.createRoom(newRoom as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
            toast.success('Thêm phòng thành công')
            setIsAddModalOpen(false)
            resetForm()
        },
        onError: () => toast.error('Lỗi khi thêm phòng')
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string, payload: Partial<Room> }) => 
            roomService.updateRoom(id, payload as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
            toast.success('Cập nhật phòng thành công')
        },
        onError: () => toast.error('Lỗi khi cập nhật phòng')
    })

    const updateSeatsMutation = useMutation({
        mutationFn: ({ roomId, seats }: { roomId: string, seats: Seat[] }) => 
            roomService.updateRoomSeatsBatch(roomId, seats.map(s => ({ id: s.id, isActive: s.isActive } as any))),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
            toast.success('Cập nhật ghế thành công')
        },
        onError: () => toast.error('Lỗi khi cập nhật ghế')
    })

    const updateSeatLocksMutation = useMutation({
        mutationFn: ({ roomId, updates }: { roomId: string, updates: any[] }) => 
            roomService.updateRoomSeatLocksBatch(roomId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
        },
        onError: () => toast.error('Lỗi khi cập nhật phân khu ghế')
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => roomService.deleteRoom(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
            toast.success('Xóa phòng thành công')
            setIsDeleteModalOpen(false)
            setSelectedRoom(null)
        },
        onError: () => toast.error('Lỗi khi xóa phòng')
    })

    const resetForm = () => {
        setFormData({ name: '', rows: 10, seatsPerRow: 10 })
        setPendingSeats([])
        setPendingSeatLocks([])
        setSelectedEventIds([])
        setLockEventId('global')
        setLockTicketTypeId('all')
    }

    const openEditModal = (room: Room) => {
        setSelectedRoom(room)
        setFormData({
            name: room.name,
            rows: room.rows,
            seatsPerRow: room.seatsPerRow
        })
        setPendingSeats([])
        setPendingSeatLocks([])
        setLockEventId('global')
        setLockTicketTypeId('all')
        if (room.events) {
            setSelectedEventIds(room.events.map(e => e.id))
        } else {
            setSelectedEventIds([])
        }
        setIsEditModalOpen(true)
    }

    const openDeleteModal = (room: Room) => {
        setSelectedRoom(room)
        setIsDeleteModalOpen(true)
    }

    const handleAdd = () => {
        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên phòng')
            return
        }
        if (formData.rows <= 0 || formData.seatsPerRow <= 0) {
            toast.error('Kích thước phòng không hợp lệ')
            return
        }
        createMutation.mutate({
            name: formData.name,
            rows: formData.rows,
            seats_per_row: formData.seatsPerRow,
            isActive: true
        })
    }

    const handleSaveRoom = async () => {
        if (!selectedRoom) return
        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên phòng')
            return
        }
        
        setIsSaving(true)
        
        try {
            // Update basic info + events array
            const isInfoChanged = formData.name !== selectedRoom.name || 
                JSON.stringify(selectedEventIds.sort()) !== JSON.stringify((selectedRoom.events?.map(e => e.id) || []).sort())
                
            if (isInfoChanged) {
                await updateMutation.mutateAsync({
                    id: selectedRoom.id,
                    payload: { 
                        name: formData.name,
                        eventIds: selectedEventIds as any
                    }
                })
            }
            
            // Apply pending seat changes in batch
            if (pendingSeats.length > 0) {
                await updateSeatsMutation.mutateAsync({
                    roomId: selectedRoom.id,
                    seats: pendingSeats
                })
            }
            
            if (pendingSeatLocks.length > 0) {
                await updateSeatLocksMutation.mutateAsync({
                    roomId: selectedRoom.id,
                    updates: pendingSeatLocks
                })
            }
            
            setIsEditModalOpen(false)
            resetForm()
            setSelectedRoom(null)
        } catch (error) {
            // Error handled in mutations
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = () => {
        if (!selectedRoom) return
        deleteMutation.mutate(selectedRoom.id)
    }

    const handleSeatToggle = (seatId: string, currentIsActive: boolean) => {
        if (!currentRoom) return
        
        if (lockEventId === 'global') {
            setPendingSeats(current => {
                const existing = current.find(s => s.id === seatId)
                
                if (existing) {
                    return current.filter(s => s.id !== seatId)
                } else {
                    const originalSeat = currentRoom.seats.find(s => s.id === seatId)
                    if (!originalSeat) return current
                    
                    return [...current, { ...originalSeat, isActive: !currentIsActive }]
                }
            })
        } else {
            const ticketTypeId = lockTicketTypeId === 'all' ? null : lockTicketTypeId
            
            setPendingSeatLocks(current => {
                const existingIndex = current.findIndex(p => p.id === seatId && p.eventId === lockEventId && p.ticketTypeId === ticketTypeId)
                
                if (existingIndex !== -1) {
                    const newLocks = [...current]
                    newLocks.splice(existingIndex, 1)
                    return newLocks
                } else {
                    const originalSeat = currentRoom.seats.find(s => s.id === seatId)
                    const hasLock = (originalSeat as any)?.locks?.some((l: any) => l.eventId === lockEventId && (l.ticketTypeId || null) === ticketTypeId)
                    
                    return [...current, {
                        id: seatId,
                        eventId: lockEventId,
                        ticketTypeId,
                        action: hasLock ? 'remove' : 'add'
                    }]
                }
            })
        }
    }

    const handleSoldSeatClick = (ticketCode: string) => {
        toast.info(`Ghế này đã được bán (Mã TT: ${ticketCode})`, {
            description: "Chỉ có thể thay đổi trạng thái của ghế trống."
        })
    }

    // Filter and sort stats
    const filteredRooms = rooms.filter(room => 
        room.name.toLowerCase().includes(search.toLowerCase())
    )

    const stats = {
        total: (rooms || []).length,
        active: (rooms || []).filter((r) => r?.isActive).length,
        totalSeats: (rooms || []).reduce((acc, room) => acc + (room?.seats?.length || 0), 0)
    }

    if (isRoomsLoading || isEventsLoading) {
        return <div className="p-8 flex items-center justify-center">Đang tải biểu đồ phòng...</div>
    }

    // Get current room data (reactive to store changes)
    const currentRoom = selectedRoom ? (rooms || []).find((r) => r?.id === selectedRoom.id) : null

    // Group seats by row
    const getSeatsByRow = (seats: Seat[] | undefined): Record<string, Seat[]> => {
        const byRow: Record<string, Seat[]> = {}
        if (!seats) return byRow
        
        seats.forEach((seat) => {
            if (!seat || !seat.row || !seat.id) return // safeguard
            if (!byRow[seat.row]) byRow[seat.row] = []
            
            // Prevent duplicates
            const exists = byRow[seat.row]!.find(s => s.id === seat.id)
            if (!exists) {
                byRow[seat.row]!.push(seat)
            }
        })
        // Sort each row by seat number
        Object.keys(byRow).forEach(row => {
            if (byRow[row]) {
                byRow[row].sort((a, b) => (a?.number || 0) - (b?.number || 0))
            }
        })
        return byRow
    }

    // Check if form has changes
    const hasChanges = selectedRoom && (
        formData.name !== selectedRoom.name ||
        pendingSeats.length > 0 ||
        pendingSeatLocks.length > 0 ||
        JSON.stringify(selectedEventIds.sort()) !== JSON.stringify((selectedRoom.events?.map(e => e.id) || []).sort())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quản lý phòng chiếu</h1>
                    <p className="text-muted-foreground mt-1">Quản lý phòng và sơ đồ ghế ngồi</p>
                </div>
                <Button onClick={() => { resetForm(); setIsAddModalOpen(true) }}>
                    <Plus className="size-4 mr-2" />
                    Thêm phòng
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-card text-card-foreground border rounded-xl overflow-hidden shadow-sm pt-4 p-6">
                    <div className="flex items-center gap-2">
                        <Grid3X3 className="size-5 text-primary" />
                        <div>
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">Tổng phòng</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card text-card-foreground border rounded-xl overflow-hidden shadow-sm pt-4 p-6">
                    <div className="flex items-center gap-2">
                        <Grid3X3 className="size-5 text-emerald-600" />
                        <div>
                            <p className="text-2xl font-bold">{stats.active}</p>
                            <p className="text-xs text-muted-foreground">Đang hoạt động</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card text-card-foreground border rounded-xl overflow-hidden shadow-sm pt-4 p-6">
                    <div className="flex items-center gap-2">
                        <Armchair className="size-5 text-blue-600" />
                        <div>
                            <p className="text-2xl font-bold">{stats.totalSeats}</p>
                            <p className="text-xs text-muted-foreground">Tổng ghế</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md my-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                    placeholder="Tìm kiếm phòng..."
                    value={search}
                    onChange={(e: any) => setSearch(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room, index) => {
                    const activeSeats = (room.seats || []).filter((s) => s.isActive).length
                    const inactiveSeats = (room.seats || []).length - activeSeats

                    return (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className={`bg-card text-card-foreground border rounded-xl overflow-hidden shadow-sm ${!room.isActive ? 'opacity-60' : ''}`}>
                                <div className="p-6 pb-2 border-b">
                                    <div className="flex items-start justify-between">
                                        <h3 className="text-lg font-bold">{room.name}</h3>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                                            room.isActive 
                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                                : "bg-muted text-muted-foreground"
                                        }`}>
                                            {room.isActive ? 'Hoạt động' : 'Tắt'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-6 pt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="p-2 bg-muted rounded">
                                            <p className="text-muted-foreground">Kích thước</p>
                                            <p className="font-medium">{room.rows} hàng × {room.seatsPerRow} ghế</p>
                                        </div>
                                        <div className="p-2 bg-muted rounded">
                                            <p className="text-muted-foreground">Tổng ghế</p>
                                            <p className="font-medium">{room.seats?.length || 0} ghế</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 text-xs">
                                        <span className="flex items-center gap-1">
                                            <div className="size-3 bg-emerald-500 rounded" />
                                            Mở: {activeSeats}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="size-3 bg-red-500 rounded" />
                                            Đóng: {inactiveSeats}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 justify-end mt-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={room.isActive ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted"}
                                            onClick={() => updateMutation.mutate({ id: room.id, payload: { isActive: !room.isActive } })}
                                            title={room.isActive ? "Tắt phòng" : "Bật phòng"}
                                        >
                                            {room.isActive ? <Power className="size-4" /> : <PowerOff className="size-4" />}
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="hover:bg-accent hover:text-accent-foreground"
                                            onClick={() => openEditModal(room)}
                                            title="Sửa phòng"
                                        >
                                            <SquarePen className="size-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => openDeleteModal(room)}
                                            title="Xóa phòng"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {filteredRooms.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                    <Grid3X3 className="size-12 mx-auto mb-4 opacity-50" />
                    <p>Không tìm thấy phòng nào</p>
                </div>
            )}

            {/* Add Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); resetForm() }}
                title="Thêm phòng mới"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tên phòng *</label>
                        <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="VD: Phòng chiếu 1"
                            value={formData.name}
                            onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Số hàng</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type="number"
                                min={1}
                                max={26}
                                value={formData.rows}
                                onChange={(e: any) => setFormData({ ...formData, rows: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ghế mỗi hàng</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type="number"
                                min={1}
                                max={30}
                                value={formData.seatsPerRow}
                                onChange={(e: any) => setFormData({ ...formData, seatsPerRow: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Tổng: {formData.rows * formData.seatsPerRow} ghế
                    </p>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => { setIsAddModalOpen(false); resetForm() }}>
                        Hủy
                    </Button>
                    <Button onClick={handleAdd} loading={createMutation.isPending}>
                        Thêm phòng
                    </Button>
                </div>
            </Modal>

            {/* Unified Edit Modal - 2 Column Layout */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); resetForm(); setSelectedRoom(null) }}
                title={`Chỉnh sửa phòng - ${selectedRoom?.name || ''}`}
                size="full"
            >
                {currentRoom && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[500px]">
                        {/* Left Column - Form (2 cols) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="space-y-4 p-4 bg-muted/50 rounded-xl">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <SquarePen className="size-5" />
                                    Thông tin phòng
                                </h3>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tên phòng</label>
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Nhập tên phòng"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Số hàng</label>
                                        <div className="font-medium px-3 py-2 bg-background border rounded-md">
                                            {currentRoom.rows}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Ghế mỗi hàng</label>
                                        <div className="font-medium px-3 py-2 bg-background border rounded-md">
                                            {currentRoom.seatsPerRow}
                                        </div>
                                    </div>
                                </div>

                                {/* Event Assignment Multi-select */}
                                <div className="space-y-2 pt-4 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium">Sự kiện sử dụng phòng</label>
                                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                                            {selectedEventIds.length} sự kiện
                                        </span>
                                    </div>
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 rounded-md border p-2 bg-background custom-scrollbar">
                                        {events.map((event: any) => (
                                            <div key={event.id || event._id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input 
                                                        type="checkbox"
                                                        id={`event-${event.id || event._id}`}
                                                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        checked={selectedEventIds.includes(event.id || event._id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedEventIds([...selectedEventIds, event.id || event._id])
                                                            } else {
                                                                setSelectedEventIds(selectedEventIds.filter(id => id !== (event.id || event._id)))
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor={`event-${event.id || event._id}`} className="text-sm font-medium cursor-pointer w-full truncate">
                                                        {event.title}
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                        {events.length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                Chưa có sự kiện nào.
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Chỉ các sự kiện được chọn mới có thể sử dụng phòng này để bán vé.
                                    </p>
                                </div>
                            </div>

                            {/* Legend Context */}
                            <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="text-sm font-medium flex items-center gap-2">Chú thích</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="size-4 bg-emerald-500 rounded" />
                                        <span>Ghế Mở</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="size-4 bg-red-500 rounded" />
                                        <span>Ghế Hỏng (Khóa chung)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="size-4 bg-amber-500 rounded" />
                                        <span>Khóa theo Sự kiện/Vé</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="size-4 bg-blue-400 opacity-60 rounded" />
                                        <span>Khóa bởi Nhóm vé khác</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Seat Map (3 cols) */}
                        <div className="lg:col-span-3 bg-muted/20 border rounded-xl p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Armchair className="size-5 text-primary" />
                                        Sơ đồ ghế
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Chọn chế độ Khóa bên dưới và Click vào ghế để Khóa/Mở (Click Lưu thay đổi)
                                    </p>
                                </div>
                                <span className={(pendingSeats.length > 0 || pendingSeatLocks.length > 0) ? "text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20" : "hidden"}>
                                    {pendingSeats.length + pendingSeatLocks.length} thay đổi chưa lưu
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center bg-background p-3 rounded-lg border">
                                <div className="flex-1 space-y-1 w-full">
                                    <label className="text-xs font-medium text-muted-foreground">Chế độ khóa ghế:</label>
                                    <Select 
                                        value={lockEventId} 
                                        onChange={(v) => {
                                            setLockEventId(v)
                                            setLockTicketTypeId('all')
                                        }}
                                        options={[
                                            { value: 'global', label: 'Khóa vĩnh viễn (Phòng hỏng)' },
                                            ...selectedEventIds.map(eventId => {
                                                const ev = events.find((e: any) => e.id === eventId || e._id === eventId)
                                                return ev ? { value: eventId, label: `🎫 ${ev.title}` } : null
                                            }).filter(Boolean) as any[],
                                        ]}
                                    />
                                </div>
                                {lockEventId !== 'global' && (
                                    <div className="flex-1 space-y-1 w-full">
                                        <label className="text-xs font-medium text-muted-foreground">Áp dụng cho loại vé:</label>
                                        <Select 
                                            value={lockTicketTypeId} 
                                            onChange={(v) => setLockTicketTypeId(v)}
                                            options={[
                                                { value: 'all', label: 'Tất cả loại vé' },
                                                ...(() => {
                                                    const ev = events.find((e: any) => e.id === lockEventId || e._id === lockEventId)
                                                    return ev?.ticket_types?.map((tt: any) => ({
                                                        value: tt.id || tt._id, label: tt.name
                                                    })) || []
                                                })(),
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Seat grid area - max height with scroll */}
                            <div className="flex-1 min-h-[400px] overflow-auto border bg-background rounded-lg p-8 custom-scrollbar">
                                <div className="w-fit mx-auto min-w-full flex flex-col items-center">
                                    {/* Screen Element */}
                                    <div className="w-3/4 max-w-2xl mx-auto mb-12 flex flex-col items-center">
                                        <div className="w-full h-2 bg-gradient-to-b from-primary/40 to-transparent rounded-t-full shadow-[0_0_20px_rgba(var(--primary),0.3)]"></div>
                                        <div className="w-full h-8 flex justify-center mt-2 border-t border-primary/20 bg-muted/20 backdrop-blur-sm rounded-b-[100%]">
                                            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase pt-1">
                                                Màn hình góc
                                            </p>
                                        </div>
                                    </div>

                                    {/* Seat Matrix */}
                                    <div className="flex flex-col gap-3">
                                        {(() => {
                                            const seatsByRow = getSeatsByRow(currentRoom.seats);
                                            const sortedRows = Object.keys(seatsByRow).sort((a,b) => {
                                                const numA = parseInt(a.replace(/[^\d]/g, ''), 10);
                                                const numB = parseInt(b.replace(/[^\d]/g, ''), 10);
                                                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                                return a.localeCompare(b);
                                            });
                                            return sortedRows.map(row => {
                                                const rowSeats = seatsByRow[row]!;
                                                return (
                                                <div key={row} className="flex items-center justify-center gap-4">
                                                    <span className="w-16 text-center text-sm font-medium text-muted-foreground shrink-0">{row}</span>
                                                    <div className="flex gap-2">
                                                        {rowSeats.map((seat) => {
                                                            const pendingGlobal = pendingSeats.find(p => p.id === seat.id)
                                                            const isActive = pendingGlobal ? pendingGlobal.isActive : seat.isActive
                                                            
                                                            // Determine event locks
                                                            let hasTargetLock = false
                                                            if (lockEventId !== 'global') {
                                                                const ticketTypeId = lockTicketTypeId === 'all' ? null : lockTicketTypeId
                                                                
                                                                const pendingLock = pendingSeatLocks.find(p => p.id === seat.id && p.eventId === lockEventId && p.ticketTypeId === ticketTypeId)
                                                                
                                                                if (pendingLock) {
                                                                    hasTargetLock = pendingLock.action === 'add'
                                                                } else {
                                                                    hasTargetLock = (seat as any).locks?.some((l: any) => l.eventId === lockEventId && (l.ticketTypeId || null) === ticketTypeId) || false
                                                                }
                                                            }

                                                        let btnClass = ""
                                                        if (!isActive) {
                                                            // Hardware locked (red)
                                                            btnClass = "bg-red-500 text-white hover:bg-red-600"
                                                        } else if (lockEventId !== 'global' && hasTargetLock) {
                                                            // Event locked (amber)
                                                            btnClass = "bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-primary ring-offset-1"
                                                        } else {
                                                            // Available
                                                            btnClass = "bg-emerald-500 text-white hover:bg-emerald-600"
                                                            // If we are in Event view, show seats that have *any* other locks for this event faintly
                                                            if (lockEventId !== 'global' && !hasTargetLock) {
                                                                const hasOtherLock = (seat as any).locks?.some((l: any) => l.eventId === lockEventId) || false
                                                                if (hasOtherLock) {
                                                                    btnClass = "bg-blue-400 text-white hover:bg-blue-500 opacity-60"
                                                                }
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                key={seat.id}
                                                                onClick={() => handleSeatToggle(seat.id, isActive)}
                                                                className={`size-8 rounded flex items-center justify-center text-xs font-medium transition-all relative ${btnClass}`}
                                                                title={`${seat.row} - Số ${seat.number}`}
                                                            >
                                                                {seat.number}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                        })
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="pt-4 mt-6 border-t w-full">
                    <div className="flex w-full justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={() => setPendingSeats([])}
                            disabled={pendingSeats.length === 0}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            Khôi phục ghế
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsEditModalOpen(false)
                                    resetForm()
                                    setSelectedRoom(null)
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSaveRoom}
                                disabled={!hasChanges}
                                className="min-w-[120px] gap-2"
                                loading={isSaving || updateMutation.isPending || updateSeatsMutation.isPending}
                            >
                                <Save className="size-4" />
                                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Xóa phòng"
            >
                <div>
                    <p className="text-muted-foreground">
                        Bạn có chắc chắn muốn xóa phòng chiếu <span className="font-medium text-foreground">{selectedRoom?.name}</span>?
                        Hành động này không thể hoàn tác và sẽ xóa toàn bộ sơ đồ ghế cùng các ticket được liên kết.
                    </p>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                        Hủy
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} loading={deleteMutation.isPending}>
                        Xóa phòng
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
