import {
    asyncHandler,
    createLogger,
    respond,
    transformOrder,
    transformTicket,
} from '@evient/shared';
import { Request, Response } from 'express';
import { customAlphabet } from 'nanoid';
import QRCode from 'qrcode';
import {
    IpnOrderAlreadyConfirmed,
    IpnFailChecksum,
    IpnInvalidAmount,
    IpnOrderNotFound,
    IpnSuccess,
    IpnUnknownError,
} from 'vnpay';
import { ITicketDocument, Order, Ticket } from '../models';
import { buildPaymentUrl, verifyIpn, verifyReturn } from '../utils/vnpay';

const logger = createLogger('order-controller');
const generateTicketCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

import mongoose from 'mongoose';

// ==================== Helper: Generate tickets for an order ====================

async function generateTicketsForOrder(order: any, ticketStatus: 'valid' | 'pending' = 'valid') {
    const items = order.items;
    const userId = order.userId;
    const event_id = order.eventId;
    const event_snapshot = order.eventSnapshot;
    const buyer_info = order.buyerSnapshot;
    let seat_assignments = order.seatAssignmentsSnapshot ? [...order.seatAssignmentsSnapshot] : [];

    const requestedTotalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    const ticketDocs: Partial<ITicketDocument>[] = [];
    for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
            const ticketCode = `EVT-${generateTicketCode()}-${generateTicketCode()}`;
            const qrCode = await QRCode.toDataURL(ticketCode, { width: 300, margin: 2 });

            let seatAssignment;
            if (seat_assignments && seat_assignments.length > 0) {
                const seatIndex = seat_assignments.findIndex(
                    (s: any) => s.ticket_type_id === item.ticketTypeId?.toString(),
                );
                if (seatIndex !== -1) {
                    seatAssignment = seat_assignments.splice(seatIndex, 1)[0];
                } else {
                    seatAssignment = seat_assignments.shift();
                }
            }

            ticketDocs.push({
                ticketCode,
                qrCode,
                userId: userId as any,
                eventId: event_id,
                orderId: order._id,
                ticketTypeId: item.ticketTypeId,
                ticketTypeName: item.ticketTypeName,
                priceAtPurchase: item.unitPrice,
                status: ticketStatus,
                eventSnapshot: event_snapshot || undefined,
                buyerSnapshot: buyer_info || undefined,
                seatSnapshot: seatAssignment
                    ? {
                          roomName: seatAssignment.roomName,
                          row: seatAssignment.row,
                          number: seatAssignment.number,
                      }
                    : undefined,
            });
        }
    }

    const tickets = await Ticket.insertMany(ticketDocs);

    // Only send notifications for confirmed (valid) tickets
    if (ticketStatus === 'valid') {
        await sendTicketNotifications(order, tickets);
    }

    return tickets;
}

// ==================== Helper: Activate pending tickets → valid ====================

async function activateTicketsForOrder(order: any) {
    const result = await Ticket.updateMany(
        { orderId: order._id, status: 'pending' },
        { $set: { status: 'valid' } },
    );
    logger.info(`Activated ${result.modifiedCount} tickets for order ${order._id}`);

    // Now send notifications
    const tickets = await Ticket.find({ orderId: order._id, status: 'valid' }).lean();
    await sendTicketNotifications(order, tickets);
}

// ==================== Helper: Cancel tickets for an order ====================

async function cancelTicketsForOrder(orderId: any) {
    const result = await Ticket.updateMany(
        { orderId, status: 'pending' },
        { $set: { status: 'cancelled' } },
    );
    logger.info(`Cancelled ${result.modifiedCount} pending tickets for order ${orderId}`);
}

// ==================== Helper: Send notifications after payment confirmed ====================

async function sendTicketNotifications(order: any, tickets: any[]) {
    const event_snapshot = order.eventSnapshot;
    const buyer_info = order.buyerSnapshot;
    const userId = order.userId;
    const requestedTotalQty = order.items.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0,
    );

    try {
        const axios = (await import('axios')).default;
        const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

        // In-app notification
        await axios.post(`${notificationUrl}/api/notifications/user-notifications`, {
            user_id: userId,
            title: 'Đặt vé thành công',
            message: `Bạn đã mua thành công ${requestedTotalQty} vé cho sự kiện "${event_snapshot?.title || 'Sự kiện'}".`,
            type: 'ticket_booked',
            link: '/my-tickets',
        });

        // Send emails
        if (buyer_info?.email && tickets && tickets.length > 0) {
            const emailPromises = tickets.map((t: any) => {
                return axios.post(`${notificationUrl}/api/notifications/send-ticket`, {
                    email: buyer_info.email,
                    event_title: event_snapshot?.title || 'Sự kiện',
                    event_date: event_snapshot?.startTime
                        ? new Date(event_snapshot.startTime).toLocaleString('vi-VN')
                        : undefined,
                    event_location: event_snapshot?.location || undefined,
                    tickets: [
                        {
                            ticket_code: t.ticketCode,
                            ticket_type_name: t.ticketTypeName,
                            seat: t.seatSnapshot
                                ? `${t.seatSnapshot.row} - Số ${t.seatSnapshot.number}`
                                : undefined,
                        },
                    ],
                });
            });
            Promise.allSettled(emailPromises).catch(console.error);
        }

        // Track activity
        if (tickets && tickets.length > 0) {
            const buyerName = buyer_info?.fullName || buyer_info?.email || 'Khách vãng lai';
            await axios.post(`${notificationUrl}/api/notifications/activities`, {
                type: 'ticket',
                title: `Vé ${tickets[0].ticketCode}${tickets.length > 1 ? ` và ${tickets.length - 1} vé khác` : ''} đã được bán cho ${buyerName}`,
                details: { orderId: order._id, quantity: requestedTotalQty },
            });
        }
    } catch (err: any) {
        logger.warn('Failed to send notification:', err.message);
    }
}

// ==================== POST /orders - Create order ====================

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
    const {
        event_id,
        items,
        payment_method,
        event_snapshot,
        seat_assignments,
        user_id: customUserId,
        buyer_info,
    } = req.body;

    // Allow admin to override the purchaser (granting tickets)
    const isGrantingForOther = req.user!.role === 'admin' && customUserId;
    const userId = isGrantingForOther ? customUserId : req.user!.id;

    if (!items || items.length === 0) {
        return respond.error(res, 'Order must have at least one item');
    }

    // Calculate requested tickets quantity
    const requestedTotalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    // 1. Validate event & Deduct quantity
    const EventModel = (await import('../models')).EventLocal;
    const event = await EventModel.findById(event_id);
    if (!event) return respond.notFound(res, 'Event not found');

    // Validate quantities and per-ticket-type user limits
    const updates: any[] = [];
    for (const item of items) {
        const tType = (event.get('ticketTypes') || []).find(
            (t: any) =>
                (t._id && t._id.toString() === item.ticket_type_id) ||
                (t.id && t.id.toString() === item.ticket_type_id),
        );
        if (!tType) return respond.error(res, `Loại vé ${item.ticket_type_name} không tồn tại.`);

        // Check per-ticket-type user limit
        const maxPerUser = tType.maxPerUser ?? -1;
        if (maxPerUser !== -1) {
            const userExistingForType = await Ticket.countDocuments({
                eventId: event_id as any,
                ticketTypeId: item.ticket_type_id as any,
                userId: userId as any,
                status: { $in: ['valid', 'used'] },
            });
            if (userExistingForType + item.quantity > maxPerUser) {
                return respond.error(
                    res,
                    `Bạn chỉ được mua tối đa ${maxPerUser} vé loại "${item.ticket_type_name}" (hiện tại đã mua ${userExistingForType} vé).`,
                    400,
                );
            }
        }

        // Check stock availability
        if (tType.quantityTotal !== -1) {
            const available = tType.quantityTotal - (tType.quantitySold || 0);
            if (item.quantity > available) {
                return respond.error(
                    res,
                    `Loại vé ${item.ticket_type_name} chỉ còn lại ${available} vé.`,
                    400,
                );
            }
        }

        updates.push({
            updateOne: {
                filter: {
                    _id: new mongoose.Types.ObjectId(event_id),
                    'ticketTypes._id': new mongoose.Types.ObjectId(item.ticket_type_id),
                },
                update: { $inc: { 'ticketTypes.$.quantitySold': item.quantity } },
            },
        });
    }

    // Validate Seat Availability to prevent double booking
    if (seat_assignments && seat_assignments.length > 0) {
        const existingTickets = await Ticket.find({
            eventId: event_id as any,
            status: { $in: ['valid', 'used', 'pending'] },
        })
            .select('seatSnapshot')
            .lean();

        const soldSeats = new Set(
            existingTickets
                .filter((t: any) => t.seatSnapshot && t.seatSnapshot.row && t.seatSnapshot.number)
                .map((t: any) => `${t.seatSnapshot.row}-${t.seatSnapshot.number}`),
        );

        for (const seat of seat_assignments) {
            if (soldSeats.has(`${seat.row}-${seat.number}`)) {
                return respond.error(
                    res,
                    `${seat.row} - Số ${seat.number} đã được người khác đặt. Vui lòng chọn ghế khác!`,
                    400,
                );
            }
        }
    }

    // Execute atomic bulk update on the event collection
    logger.info(
        `bulkWrite updates: ${JSON.stringify(updates.map((u) => ({ filter: u.updateOne.filter, update: u.updateOne.update })))}`,
    );
    const bulkResult = await EventModel.bulkWrite(updates);
    logger.info(
        `bulkWrite result: matchedCount=${bulkResult.matchedCount}, modifiedCount=${bulkResult.modifiedCount}`,
    );

    // Calculate total
    const totalAmount = items.reduce(
        (sum: number, item: any) => sum + Number(item.unit_price) * item.quantity,
        0,
    );

    // Determine if this is a free order (0 VND) or a paid order
    const isFree = totalAmount === 0;
    const method = isFree ? 'free' : 'vnpay';

    const order = await Order.create({
        userId,
        eventId: event_id,
        buyerSnapshot: buyer_info || undefined,
        items: items.map((item: any) => ({
            ticketTypeId: item.ticket_type_id,
            ticketTypeName: item.ticket_type_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
        })),
        totalAmount,
        status: isFree ? 'paid' : 'pending',
        paymentMethod: method,
        eventSnapshot: event_snapshot || undefined,
        seatAssignmentsSnapshot: seat_assignments || [],
        paidAt: isFree ? new Date() : undefined,
    });

    // --- ALWAYS generate tickets (pending for VNPay, valid for free) ---
    const ticketStatus = isFree ? 'valid' : 'pending';
    const tickets = await generateTicketsForOrder(order, ticketStatus);

    // --- FREE ORDER: Done ---
    if (isFree) {
        return respond.successWithMessage(
            res,
            {
                order: transformOrder(order.toObject()),
                tickets: tickets.map((t: any) => transformTicket(t.toObject ? t.toObject() : t)),
            },
            'Order created successfully',
            201,
        );
    }

    // --- PAID ORDER: Create VNPay payment URL ---
    try {
        const returnUrl =
            process.env.VNP_RETURN_URL || 'http://localhost:5173/payment/vnpay-return';
        const ipAddr = req.ip || req.socket?.remoteAddress || '127.0.0.1';

        const paymentUrl = buildPaymentUrl({
            amount: totalAmount,
            orderId: order._id.toString(),
            orderInfo: `Thanh toan don hang ${order._id.toString()}`,
            ipAddr,
            returnUrl,
        });

        // Save the txn ref (using order._id as txn ref)
        order.vnpayTxnRef = order._id.toString();
        await order.save();

        logger.info(
            `VNPay payment URL created for order ${order._id}: ${paymentUrl.substring(0, 100)}...`,
        );

        return respond.successWithMessage(
            res,
            {
                order: transformOrder(order.toObject()),
                tickets: tickets.map((t: any) => transformTicket(t.toObject ? t.toObject() : t)),
                payment_url: paymentUrl,
            },
            'Vui lòng thanh toán qua VNPay',
            201,
        );
    } catch (err: any) {
        logger.error('Failed to create VNPay payment URL:', err);
        // Rollback: cancel the order, tickets, and restore quantities
        order.status = 'cancelled';
        await order.save();
        await cancelTicketsForOrder(order._id);
        await restoreTicketQuantities(order);
        return respond.error(
            res,
            'Không thể tạo liên kết thanh toán VNPay. Vui lòng thử lại.',
            500,
        );
    }
});

// ==================== GET /orders/vnpay-ipn - VNPay IPN Callback ====================

export const vnpayIpn = asyncHandler(async (req: Request, res: Response) => {
    try {
        const verify = verifyIpn(req.query as any);

        if (!verify.isVerified) {
            logger.warn('VNPay IPN: checksum verification failed');
            return res.json(IpnFailChecksum);
        }

        const orderId = verify.vnp_TxnRef;
        const order = await Order.findById(orderId);

        if (!order) {
            logger.warn(`VNPay IPN: order not found: ${orderId}`);
            return res.json(IpnOrderNotFound);
        }

        // VNPay sends amount * 100
        if (verify.vnp_Amount !== order.totalAmount) {
            logger.warn(
                `VNPay IPN: amount mismatch. Expected ${order.totalAmount}, got ${verify.vnp_Amount}`,
            );
            return res.json(IpnInvalidAmount);
        }

        if (order.status === 'paid') {
            logger.info(`VNPay IPN: order ${orderId} already confirmed`);
            return res.json(IpnOrderAlreadyConfirmed);
        }

        if (verify.isSuccess) {
            // Payment successful — activate pending tickets to valid
            order.status = 'paid';
            order.paidAt = new Date();
            await order.save();

            logger.info(`VNPay IPN: order ${orderId} paid successfully, activating tickets...`);
            await activateTicketsForOrder(order);

            return res.json(IpnSuccess);
        } else {
            // Payment failed — cancel order and tickets, restore quantities
            if (order.status === 'pending') {
                order.status = 'cancelled';
                await order.save();

                await cancelTicketsForOrder(order._id);
                await restoreTicketQuantities(order);

                logger.info(`VNPay IPN: order ${orderId} payment failed, cancelled`);
            } else {
                logger.info(`VNPay IPN: order ${orderId} payment failed but order is already ${order.status}`);
            }
            return res.json(IpnSuccess); // Still return success to VNPay (we received the notification)
        }
    } catch (error: any) {
        logger.error('VNPay IPN error:', error);
        return res.json(IpnUnknownError);
    }
});

// ==================== GET /orders/vnpay-return - VNPay Return URL ====================

export const vnpayReturn = asyncHandler(async (req: Request, res: Response) => {
    try {
        const verify = verifyReturn(req.query as any);

        const orderId = verify.vnp_TxnRef;
        const order = await Order.findById(orderId);

        if (!verify.isVerified) {
            return respond.error(res, 'Xác thực thanh toán thất bại', 400);
        }

        if (verify.isSuccess) {
            // If IPN hasn't processed yet, do it now
            if (order && order.status === 'pending') {
                order.status = 'paid';
                order.paidAt = new Date();
                await order.save();
                await activateTicketsForOrder(order);
            }

            return respond.successWithMessage(
                res,
                {
                    order_id: orderId,
                    status: 'paid',
                    message: verify.message,
                },
                'Thanh toán thành công!',
            );
        } else {
            if (order && order.status === 'pending') {
                order.status = 'cancelled';
                await order.save();
                await cancelTicketsForOrder(order._id);
                await restoreTicketQuantities(order);
            }

            return respond.error(res, verify.message || 'Thanh toán thất bại', 400);
        }
    } catch (error: any) {
        logger.error('VNPay return verify error:', error);
        return respond.error(res, 'Lỗi xác thực thanh toán', 500);
    }
});

// ==================== Helper: Restore ticket quantities on cancelled orders ====================

async function restoreTicketQuantities(order: any) {
    try {
        const EventModel = (await import('../models')).EventLocal;
        const rollbackUpdates = order.items.map((item: any) => ({
            updateOne: {
                filter: {
                    _id: new mongoose.Types.ObjectId(order.eventId),
                    'ticketTypes._id': new mongoose.Types.ObjectId(item.ticketTypeId),
                },
                update: { $inc: { 'ticketTypes.$.quantitySold': -item.quantity } },
            },
        }));
        await EventModel.bulkWrite(rollbackUpdates);
        logger.info(`Restored ticket quantities for cancelled order ${order._id}`);
    } catch (err: any) {
        logger.error('Failed to restore ticket quantities:', err);
    }
}

// ==================== Auto-cancel expired pending orders ====================

export async function cancelExpiredOrders() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const expiredOrders = await Order.find({
        status: 'pending',
        createdAt: { $lte: fifteenMinutesAgo },
    });

    for (const order of expiredOrders) {
        const result = await Order.updateOne(
            { _id: order._id, status: 'pending' },
            { $set: { status: 'cancelled' } }
        );

        if (result.modifiedCount > 0) {
            await cancelTicketsForOrder(order._id);
            await restoreTicketQuantities(order);
            logger.info(`Auto-cancelled expired order ${order._id}`);
        }
    }

    if (expiredOrders.length > 0) {
        logger.info(`Cancelled ${expiredOrders.length} expired pending orders`);
    }
}

// ==================== GET /orders/my-tickets ====================

export const getMyTickets = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string;
    const search = req.query.search as string;

    const filter: any = { userId: req.user!.id };
    if (status) filter.status = status;
    if (search) {
        filter.$or = [
            { ticketCode: { $regex: search, $options: 'i' } },
            { 'eventSnapshot.title': { $regex: search, $options: 'i' } },
        ];
    }

    const location = req.query.location as string;
    const dateStr = req.query.date as string;

    if (location) {
        filter['eventSnapshot.location'] = { $regex: location, $options: 'i' };
    }

    if (dateStr) {
        const dateQuery = new Date(dateStr);
        if (!isNaN(dateQuery.getTime())) {
            const nextDay = new Date(dateQuery);
            nextDay.setDate(dateQuery.getDate() + 1);
            filter['eventSnapshot.startTime'] = {
                $gte: dateQuery.toISOString(),
                $lt: nextDay.toISOString(),
            };
        }
    }

    const [tickets, total] = await Promise.all([
        Ticket.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Ticket.countDocuments(filter),
    ]);

    respond.paginated(res, tickets.map(transformTicket), { page, limit, total });
});

// ==================== GET /orders/remaining/:eventId ====================

export const getRemainingTickets = asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;

    const soldByType = await Ticket.aggregate([
        { $match: { eventId: eventId as any, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$ticketTypeId', sold: { $sum: 1 } } },
    ]);

    respond.success(
        res,
        soldByType.map((item) => ({
            ticket_type_id: item._id?.toString(),
            sold: item.sold,
        })),
    );
});

// ==================== GET /orders/events/:eventId/sold-seats ====================

export const getSoldSeats = asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;

    const tickets = await Ticket.find({
        eventId: eventId as any,
        status: { $in: ['valid', 'used'] },
    })
        .select('seatSnapshot')
        .lean();

    // Also include seats reserved by pending (not yet paid) orders
    const pendingOrders = await Order.find({
        eventId: eventId as any,
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }, // Only recent pending
    })
        .select('seatAssignmentsSnapshot')
        .lean();

    const soldSeats = tickets
        .filter((t: any) => t.seatSnapshot && t.seatSnapshot.row && t.seatSnapshot.number)
        .map((t: any) => `${t.seatSnapshot.row}-${t.seatSnapshot.number}`);

    // Add pending seats too (temporarily reserved)
    const pendingSeats = pendingOrders.flatMap((o: any) =>
        (o.seatAssignmentsSnapshot || [])
            .filter((s: any) => s.row && s.number)
            .map((s: any) => `${s.row}-${s.number}`),
    );

    const allReserved = [...new Set([...soldSeats, ...pendingSeats])];

    respond.success(res, allReserved);
});

// ==================== Admin Ticket Management ====================

export const getTickets = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string;
    const eventId = req.query.event_id as string;
    const search = req.query.search as string;

    const filter: any = {};
    if (status) filter.status = status;
    if (eventId) filter.eventId = eventId;
    if (search) filter.ticketCode = { $regex: search, $options: 'i' };

    const [tickets, total] = await Promise.all([
        Ticket.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Ticket.countDocuments(filter),
    ]);

    respond.paginated(res, tickets.map(transformTicket), { page, limit, total });
});

export const validateQR = asyncHandler(async (req: Request, res: Response) => {
    const { ticket_code } = req.body;

    const ticket = await Ticket.findOne({ ticketCode: ticket_code });
    if (!ticket) {
        return respond.error(res, 'Không tìm thấy vé với mã này', 404);
    }

    if (ticket.status === 'cancelled') {
        return respond.error(res, 'Vé này đã bị huỷ', 400);
    }

    if (ticket.status === 'used') {
        const usedTime = ticket.usedAt
            ? new Date(ticket.usedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            : 'N/A';
        return respond.error(res, `Vé đã được sử dụng lúc ${usedTime}`, 400);
    }

    // Backfill buyerSnapshot if missing (legacy tickets)
    const hasBuyerInfo = ticket.buyerSnapshot && ticket.buyerSnapshot.fullName;
    if (!hasBuyerInfo && ticket.userId) {
        try {
            const axios = (await import('axios')).default;
            const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
            const { data: userData } = await axios.get(
                `${authUrl}/api/users/${ticket.userId.toString()}`,
                {
                    headers: { Authorization: req.headers.authorization || '' },
                },
            );
            if (userData?.data) {
                const user = userData.data;
                ticket.buyerSnapshot = {
                    fullName: user.full_name || user.fullName || '',
                    email: user.email || '',
                };
                logger.info(
                    `Backfilled buyerSnapshot for ticket ${ticket.ticketCode}: ${user.full_name || user.fullName}`,
                );
            }
        } catch (err: any) {
            logger.warn('Could not fetch buyer info for backfill:', err.message);
        }
    }

    // Mark as used
    ticket.status = 'used';
    ticket.usedAt = new Date();
    await ticket.save();

    respond.successWithMessage(
        res,
        {
            ticket: transformTicket(ticket.toObject()),
            check_in_time: ticket.usedAt.toISOString(),
        },
        'Check-in thành công!',
    );
});

export const getTicketInfo = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await Ticket.findOne({ ticketCode: req.params.code });
    if (!ticket) {
        return respond.notFound(res, 'Không tìm thấy vé với mã này');
    }

    const hasBuyer = ticket.buyerSnapshot && ticket.buyerSnapshot.fullName;
    if (!hasBuyer && ticket.userId) {
        try {
            const axios = (await import('axios')).default;
            const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
            const { data: userData } = await axios.get(
                `${authUrl}/api/users/${ticket.userId.toString()}`,
                {
                    headers: { Authorization: req.headers.authorization || '' },
                },
            );
            if (userData?.data) {
                const user = userData.data;
                ticket.buyerSnapshot = {
                    fullName: user.full_name || user.fullName || '',
                    email: user.email || '',
                };
                logger.info(
                    `Backfilled buyerSnapshot for ticket ${ticket.ticketCode}: ${user.full_name || user.fullName}`,
                );
            }
        } catch (err: any) {
            logger.warn('Could not fetch buyer info for backfill:', err.message);
        }
    }

    respond.success(res, transformTicket(ticket.toObject()));
});

export const resendTicketEmail = asyncHandler(async (req: Request, res: Response) => {
    const { ticket_id } = req.body;

    const ticket = await Ticket.findById(ticket_id).lean();
    if (!ticket) {
        return respond.notFound(res, 'Ticket not found');
    }

    const email = ticket.buyerSnapshot?.email;
    if (!email) {
        return respond.error(res, 'Vé không có địa chỉ email người mua', 400);
    }

    try {
        const axios = (await import('axios')).default;
        const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
        
        await axios.post(`${notificationUrl}/api/notifications/send-ticket`, {
            email: email,
            event_title: ticket.eventSnapshot?.title || 'Sự kiện',
            event_date: ticket.eventSnapshot?.startTime
                ? new Date(ticket.eventSnapshot.startTime).toLocaleString('vi-VN')
                : undefined,
            event_location: ticket.eventSnapshot?.location || undefined,
            tickets: [
                {
                    ticket_code: ticket.ticketCode,
                    ticket_type_name: ticket.ticketTypeName,
                    seat: ticket.seatSnapshot
                        ? `${ticket.seatSnapshot.row} - Số ${ticket.seatSnapshot.number}`
                        : undefined,
                },
            ],
        });
        
        logger.info(`Resent email for ticket ${ticket.ticketCode} to ${email}`);
        respond.successMessage(res, 'Gửi lại email vé thành công');
    } catch (err: any) {
        logger.error(`Failed to resend email for ticket ${ticket.ticketCode}:`, err.message);
        return respond.error(res, 'Lỗi khi gửi lại email', 500);
    }
});

export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.id;

    const order = await Order.findByIdAndDelete(orderId);
    if (!order) {
        return respond.notFound(res, 'Order not found');
    }

    await Ticket.deleteMany({ orderId });
    respond.successMessage(res, 'Order and associated tickets deleted successfully');
});

export const updateTicket = asyncHandler(async (req: Request, res: Response) => {
    const { status, seatSnapshot } = req.body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (seatSnapshot !== undefined) updateData.seatSnapshot = seatSnapshot;

    const ticket = await Ticket.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true },
    );
    if (!ticket) {
        return respond.notFound(res, 'Ticket not found');
    }

    respond.successWithMessage(
        res,
        transformTicket(ticket.toObject()),
        'Ticket updated successfully',
    );
});

export const getRevenueReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const match: any = { status: 'paid' };

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate as string);
        if (endDate) match.createdAt.$lte = new Date(endDate as string);
    }

    const revenueByDate = await Order.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Ho_Chi_Minh" } },
                totalRevenue: { $sum: '$totalAmount' },
                totalTickets: { $sum: { $sum: '$items.quantity' } },
                orderCount: { $sum: 1 },
            },
        },
        { $sort: { _id: -1 } },
    ]);

    const data = revenueByDate.map((r: any) => ({
        date: r._id,
        totalRevenue: r.totalRevenue,
        totalTickets: r.totalTickets,
        orderCount: r.orderCount,
    }));

    const grandTotal = data.reduce((sum: number, item: any) => sum + item.totalRevenue, 0);

    respond.success(res, { data, grandTotal });
});
