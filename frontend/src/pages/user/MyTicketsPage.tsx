import { Select } from '@/components/ui/Select';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { cn, formatDate, formatPrice } from '@/lib/utils';
import { orderService } from '@/services';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, Filter, Loader2, MapPin, Search, Ticket, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
    valid: 'bg-green-500/10 text-green-600 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    used: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabels: Record<string, string> = {
    valid: 'Hợp lệ',
    pending: 'Đang chờ thanh toán',
    used: 'Đã sử dụng',
    cancelled: 'Đã hủy',
};

export default function MyTicketsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [status, setStatus] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

    const activeFiltersCount = [location, date, status].filter(Boolean).length;

    const { data, isLoading } = useQuery({
        queryKey: ['my-tickets', { location, date, status, search: searchQuery }],
        queryFn: () =>
            orderService
                .getMyTickets({
                    limit: 100,
                    location,
                    date,
                    status,
                    search: searchQuery,
                })
                .then((r) => r.data.data),
    });

    const filteredTickets = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
            const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
            return dateB - dateA;
        });
    }, [data]);

    const handleRetryPayment = async (orderId: string) => {
        setPayingOrderId(orderId);
        try {
            const res = await orderService.getPaymentUrl(orderId);
            const paymentUrl = res.data?.data?.payment_url;
            if (paymentUrl) {
                toast.info('Đang chuyển đến trang thanh toán VNPay...');
                window.location.href = paymentUrl;
            } else {
                toast.error('Không thể tạo liên kết thanh toán. Vui lòng thử lại.');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setPayingOrderId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 shrink-0">
                    <Ticket className="size-6 text-primary" />
                    Vé của tôi
                </h1>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Tìm theo sự kiện hoặc mã vé..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 h-10 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    {/* Filter Popover */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-10 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all w-full sm:w-auto ${
                                showFilters || activeFiltersCount > 0
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-background border-input hover:bg-muted'
                            }`}
                        >
                            <Filter className="size-4" />
                            <span className="font-medium hidden sm:inline">Bộ lọc</span>
                            {activeFiltersCount > 0 && (
                                <span className="flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>

                        {showFilters && (
                            <>
                                <div
                                    className="fixed inset-0 z-10 hidden sm:block delay-100"
                                    onClick={() => setShowFilters(false)}
                                />
                                <div className="absolute right-0 top-full sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 p-4 bg-card border border-border shadow-xl rounded-2xl z-20">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-sm">Lọc vé của bạn</h3>
                                        <button
                                            onClick={() => setShowFilters(false)}
                                            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                                                Địa điểm
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    placeholder="Nhập địa điểm..."
                                                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                                                Ngày tổ chức
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={date}
                                                    onChange={(e) => setDate(e.target.value)}
                                                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                                                Trạng thái vé
                                            </label>
                                            <Select
                                                value={status}
                                                onChange={(v) => setStatus(v)}
                                                placeholder="Tất cả trạng thái"
                                                options={[
                                                    { value: '', label: 'Tất cả trạng thái' },
                                                    { value: 'valid', label: 'Hợp lệ' },
                                                    {
                                                        value: 'pending',
                                                        label: 'Đang chờ thanh toán',
                                                    },
                                                    { value: 'used', label: 'Đã sử dụng' },
                                                    { value: 'cancelled', label: 'Đã hủy' },
                                                ]}
                                            />
                                        </div>

                                        {activeFiltersCount > 0 && (
                                            <div className="mt-2 pt-4 border-t border-border">
                                                <button
                                                    onClick={() => {
                                                        setLocation('');
                                                        setDate('');
                                                        setStatus('');
                                                    }}
                                                    className="w-full py-2 text-sm text-red-500 font-medium hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    Xóa bộ lọc
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <CardSkeleton key={i} />
                    ))}
                </div>
            ) : filteredTickets.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-xl">
                    <Ticket className="size-12 mx-auto mb-4 opacity-50 text-primary" />
                    <p>{searchQuery ? 'Không tìm thấy vé nào phù hợp' : 'Bạn chưa có vé nào'}</p>
                    {!searchQuery && (
                        <p className="text-sm mt-1">Hãy mua vé để tham gia sự kiện!</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTickets.map((ticket: any, i: number) => (
                        <motion.div
                            key={ticket.id || ticket.ticket_code}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="p-4 sm:p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base sm:text-lg line-clamp-2">
                                            {ticket.event?.title || 'Sự kiện'}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-sm text-primary font-medium">
                                                {ticket.ticket_type?.name ||
                                                    ticket.ticket_type_name ||
                                                    'Vé tiêu chuẩn'}
                                            </p>
                                            {ticket.seat && (
                                                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                                                    {ticket.seat.room} • {ticket.seat.row} - Số{' '}
                                                    {ticket.seat.number}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs sm:text-sm text-muted-foreground">
                                            {ticket.event?.start_time && (
                                                <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                                                    <Calendar className="size-3.5" />
                                                    {formatDate(ticket.event.start_time)}
                                                </span>
                                            )}
                                            {ticket.event?.location && (
                                                <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                                                    <MapPin className="size-3.5" />
                                                    <span className="truncate max-w-[200px]">
                                                        {ticket.event.location}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <span
                                        className={cn(
                                            'shrink-0 text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full border',
                                            statusColors[ticket.status] ||
                                                'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {statusLabels[ticket.status] || ticket.status}
                                    </span>
                                </div>

                                {/* QR Code or Status Tag Area */}
                                <div className="mt-5 flex justify-center border-t border-dashed border-border pt-5">
                                    {ticket.status === 'valid' && ticket.qr_code ? (
                                        <div className="p-3 bg-white rounded-xl shadow-sm border border-border flex items-center justify-center h-[152px] w-[152px] sm:h-[184px] sm:w-[184px]">
                                            <img
                                                src={ticket.qr_code}
                                                alt="QR Code"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ) : ticket.status === 'used' && ticket.used_at ? (
                                        <div className="bg-gray-500/10 border border-gray-500/20 text-gray-500 rounded-xl text-center flex flex-col items-center justify-center h-[152px] w-[152px] sm:h-[184px] sm:w-[184px] p-4">
                                            <p className="font-semibold text-sm sm:text-base">
                                                Vé đã được sử dụng
                                            </p>
                                            <p className="text-xs sm:text-sm mt-1">
                                                Vào lúc: {formatDate(ticket.used_at)}
                                            </p>
                                        </div>
                                    ) : ticket.status === 'cancelled' ? (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center flex flex-col items-center justify-center h-[152px] w-[152px] sm:h-[184px] sm:w-[184px] p-4">
                                            <p className="font-semibold text-sm sm:text-base">
                                                Vé đã bị hủy
                                            </p>
                                        </div>
                                    ) : ticket.status === 'pending' ? (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 rounded-xl text-center flex flex-col items-center justify-center h-auto w-full sm:w-[260px] p-5 gap-3">
                                            <p className="font-semibold text-sm sm:text-base">
                                                Chờ thanh toán
                                            </p>
                                            <p className="text-xs text-yellow-600/80 text-balance">
                                                Ấn nút bên dưới để hoàn tất thanh toán
                                            </p>
                                            <button
                                                onClick={() => handleRetryPayment(ticket.order_id)}
                                                disabled={payingOrderId === ticket.order_id}
                                                className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
                                            >
                                                {payingOrderId === ticket.order_id ? (
                                                    <>
                                                        <Loader2 className="size-4 animate-spin" />
                                                        Đang xử lý...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard className="size-4" />
                                                        Thanh toán ngay
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-muted/30 border border-dashed border-border text-muted-foreground rounded-xl text-center flex flex-col items-center justify-center h-[152px] w-[152px] sm:h-[184px] sm:w-[184px] p-4">
                                            <p className="font-medium text-sm">
                                                Chưa có thông tin QR
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm border-t border-border pt-4 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        Mã vé:{' '}
                                        <span className="font-mono bg-muted px-2 py-0.5 rounded-md text-foreground">
                                            {ticket.ticket_code}
                                        </span>
                                    </div>
                                    <span className="font-medium text-foreground">
                                        {ticket.price_at_purchase > 0
                                            ? formatPrice(ticket.price_at_purchase)
                                            : 'Miễn phí'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
