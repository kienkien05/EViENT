import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { customAlphabet } from 'nanoid';
import { respond, transformOrder, transformTicket, asyncHandler, createLogger } from '@evient/shared';
import { Order, Ticket, ITicketDocument } from '../models';

const logger = createLogger('order-controller');
const generateTicketCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

import mongoose from 'mongoose';

/**
 * POST /orders - Create order and generate tickets
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { event_id, items, payment_method, event_snapshot, seat_assignments, user_id: customUserId, buyer_info } = req.body;
  
  // Allow admin to override the purchaser (granting tickets)
  const isGrantingForOther = req.user!.role === 'admin' && customUserId;
  const userId = isGrantingForOther ? customUserId : req.user!.id;

  if (!items || items.length === 0) {
    return respond.error(res, 'Order must have at least one item');
  }

  // Calculate requested tickets quantity
  const requestedTotalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  // 1. Validate event & Deduct quantity
  // Need to read the direct Event document from MongoDB since Order & Event share the same DB
  const EventModel = (await import('../models')).EventLocal;
  const event = await EventModel.findById(event_id);
  if (!event) return respond.notFound(res, 'Event not found');

  // Validate quantities and per-ticket-type user limits
  const updates: any[] = [];
  for (const item of items) {
    const tType = (event.get('ticketTypes') || []).find((t: any) => 
      (t._id && t._id.toString() === item.ticket_type_id) || 
      (t.id && t.id.toString() === item.ticket_type_id)
    );
    if (!tType) return respond.error(res, `Loại vé ${item.ticket_type_name} không tồn tại.`);
    
    // Check per-ticket-type user limit
    const maxPerUser = tType.maxPerUser ?? -1;
    if (maxPerUser !== -1) {
      const userExistingForType = await Ticket.countDocuments({
        eventId: event_id as any,
        ticketTypeId: item.ticket_type_id as any,
        userId: userId as any,
        status: { $in: ['valid', 'used'] }
      });
      if (userExistingForType + item.quantity > maxPerUser) {
        return respond.error(res, `Bạn chỉ được mua tối đa ${maxPerUser} vé loại "${item.ticket_type_name}" (hiện tại đã mua ${userExistingForType} vé).`, 400);
      }
    }

    // Check stock availability
    if (tType.quantityTotal !== -1) {
      const available = tType.quantityTotal - (tType.quantitySold || 0);
      if (item.quantity > available) {
        return respond.error(res, `Loại vé ${item.ticket_type_name} chỉ còn lại ${available} vé.`, 400);
      }
    }

    updates.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(event_id), "ticketTypes._id": new mongoose.Types.ObjectId(item.ticket_type_id) },
        update: { $inc: { "ticketTypes.$.quantitySold": item.quantity } }
      }
    });
  }

  // Validate Seat Availability to prevent double booking
  if (seat_assignments && seat_assignments.length > 0) {
    const existingTickets = await Ticket.find({
      eventId: event_id as any,
      status: { $in: ['valid', 'used'] }
    }).select('seatSnapshot').lean();

    const soldSeats = new Set(
      existingTickets
        .filter((t: any) => t.seatSnapshot && t.seatSnapshot.row && t.seatSnapshot.number)
        .map((t: any) => `${t.seatSnapshot.row}-${t.seatSnapshot.number}`)
    );

    for (const seat of seat_assignments) {
      if (soldSeats.has(`${seat.row}-${seat.number}`)) {
        return respond.error(res, `${seat.row} - Số ${seat.number} đã được người khác đặt. Vui lòng chọn ghế khác!`, 400);
      }
    }
  }

  // Execute atomic bulk update on the event collection
  logger.info(`bulkWrite updates: ${JSON.stringify(updates.map(u => ({ filter: u.updateOne.filter, update: u.updateOne.update })))}`);
  const bulkResult = await EventModel.bulkWrite(updates);
  logger.info(`bulkWrite result: matchedCount=${bulkResult.matchedCount}, modifiedCount=${bulkResult.modifiedCount}`);

  // Calculate total
  const totalAmount = items.reduce((sum: number, item: any) =>
    sum + (Number(item.unit_price) * item.quantity), 0
  );

  // If amount > 0 and no payment method specified, default to vnpay
  const method = payment_method || (totalAmount > 0 ? 'vnpay' : 'free');

  // Create order in 'pending' if payment is required (vnpay), otherwise 'paid' for 'free'
  const isFree = totalAmount === 0 || method === 'free';

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
    seatAssignmentsSnapshot: seat_assignments || [], // Save seats to order in case payment delayed
  });

  // If payment is VNPay, do not generate tickets yet. Return payment URL.
  if (!isFree && method === 'vnpay') {
    const { buildVNPayUrl } = await import('../utils/vnpay');
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    
    // Convert array to string or fallback
    const ipString = Array.isArray(ipAddr) ? ipAddr[0] : ipAddr;
    
    const paymentUrl = buildVNPayUrl(
      totalAmount,
      order._id.toString(),
      ipString,
      `EViENT - Thanh toan ve su kien ${order._id}`
    );

    return respond.successWithMessage(res, {
      order: transformOrder(order.toObject()),
      paymentUrl,
    }, 'Order pending payment', 201);
  }

  // --- BEGIN LOGIC FOR FREE ORDERS ---
  // Generate tickets in bulk
  const ticketDocs: Partial<ITicketDocument>[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const ticketCode = `EVT-${generateTicketCode()}-${generateTicketCode()}`;
      const qrCode = await QRCode.toDataURL(ticketCode, { width: 300, margin: 2 });

      let seatAssignment;
      if (seat_assignments && seat_assignments.length > 0) {
        const seatIndex = seat_assignments.findIndex((s: any) => s.ticket_type_id === item.ticket_type_id);
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
        ticketTypeId: item.ticket_type_id,
        ticketTypeName: item.ticket_type_name,
        priceAtPurchase: item.unit_price,
        status: 'valid',
        eventSnapshot: event_snapshot || undefined,
        buyerSnapshot: buyer_info || undefined,
        seatSnapshot: seatAssignment || undefined,
      });
    }
  }

  // Bulk insert tickets (1 DB call instead of N)
  const tickets = await Ticket.insertMany(ticketDocs);

  // Send in-app notification
  try {
    const axios = (await import('axios')).default;
    const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
    await axios.post(`${notificationUrl}/api/notifications/user-notifications`, {
      user_id: userId,
      title: 'Đặt vé thành công',
      message: `Bạn đã mua thành công ${requestedTotalQty} vé cho sự kiện "${event_snapshot?.title || (event as any)?.title || 'Sự kiện'}".`,
      type: 'ticket_booked',
      link: '/my-tickets',
    });

    // Track activity
    if (tickets && tickets.length > 0) {
      const buyerName = buyer_info?.full_name || buyer_info?.email || 'Khách vãng lai';
      await axios.post(`${notificationUrl}/api/notifications/activities`, {
        type: 'ticket',
        title: `Vé ${tickets[0].ticketCode}${tickets.length > 1 ? ` và ${tickets.length - 1} vé khác` : ''} đã được bán cho ${buyerName}`,
        details: { orderId: order._id, quantity: requestedTotalQty }
      });
    }
  } catch (err: any) {
    logger.warn('Failed to send in-app notification:', err.message);
  }

  respond.successWithMessage(res, {
    order: transformOrder(order.toObject()),
    tickets: tickets.map((t: any) => transformTicket(t.toObject ? t.toObject() : t)),
  }, 'Order created successfully', 201);
  // --- END LOGIC FOR FREE ORDERS ---
});

/**
 * GET /orders/my-tickets - Current user's tickets
 */
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
      { 'eventSnapshot.title': { $regex: search, $options: 'i' } }
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
      filter['eventSnapshot.startTime'] = { $gte: dateQuery.toISOString(), $lt: nextDay.toISOString() };
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

/**
 * GET /orders/remaining/:eventId - Remaining ticket count per type
 */
export const getRemainingTickets = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  // Count sold tickets per ticket type for this event
  const soldByType = await Ticket.aggregate([
    { $match: { eventId: eventId as any, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$ticketTypeId', sold: { $sum: 1 } } },
  ]);

  respond.success(res, soldByType.map((item) => ({
    ticket_type_id: item._id?.toString(),
    sold: item.sold,
  })));
});

/**
 * GET /orders/events/:eventId/sold-seats - Get IDs of sold seats for an event
 */
export const getSoldSeats = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const tickets = await Ticket.find({
    eventId: eventId as any,
    status: { $in: ['valid', 'used'] },
    route: { $exists: false } // Only care about valid/used
  }).select('seatSnapshot').lean();

  const soldSeats = tickets
    .filter((t: any) => t.seatSnapshot && t.seatSnapshot.row && t.seatSnapshot.number)
    .map((t: any) => `${t.seatSnapshot.row}-${t.seatSnapshot.number}`);

  respond.success(res, soldSeats);
});

// ==================== Admin Ticket Management ====================

/**
 * GET /tickets - All tickets with filters (admin)
 */
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

/**
 * POST /tickets/validate-qr - Validate & check-in (admin)
 */
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
    const usedTime = ticket.usedAt ? new Date(ticket.usedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'N/A';
    return respond.error(res, `Vé đã được sử dụng lúc ${usedTime}`, 400);
  }

  // Time limit for check-in removed as requested by the user.

  // Backfill buyerSnapshot if missing (legacy tickets)
  const hasBuyerInfo = ticket.buyerSnapshot && ticket.buyerSnapshot.fullName;
  if (!hasBuyerInfo && ticket.userId) {
    try {
      const axios = (await import('axios')).default;
      const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const { data: userData } = await axios.get(`${authUrl}/api/users/${ticket.userId.toString()}`, {
        headers: { Authorization: req.headers.authorization || '' },
      });
      if (userData?.data) {
        const user = userData.data;
        ticket.buyerSnapshot = {
          fullName: user.full_name || user.fullName || '',
          email: user.email || '',
        };
        logger.info(`Backfilled buyerSnapshot for ticket ${ticket.ticketCode}: ${user.full_name || user.fullName}`);
      }
    } catch (err: any) {
      logger.warn('Could not fetch buyer info for backfill:', err.message);
    }
  }

  // Mark as used
  ticket.status = 'used';
  ticket.usedAt = new Date();
  await ticket.save();

  respond.successWithMessage(res, {
    ticket: transformTicket(ticket.toObject()),
    check_in_time: ticket.usedAt.toISOString(),
  }, 'Check-in thành công!');
});

/**
 * GET /tickets/info/:code - Preview ticket info without check-in (admin)
 */
export const getTicketInfo = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findOne({ ticketCode: req.params.code });
  if (!ticket) {
    return respond.notFound(res, 'Không tìm thấy vé với mã này');
  }

  // Backfill buyerSnapshot if missing (legacy tickets)
  const hasBuyer = ticket.buyerSnapshot && ticket.buyerSnapshot.fullName;
  if (!hasBuyer && ticket.userId) {
    try {
      const axios = (await import('axios')).default;
      const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const { data: userData } = await axios.get(`${authUrl}/api/users/${ticket.userId.toString()}`, {
        headers: { Authorization: req.headers.authorization || '' },
      });
      if (userData?.data) {
        const user = userData.data;
        ticket.buyerSnapshot = {
          fullName: user.full_name || user.fullName || '',
          email: user.email || '',
        };
        await ticket.save();
        logger.info(`Backfilled buyerSnapshot for ticket ${ticket.ticketCode}: ${user.full_name || user.fullName}`);
      }
    } catch (err: any) {
      logger.warn('Could not fetch buyer info for backfill:', err.message);
    }
  }

  respond.success(res, transformTicket(ticket.toObject()));
});

/**
 * POST /tickets/resend-email - Resend ticket confirmation email (admin)
 */
export const resendTicketEmail = asyncHandler(async (req: Request, res: Response) => {
  const { ticket_id } = req.body;

  const ticket = await Ticket.findById(ticket_id).lean();
  if (!ticket) {
    return respond.notFound(res, 'Ticket not found');
  }

  // TODO: Call Notification service to resend email
  logger.info(`[TODO] Resend email for ticket ${ticket.ticketCode}`);

  respond.successMessage(res, 'Ticket email resent successfully');
});

/**
 * DELETE /orders/:id - Delete an order and all its tickets (admin)
 */
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id;

  const order = await Order.findByIdAndDelete(orderId);
  if (!order) {
    return respond.notFound(res, 'Order not found');
  }

  // Cascade delete all tickets associated with this request
  await Ticket.deleteMany({ orderId });

  respond.successMessage(res, 'Order and associated tickets deleted successfully');
});

/**
 * PUT /tickets/:id - Update ticket details like status or seat assignment (admin)
 */
export const updateTicket = asyncHandler(async (req: Request, res: Response) => {
  const { status, seatSnapshot } = req.body;

  const updateData: any = {};
  if (status !== undefined) updateData.status = status;
  if (seatSnapshot !== undefined) updateData.seatSnapshot = seatSnapshot;

  const ticket = await Ticket.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
  if (!ticket) {
    return respond.notFound(res, 'Ticket not found');
  }

  respond.successWithMessage(res, transformTicket(ticket.toObject()), 'Ticket updated successfully');
});

/**
 * GET /orders/revenue-report - Get revenue by event within time range (admin)
 */
export const getRevenueReport = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const match: any = { status: 'paid' };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate as string);
    if (endDate) match.createdAt.$lte = new Date(endDate as string);
  }

  // Group by eventId to calculate revenue
  const revenueByEvent = await Order.aggregate([
    { $match: match },
    { $group: {
      _id: '$eventId',
      totalRevenue: { $sum: '$totalAmount' },
      totalTickets: { $sum: { $sum: '$items.quantity' } },
      orderCount: { $sum: 1 }
    }},
    { $sort: { totalRevenue: -1 } }
  ]);

  // Populate event details
  const EventModel = (await import('../models')).EventLocal;
  const eventIds = revenueByEvent.map((r: any) => r._id);
  const events = await EventModel.find({ _id: { $in: eventIds } }).select('title').lean();
  
  const eventMap = events.reduce((acc: any, ev: any) => {
    acc[ev._id.toString()] = ev.title;
    return acc;
  }, {});

  const data = revenueByEvent.map((r: any) => ({
    eventId: r._id,
    eventTitle: eventMap[r._id?.toString()] || 'Sự kiện không xác định',
    totalRevenue: r.totalRevenue,
    totalTickets: r.totalTickets,
    orderCount: r.orderCount,
  }));

  const grandTotal = data.reduce((sum: number, item: any) => sum + item.totalRevenue, 0);

  respond.success(res, { data, grandTotal });
});
