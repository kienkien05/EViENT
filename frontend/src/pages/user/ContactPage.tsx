import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Mail, Phone, MapPin, Clock,
  Facebook, MessageCircle, ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const contactInfo = [
  {
    icon: Phone,
    label: 'Điện thoại',
    value: '0983 732 666',
    href: 'tel:0983732666',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'kessoku.eventvn@gmail.com',
    href: 'mailto:kessoku.eventvn@gmail.com',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: Facebook,
    label: 'Facebook',
    value: 'Kessoku Event',
    href: 'https://www.facebook.com/Kessoku.Event',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: MessageCircle,
    label: 'Zalo',
    value: '0983 732 666',
    href: 'https://zalo.me/0983732666',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-orange-500/5 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold">Liên hệ với chúng tôi</h1>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Đội ngũ Kessoku Event luôn sẵn sàng hỗ trợ bạn. Hãy liên hệ qua bất kỳ kênh nào bên dưới.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {contactInfo.map((item, i) => (
            <motion.a
              key={item.label}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className={`shrink-0 size-12 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <item.icon className={`size-6 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-semibold group-hover:text-primary transition-colors">{item.value}</p>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 p-6 rounded-xl border border-border bg-muted/30"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
              <Clock className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Giờ làm việc</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Thứ Hai — Thứ Sáu: 8:00 — 17:30
              </p>
              <p className="text-sm text-muted-foreground">
                Thứ Bảy: 8:00 — 12:00
              </p>
              <p className="text-sm text-muted-foreground">
                Chủ nhật: Nghỉ
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 mt-5">
            <div className="shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
              <MapPin className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Địa chỉ</h3>
              <p className="text-sm text-muted-foreground mt-1">
                123 Đường ABC, Phường XYZ, Quận 1, TP. Hồ Chí Minh
              </p>
            </div>
          </div>
        </motion.div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
