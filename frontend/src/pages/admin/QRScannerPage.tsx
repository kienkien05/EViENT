import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, Camera, CheckCircle2, XCircle, Volume2, VolumeX, Search, Loader2, User, MapPin, Calendar, Armchair, Tag, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { ticketService } from '@/services'
import { Button } from '@/components/ui/Button'
import { cn, formatDateTime } from '@/lib/utils'

interface TicketInfo {
  id: string
  ticket_code: string
  status: string
  used_at?: string
  price_at_purchase: number
  event?: {
    id: string
    title: string
    start_time?: string
    location?: string
    banner_image?: string
  }
  ticket_type?: {
    id: string
    name: string
  }
  seat?: {
    room: string
    row: string
    number: number
  }
  buyer?: {
    full_name: string
    email: string
  }
}

interface ScanResult {
  code: string
  status: 'success' | 'error'
  message: string
  ticket?: TicketInfo
  timestamp: Date
}

export default function QRScannerPage() {
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [previewTicket, setPreviewTicket] = useState<TicketInfo | null>(null)
  const [latestResult, setLatestResult] = useState<ScanResult | null>(null)
  const scannerRef = useRef<any>(null)
  const processingRef = useRef(false)
  const lastScannedRef = useRef<string>('')
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addResult = useCallback((result: ScanResult) => {
    setHistory((prev) => [result, ...prev].slice(0, 50))
    setLatestResult(result)
  }, [])

  const playSound = useCallback((type: 'success' | 'error') => {
    if (!soundEnabled) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      if (type === 'success') {
        osc.type = 'sine'
        osc.frequency.value = 800
      } else {
        osc.type = 'square'
        osc.frequency.value = 300
      }
      osc.connect(ctx.destination)
      osc.start()
      setTimeout(() => osc.stop(), type === 'success' ? 150 : 300)
    } catch {}
  }, [soundEnabled])

  const validateTicket = useCallback(async (code: string) => {
    // Prevent duplicate rapid scans of the same code
    if (processingRef.current) return
    if (lastScannedRef.current === code) return

    processingRef.current = true
    lastScannedRef.current = code
    setLoading(true)
    setPreviewTicket(null)

    try {
      const { data } = await ticketService.validateQR(code)
      const ticket = data.data?.ticket as TicketInfo
      const result: ScanResult = {
        code,
        status: 'success',
        message: 'Check-in thành công!',
        ticket,
        timestamp: new Date(),
      }
      addResult(result)
      playSound('success')
      toast.success('Check-in thành công!')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Vé không hợp lệ'
      const result: ScanResult = {
        code,
        status: 'error',
        message: msg,
        timestamp: new Date(),
      }
      addResult(result)
      playSound('error')
      toast.error(msg)
    } finally {
      setLoading(false)
      processingRef.current = false

      // Cooldown: prevent re-scanning same code for 3 seconds
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
      cooldownRef.current = setTimeout(() => {
        lastScannedRef.current = ''
      }, 3000)
    }
  }, [addResult, playSound])

  // Lookup ticket info without check-in
  const lookupTicket = async () => {
    const code = manualCode.trim()
    if (!code) return

    setLookupLoading(true)
    setPreviewTicket(null)
    setLatestResult(null)

    try {
      const { data } = await ticketService.getTicketInfo(code)
      const ticket = data.data as TicketInfo
      setPreviewTicket(ticket)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không tìm thấy vé'
      toast.error(msg)
    } finally {
      setLookupLoading(false)
    }
  }

  // Check-in from preview
  const confirmCheckIn = async () => {
    if (!previewTicket) return
    await validateTicket(previewTicket.ticket_code)
    setPreviewTicket(null)
    setManualCode('')
  }

  // Direct check-in from manual code (without preview)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    await validateTicket(manualCode.trim())
    setManualCode('')
  }

  const startScanning = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          validateTicket(decodedText)
        },
        () => {}
      )
      setScanning(true)
    } catch (err) {
      toast.error('Không thể truy cập camera')
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
      } catch {}
    }
    setScanning(false)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop() } catch {}
      }
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
    }
  }, [])

  const successCount = history.filter((r) => r.status === 'success').length
  const errorCount = history.filter((r) => r.status === 'error').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="size-6" />
          Quét QR Check-in
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled((v) => !v)}
        >
          {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{history.length}</p>
          <p className="text-xs text-muted-foreground">Đã quét</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{successCount}</p>
          <p className="text-xs text-green-600">Thành công</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{errorCount}</p>
          <p className="text-xs text-red-500">Lỗi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Scanner + Manual Input */}
        <div className="space-y-4">
          {/* Camera Scanner */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Camera className="size-4" />
              Camera
            </h2>

            <div id="qr-reader" className="w-full aspect-square bg-black/5 rounded-lg overflow-hidden mb-4" />

            <Button
              onClick={scanning ? stopScanning : startScanning}
              variant={scanning ? 'destructive' : 'default'}
              className="w-full gap-2"
              size="lg"
            >
              <Camera className="size-4" />
              {scanning ? 'Dừng quét' : 'Bắt đầu quét'}
            </Button>
          </div>

          {/* Manual Input */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Search className="size-4" />
              Nhập mã vé
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value.toUpperCase())
                  setPreviewTicket(null)
                  setLatestResult(null)
                }}
                placeholder="EVT-XXXXXXXX-XXXXXXXX"
                className="w-full h-11 px-4 rounded-lg border border-input bg-background font-mono text-sm focus:ring-2 focus:ring-ring outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    lookupTicket()
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={lookupTicket}
                  variant="outline"
                  className="flex-1 gap-2"
                  disabled={!manualCode.trim() || lookupLoading}
                >
                  {lookupLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  Tra cứu
                </Button>
                <Button
                  onClick={handleManualSubmit as any}
                  className="flex-1 gap-2"
                  disabled={!manualCode.trim() || loading}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Check-in ngay
                </Button>
              </div>
            </div>
          </div>

          {/* Ticket Preview (after lookup) */}
          <AnimatePresence>
            {previewTicket && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TicketDetailCard
                  ticket={previewTicket}
                  mode="preview"
                  onCheckIn={previewTicket.status === 'valid' ? confirmCheckIn : undefined}
                  loading={loading}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Latest check-in result */}
          <AnimatePresence>
            {latestResult && !previewTicket && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {latestResult.status === 'success' && latestResult.ticket ? (
                  <TicketDetailCard ticket={latestResult.ticket} mode="checked-in" />
                ) : (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <XCircle className="size-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-red-600">Check-in thất bại</p>
                        <p className="text-sm text-red-500 mt-0.5">{latestResult.message}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{latestResult.code}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: History */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-4">Lịch sử quét ({history.length})</h2>

          <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có lượt quét nào</p>
            ) : (
              history.map((result) => (
                <motion.div
                  key={`${result.code}-${result.timestamp.getTime()}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    result.status === 'success' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                  )}
                >
                  {result.status === 'success' ? (
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs">{result.code}</p>
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                        result.status === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
                      )}>
                        {result.status === 'success' ? 'OK' : 'LỖI'}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5">{result.message}</p>
                    {result.ticket && (
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <p className="font-medium text-foreground/80">{result.ticket.event?.title}</p>
                        <p>{result.ticket.ticket_type?.name}
                          {result.ticket.buyer && <> • {result.ticket.buyer.full_name}</>}
                          {result.ticket.seat && <> • {result.ticket.seat.room} {result.ticket.seat.row}-{result.ticket.seat.number}</>}
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {result.timestamp.toLocaleTimeString('vi-VN')}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== Ticket Detail Card ====================

function TicketDetailCard({
  ticket,
  mode,
  onCheckIn,
  loading,
}: {
  ticket: TicketInfo
  mode: 'preview' | 'checked-in'
  onCheckIn?: () => void
  loading?: boolean
}) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    valid: { label: 'Hợp lệ', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    used: { label: 'Đã sử dụng', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
    cancelled: { label: 'Đã huỷ', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  }

  const st = statusConfig[ticket.status] || { label: ticket.status, color: 'bg-muted text-muted-foreground' }

  const isCheckedIn = mode === 'checked-in'
  const canCheckIn = mode === 'preview' && ticket.status === 'valid' && onCheckIn

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden',
      isCheckedIn ? 'bg-green-500/5 border-green-500/30' : 'bg-card border-border'
    )}>
      {/* Header */}
      <div className={cn(
        'px-4 py-3 flex items-center gap-3',
        isCheckedIn ? 'bg-green-500/10' : 'bg-muted/30 border-b border-border'
      )}>
        {isCheckedIn ? (
          <div className="size-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="size-5 text-green-600" />
          </div>
        ) : (
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <QrCode className="size-4 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold text-sm', isCheckedIn && 'text-green-700')}>
            {isCheckedIn ? 'Check-in thành công!' : 'Thông tin vé'}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{ticket.ticket_code}</p>
        </div>
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', st.color)}>
          {st.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Event info */}
        {ticket.event && (
          <div className="space-y-2">
            <p className="font-semibold text-base">{ticket.event.title}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {ticket.event.start_time && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {formatDateTime(ticket.event.start_time)}
                </span>
              )}
              {ticket.event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {ticket.event.location}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Ticket type */}
          <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
            <Tag className="size-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Loại vé</p>
              <p className="font-medium truncate">{ticket.ticket_type?.name || '—'}</p>
            </div>
          </div>

          {/* Buyer */}
          <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
            <User className="size-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Người mua</p>
              <p className="font-medium truncate">{ticket.buyer?.full_name || '—'}</p>
            </div>
          </div>

          {/* Seat */}
          {ticket.seat && (
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <Armchair className="size-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Chỗ ngồi</p>
                <p className="font-medium">{ticket.seat.room} • {ticket.seat.row} - Số {ticket.seat.number}</p>
              </div>
            </div>
          )}

          {/* Used at (for checked-in) */}
          {ticket.used_at && (
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <Clock className="size-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Check-in lúc</p>
                <p className="font-medium">{new Date(ticket.used_at).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          )}

          {/* Email */}
          {ticket.buyer?.email && (
            <div className="col-span-2 flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="font-medium text-sm">{ticket.buyer.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Check-in Button (preview mode, valid ticket) */}
        {canCheckIn && (
          <Button
            onClick={onCheckIn}
            disabled={loading}
            className="w-full gap-2 mt-2"
            size="lg"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Xác nhận Check-in
          </Button>
        )}

        {/* Already used warning (preview mode) */}
        {mode === 'preview' && ticket.status === 'used' && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-lg px-4 py-3 text-sm text-center">
            <p className="font-semibold">⚠️ Vé đã được sử dụng</p>
            {ticket.used_at && (
              <p className="text-xs mt-1">Lúc: {new Date(ticket.used_at).toLocaleString('vi-VN')}</p>
            )}
          </div>
        )}

        {/* Cancelled warning (preview mode) */}
        {mode === 'preview' && ticket.status === 'cancelled' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg px-4 py-3 text-sm text-center">
            <p className="font-semibold">❌ Vé đã bị huỷ</p>
          </div>
        )}
      </div>
    </div>
  )
}
