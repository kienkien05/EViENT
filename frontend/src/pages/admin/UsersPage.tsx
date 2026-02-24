import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Trash2, Plus, X, Eye, Shield, Clock,
  KeyRound, Mail, Calendar, User as UserIcon, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'
import { userService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ==================== Types ====================

interface CreateUserForm {
  email: string
  full_name: string
  password: string
  role: 'user' | 'admin'
}

const emptyForm: CreateUserForm = {
  email: '', full_name: '', password: '', role: 'user',
}

const passwordReasonLabels: Record<string, string> = {
  register: 'Đăng ký tài khoản',
  reset: 'Đặt lại mật khẩu',
  admin_update: 'Admin cập nhật',
  self_update: 'Tự đổi mật khẩu',
}

// ==================== Main Component ====================

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [form, setForm] = useState<CreateUserForm>({ ...emptyForm })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { search, page }],
    queryFn: () => userService.getUsers({ search, page, limit: 20 }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowDetail(false)
      toast.success('Đã xóa người dùng')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể xóa người dùng')
    }
  })

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      deleteMutation.mutate(id)
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowCreate(false)
      setForm({ ...emptyForm })
      toast.success('Đã tạo người dùng')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể tạo người dùng')
    },
  })

  const handleCreate = () => {
    if (!form.email.trim() || !form.full_name.trim() || !form.password.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin')
      return
    }
    if (form.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    createMutation.mutate(form)
  }

  const openDetail = (user: any) => {
    // Fetch full user detail
    userService.getUserById(user.id).then((res) => {
      setSelectedUser(res.data.data)
      setShowDetail(true)
    }).catch(() => {
      setSelectedUser(user)
      setShowDetail(true)
    })
  }

  // Handle potential nested data from API or React Query
  let rawUsers = data?.data
  if (data?.data?.data) rawUsers = data.data.data
  const users = Array.isArray(rawUsers) ? rawUsers : []
  console.log('DEBUG USERS:', data, users)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <Button onClick={() => { setForm({ ...emptyForm }); setShowCreate(true) }} className="gap-2">
          <Plus className="size-4" /> Tạo người dùng
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input type="text" placeholder="Tìm kiếm người dùng..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-medium">Họ tên</th>
            <th className="text-left p-3 font-medium">Email</th>
            <th className="text-left p-3 font-medium">Vai trò</th>
            <th className="text-left p-3 font-medium">Trạng thái</th>
            <th className="text-left p-3 font-medium">Ngày tạo</th>
            <th className="text-right p-3 font-medium">Thao tác</th>
          </tr></thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Không có dữ liệu</td></tr>
            )}
            {!isLoading && users.map((u: any) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => openDetail(u)}>
                  <td className="p-3 font-medium">{u.full_name}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {u.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${u.is_active ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                      {u.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.created_at ? formatDate(u.created_at) : '—'}</td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(u)} title="Xem chi tiết">
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, u.id)}
                        title="Xóa người dùng">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
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
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 h-24 animate-pulse bg-muted/40" />
        ))}
        {!isLoading && users.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
            Không có dữ liệu
          </div>
        )}
        {!isLoading && users.map((u: any) => (
          <div key={u.id} className="bg-card border border-border rounded-xl p-4" onClick={() => openDetail(u)}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{u.full_name}</h3>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => openDetail(u)}>
                  <Eye className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, u.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================== Create User Modal ==================== */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo người dùng mới" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                type="email" placeholder="email@example.com"
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mỗi email chỉ tạo được 1 tài khoản</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Họ và tên *</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Nguyễn Văn A"
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mật khẩu *</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                type={showPassword ? "text" : "password"} placeholder="Tối thiểu 6 ký tự"
                className="w-full h-10 pl-10 pr-10 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vai trò</label>
            <Select value={form.role} onChange={v => setForm(f => ({ ...f, role: v as 'user' | 'admin' }))}
              options={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={handleCreate} loading={createMutation.isPending} className="flex-1">Tạo người dùng</Button>
          <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Hủy</Button>
        </div>
      </Modal>

      {/* ==================== User Detail Modal ==================== */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Thông tin người dùng" size="lg">
        {selectedUser && (
          <div className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={UserIcon} label="Họ và tên" value={selectedUser.full_name} />
              <InfoRow icon={Mail} label="Email" value={selectedUser.email} />
              <InfoRow icon={Shield} label="Vai trò"
                value={selectedUser.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                badge={selectedUser.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'} />
              <InfoRow icon={Calendar} label="Ngày tạo"
                value={selectedUser.created_at ? formatDate(selectedUser.created_at) : '—'} />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'size-2.5 rounded-full',
                  selectedUser.is_active ? 'bg-green-500' : 'bg-red-500'
                )} />
                <span className="text-sm font-medium">
                  {selectedUser.is_active ? 'Đang hoạt động' : 'Đã bị khóa'}
                </span>
              </div>
              <Button variant="destructive" size="sm" onClick={(e) => handleDelete(e as any, selectedUser.id)} loading={deleteMutation.isPending}>
                Xóa người dùng
              </Button>
            </div>

            {/* Account Info */}
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <KeyRound className="size-4" /> Tài khoản & mật khẩu
              </h3>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email đăng nhập</span>
                  <span className="font-medium">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mật khẩu</span>
                  <span className="font-mono text-muted-foreground">••••••••</span>
                </div>
                {selectedUser.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cập nhật lần cuối</span>
                    <span>{formatDate(selectedUser.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Password Change History */}
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Clock className="size-4" /> Lịch sử đổi mật khẩu
              </h3>
              {(selectedUser.password_history && selectedUser.password_history.length > 0) ? (
                <div className="space-y-2">
                  {selectedUser.password_history
                    .slice()
                    .sort((a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                    .map((entry: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <KeyRound className="size-3.5 text-muted-foreground" />
                          <span>{passwordReasonLabels[entry.reason] || entry.reason}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">{formatDate(entry.changed_at)}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  Chưa có lịch sử thay đổi mật khẩu
                </p>
              )}
            </div>

            {/* Additional Info */}
            {(selectedUser.phone_number || selectedUser.address || selectedUser.gender) && (
              <div>
                <h3 className="text-sm font-medium mb-2">Thông tin bổ sung</h3>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                  {selectedUser.phone_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số điện thoại</span>
                      <span>{selectedUser.phone_number}</span>
                    </div>
                  )}
                  {selectedUser.gender && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Giới tính</span>
                      <span>{selectedUser.gender === 'male' ? 'Nam' : selectedUser.gender === 'female' ? 'Nữ' : 'Khác'}</span>
                    </div>
                  )}
                  {selectedUser.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Địa chỉ</span>
                      <span>{selectedUser.address}</span>
                    </div>
                  )}
                  {selectedUser.date_of_birth && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngày sinh</span>
                      <span>{formatDate(selectedUser.date_of_birth)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

// ==================== Info Row Component ====================

function InfoRow({ icon: Icon, label, value, badge }: {
  icon: any
  label: string
  value: string
  badge?: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {badge ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block ${badge}`}>{value}</span>
        ) : (
          <p className="text-sm font-medium">{value}</p>
        )}
      </div>
    </div>
  )
}
