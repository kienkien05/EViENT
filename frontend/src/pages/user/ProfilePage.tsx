import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Calendar, Camera, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { authService, uploadService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getImageUrl } from '@/lib/utils'

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone_number: user?.phone_number || '',
    address: user?.address || '',
    gender: user?.gender || '',
    date_of_birth: user?.date_of_birth || '',
    facebook_url: user?.facebook_url || '',
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authService.getProfile().then((r) => r.data.data),
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, any>) => authService.updateProfile(data),
    onSuccess: (res) => {
      updateUser(res.data.data)
      setEditing(false)
      toast.success('Cập nhật thành công!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại')
    },
  })

  const navigate = useNavigate()

  const handleChangePassword = async () => {
    if (!user?.email) return
    try {
      await authService.forgotPassword(user.email)
      toast.info('Mã OTP đã được gửi vào email để đổi mật khẩu')
      navigate('/verify-otp', { state: { email: user.email, type: 'change-password' } })
    } catch (err: any) {
      toast.error('Không thể gửi mã OTP')
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { data } = await uploadService.upload(file, 'avatars')
      await authService.updateProfile({ avatar_url: data.data.url })
      updateUser({ avatar_url: data.data.url })
      toast.success('Đã cập nhật ảnh đại diện')
    } catch {
      toast.error('Không thể tải ảnh lên')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Tài khoản</h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        {/* Avatar */}
        <div className="p-6 text-center border-b border-border bg-gradient-to-br from-primary/5 to-orange-500/5">
          <div className="relative inline-block">
            <img
              src={getImageUrl(user?.avatar_url, { width: 200 })}
              alt={user?.full_name}
              className="size-24 rounded-full object-cover border-4 border-background shadow-md"
              crossOrigin="anonymous"
            />
            <label className="absolute bottom-0 right-0 size-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors shadow-md">
              <Camera className="size-4 text-primary-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <h2 className="mt-3 text-lg font-semibold">{user?.full_name}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Profile Form */}
        <div className="p-6 space-y-4">
          {[
            { key: 'full_name', label: 'Họ và tên', icon: User },
            { key: 'phone_number', label: 'Số điện thoại', icon: Phone },
            { key: 'address', label: 'Địa chỉ', icon: MapPin },
            { key: 'date_of_birth', label: 'Ngày sinh', icon: Calendar, type: 'date' },
          ].map(({ key, label, icon: Icon, type }) => (
            <div key={key}>
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5 text-muted-foreground">
                <Icon className="size-4" /> {label}
              </label>
              {editing ? (
                <input
                  type={type || 'text'}
                  value={(form as any)[key] || ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring outline-none transition-all text-sm"
                />
              ) : (
                <p className="text-sm py-2">{(user as any)?.[key] || '—'}</p>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            {editing ? (
              <>
                <Button onClick={() => mutation.mutate(form)} loading={mutation.isPending} className="flex-1">
                  Lưu
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                  Hủy
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setEditing(true)} variant="outline" className="flex-1">
                  Chỉnh sửa hồ sơ
                </Button>
                <Button onClick={handleChangePassword} variant="default" className="flex-1">
                  Đổi mật khẩu
                </Button>
              </>
            )}
          </div>

          <div className="pt-4 sm:hidden">
             <Button onClick={() => { logout(); navigate('/') }} variant="destructive" className="w-full gap-2">
               <LogOut className="size-4" />
               Đăng xuất
             </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
