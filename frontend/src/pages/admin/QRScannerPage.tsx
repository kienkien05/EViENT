import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, Camera, CheckCircle2, XCircle, AlertCircle, Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'
import { ticketService } from '@/services'
import { Button } from '@/components/ui/Button'
import { cn, formatDateTime } from '@/lib/utils'

interface ScanResult {
  code: string
  status: 'success' | 'error' | 'warning'
  message: string
  ticket?: any
  timestamp: Date
}

export default function QRScannerPage() {
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<any>(null)

  const addResult = useCallback((result: ScanResult) => {
    setHistory((prev) => [result, ...prev].slice(0, 50))
  }, [])

  const validateTicket = useCallback(async (code: string) => {
    setLoading(true)
    try {
      const { data } = await ticketService.validateQR(code)
      const result: ScanResult = {
        code,
        status: 'success',
        message: 'Check-in thành công!',
        ticket: data.data?.ticket,
        timestamp: new Date(),
      }
      addResult(result)

      if (soundEnabled) {
        // Success beep
        try {
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.value = 800
          osc.connect(ctx.destination)
          osc.start()
          setTimeout(() => osc.stop(), 150)
        } catch {}
      }

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

      if (soundEnabled) {
        try {
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          osc.type = 'square'
          osc.frequency.value = 300
          osc.connect(ctx.destination)
          osc.start()
          setTimeout(() => osc.stop(), 300)
        } catch {}
      }

      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [addResult, soundEnabled])

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
        {/* Scanner */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-4">Camera</h2>
          
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

          {/* Manual input */}
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Nhập mã tay</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="EVT-XXXXXXXX"
                className="flex-1 h-10 px-3 rounded-lg border border-input bg-background font-mono text-sm focus:ring-2 focus:ring-ring outline-none"
              />
              <Button type="submit" loading={loading}>Check-in</Button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-4">Lịch sử quét ({history.length})</h2>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có lượt quét nào</p>
            ) : (
              history.map((result, i) => (
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
                    <p className="font-mono text-xs">{result.code}</p>
                    <p className="text-sm mt-0.5">{result.message}</p>
                    {result.ticket && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {result.ticket.ticket_type_name} • {result.ticket.event_snapshot?.title}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
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
