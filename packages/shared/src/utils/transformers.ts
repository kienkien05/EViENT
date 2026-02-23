import type { IUser, IUserPublic, IEvent, IEventPublic, ITicketType, ITicketTypePublic } from '../types';

/**
 * Transform Mongoose user document to public API format (snake_case)
 */
export function transformUser(user: any): IUserPublic {
  return {
    id: user._id?.toString() || user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    is_active: user.isActive,
    avatar_url: user.avatarUrl || undefined,
    phone_number: user.phoneNumber || undefined,
    facebook_url: user.facebookUrl || undefined,
    gender: user.gender || undefined,
    address: user.address || undefined,
    date_of_birth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : undefined,
    password_history: (user.passwordHistory || []).map((entry: any) => ({
      changed_at: new Date(entry.changedAt).toISOString(),
      reason: entry.reason,
    })),
    created_at: new Date(user.createdAt).toISOString(),
    updated_at: user.updatedAt ? new Date(user.updatedAt).toISOString() : undefined,
  };
}

/**
 * Transform ticket type subdocument to public API format
 */
export function transformTicketType(tt: any): ITicketTypePublic {
  return {
    id: tt._id?.toString() || tt.id,
    name: tt.name,
    description: tt.description || undefined,
    price: Number(tt.price),
    original_price: tt.originalPrice ? Number(tt.originalPrice) : undefined,
    quantity_total: tt.quantityTotal,
    quantity_sold: tt.quantitySold,
    max_per_user: tt.maxPerUser ?? -1,
    status: tt.status,
  };
}

/**
 * Transform Mongoose event document to public API format
 */
export function transformEvent(event: any): IEventPublic {
  return {
    id: event._id?.toString() || event.id,
    title: event.title,
    slug: event.slug,
    description: event.description || undefined,
    content: event.content || undefined,
    location: event.location || undefined,
    start_time: event.startTime ? new Date(event.startTime).toISOString() : undefined,
    end_time: event.endTime ? new Date(event.endTime).toISOString() : undefined,
    banner_image: event.bannerImage || undefined,
    sub_banners: event.subBanners || [],
    show_sub_banners: event.showSubBanners !== false,
    thumbnail_image: event.thumbnailImage || undefined,
    category: event.category || undefined,
    status: event.status,
    is_hot: event.isHot || false,
    max_tickets_per_user: event.maxTicketsPerUser,
    room_ids: event.roomIds?.map((id: any) => id.toString()) || [],
    ticket_types: event.ticketTypes?.map(transformTicketType) || undefined,
    created_at: new Date(event.createdAt).toISOString(),
  };
}

/**
 * Transform Mongoose order document to public API format
 */
export function transformOrder(order: any) {
  return {
    id: order._id?.toString() || order.id,
    user_id: order.userId?.toString(),
    event_id: order.eventId?.toString(),
    items: order.items?.map((item: any) => ({
      ticket_type_id: item.ticketTypeId?.toString(),
      ticket_type_name: item.ticketTypeName,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
    })),
    status: order.status,
    payment_method: order.paymentMethod || undefined,
    buyer: order.buyerSnapshot ? {
      full_name: order.buyerSnapshot.fullName,
      email: order.buyerSnapshot.email,
    } : undefined,
    created_at: new Date(order.createdAt).toISOString(),
  };
}

/**
 * Transform Mongoose ticket document to public API format
 */
export function transformTicket(ticket: any) {
  return {
    id: ticket._id?.toString() || ticket.id,
    order_id: ticket.orderId?.toString(),
    ticket_code: ticket.ticketCode,
    qr_code: ticket.qrCode,
    status: ticket.status,
    used_at: ticket.usedAt ? new Date(ticket.usedAt).toISOString() : undefined,
    price_at_purchase: Number(ticket.priceAtPurchase),
    created_at: new Date(ticket.createdAt).toISOString(),
    event: ticket.eventSnapshot ? {
      id: ticket.eventId?.toString(),
      title: ticket.eventSnapshot.title,
      start_time: ticket.eventSnapshot.startTime ? new Date(ticket.eventSnapshot.startTime).toISOString() : undefined,
      location: ticket.eventSnapshot.location,
      banner_image: ticket.eventSnapshot.bannerImage,
    } : undefined,
    ticket_type: {
      id: ticket.ticketTypeId?.toString(),
      name: ticket.ticketTypeName,
    },
    seat: ticket.seatSnapshot ? {
      room: ticket.seatSnapshot.roomName,
      row: ticket.seatSnapshot.row,
      number: ticket.seatSnapshot.number,
    } : undefined,
    buyer: ticket.buyerSnapshot ? {
      full_name: ticket.buyerSnapshot.fullName,
      email: ticket.buyerSnapshot.email,
    } : undefined,
  };
}

/**
 * Transform Mongoose banner document to public API format
 */
export function transformBanner(banner: any) {
  return {
    id: banner._id?.toString() || banner.id,
    title: banner.title,
    image_url: banner.imageUrl,
    link_url: banner.linkUrl || undefined,
    event_id: banner.eventId?.toString() || undefined,
    priority: banner.priority,
    is_active: banner.isActive,
  };
}

/**
 * Transform Mongoose room document to public API format
 */
export function transformRoom(room: any) {
  return {
    id: room._id?.toString() || room.id,
    name: room.name,
    rows: room.rows,
    seatsPerRow: room.seatsPerRow,
    seats_per_row: room.seatsPerRow, // keep both for backwards combatibility
    isActive: room.isActive,
    seats: room.seats ? room.seats.map((s: any) => ({
      ...s._doc || s,
      id: s.id,
    })) : [],
    created_at: new Date(room.createdAt).toISOString(),
  };
}
