import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Image, Upload, LoaderIcon } from 'lucide-react'
import { toast } from 'sonner'
import { bannerService, uploadService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { getImageUrl } from '@/lib/utils'

export default function AdminBannersPage() {
  const [showModal, setShowModal] = useState(false)
  const [editBanner, setEditBanner] = useState<any>(null)
  const [form, setForm] = useState({ title: '', image_url: '', link_url: '', priority: 0, is_active: true })
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: () => bannerService.getBanners().then((r) => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannerService.deleteBanner(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] }); toast.success('Đã xóa banner') },
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editBanner ? bannerService.updateBanner(editBanner.id, data) : bannerService.createBanner(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] }); setShowModal(false); toast.success('Đã lưu') },
  })

  const openCreate = () => { setEditBanner(null); setForm({ title: '', image_url: '', link_url: '', priority: 0, is_active: true }); setShowModal(true) }
  const openEdit = (b: any) => { setEditBanner(b); setForm({ title: b.title, image_url: b.image_url, link_url: b.link_url || '', priority: b.priority || 0, is_active: b.is_active }); setShowModal(true) }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const res = await uploadService.upload(file)
      setForm(f => ({ ...f, image_url: res.data.data.url }))
      toast.success('Tải ảnh lên thành công')
    } catch (error) {
      toast.error('Lỗi khi tải ảnh lên')
    } finally {
      setUploading(false)
    }
  }

  const banners = data || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản lý banner</h1>
        <Button onClick={openCreate} className="gap-2"><Plus className="size-4" /> Thêm banner</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/1] rounded-xl" />
        )) : banners.map((b: any) => (
          <div key={b.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <img src={getImageUrl(b.image_url, { width: 600 })} alt={b.title} className="w-full aspect-[2/1] object-cover" crossOrigin="anonymous" />
            <div className="p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm truncate">{b.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'}`}>
                  {b.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(b)} className="flex-1 gap-1"><Edit className="size-3" /> Sửa</Button>
                <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(b.id)}><Trash2 className="size-3 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editBanner ? 'Sửa banner' : 'Thêm banner'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Tiêu đề *</label>
            <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" /></div>
          <div>
            <label className="block text-sm font-medium mb-1">Ảnh Banner *</label>
            {form.image_url ? (
              <div className="relative group rounded-lg overflow-hidden border border-border">
                <img src={getImageUrl(form.image_url)} className="w-full aspect-[2/1] object-cover" alt="Banner Preview" crossOrigin="anonymous" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer text-white flex items-center gap-1 text-sm hover:underline">
                    <Upload className="size-4" /> Đổi ảnh
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full aspect-[2/1] border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? <LoaderIcon className="size-6 text-muted-foreground animate-spin mb-2" /> : <Upload className="size-6 text-muted-foreground mb-2" />}
                  <p className="text-xs text-muted-foreground">Nhấn để tải ảnh lên</p>
                </div>
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFileUpload} />
              </label>
            )}
          </div>
          <div><label className="block text-sm font-medium mb-1">URL liên kết</label>
            <input value={form.link_url} onChange={(e) => setForm(f => ({ ...f, link_url: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" /></div>
          <div className="flex gap-4">
            <div className="flex-1"><label className="block text-sm font-medium mb-1">Ưu tiên</label>
              <input type="number" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: Number(e.target.value) }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-ring text-sm" /></div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} className="size-4 rounded" />
                <span className="text-sm">Hiển thị</span>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => saveMutation.mutate(form)} loading={saveMutation.isPending} className="flex-1">Lưu</Button>
          <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Hủy</Button>
        </div>
      </Modal>
    </div>
  )
}
