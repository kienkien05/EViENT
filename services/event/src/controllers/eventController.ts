import { Request, Response } from 'express';
import slugify from 'slugify';
import NodeCache from 'node-cache';
import { respond, transformEvent, transformRoom, transformBanner, asyncHandler, createLogger } from '@evient/shared';
import { Event, Room, Banner } from '../models';

const logger = createLogger('event-controller');
const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

// ==================== Events ====================

/**
 * GET /events - Public list with filters, pagination, search
 */
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = (req.query.search as string) || '';
  const location = req.query.location as string;
  const dateStr = req.query.date as string;

  const filter: any = {};
  if (req.query.status !== undefined) {
    if (req.query.status !== '') {
      filter.status = req.query.status;
    }
  } else {
    filter.status = 'published';
  }
  
  if (search) filter.$text = { $search: search };

  // Advanced filtering
  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }

  if (dateStr) {
    // Exact date match (ignoring time)
    const dateQuery = new Date(dateStr);
    if (!isNaN(dateQuery.getTime())) {
      const nextDay = new Date(dateQuery);
      nextDay.setDate(dateQuery.getDate() + 1);
      filter.startTime = { $gte: dateQuery, $lt: nextDay };
    }
  }

  const timeStatus = req.query.time_status as string;
  if (timeStatus === 'upcoming' && !dateStr) {
    filter.startTime = { $gt: new Date() };
  } else if (timeStatus === 'ongoing') {
    filter.startTime = { $lte: new Date() };
    filter.endTime = { $gte: new Date() };
  } else if (timeStatus === 'ended') {
    filter.$or = [
      { endTime: { $lt: new Date() } },
      { status: 'completed' }
    ];
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  respond.paginated(res, events.map(transformEvent), { page, limit, total });
});

/**
 * GET /events/featured - Hot/featured events (cached)
 */
export const getFeaturedEvents = asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = 'featured_events';
  const cached = cache.get(cacheKey);
  if (cached) {
    return respond.success(res, cached);
  }

  const events = await Event.find({ isHot: true, status: 'published' })
    .sort({ startTime: -1 })
    .limit(10)
    .lean();

  const result = events.map(transformEvent);
  cache.set(cacheKey, result, 300); // 5 min cache
  respond.success(res, result);
});

/**
 * GET /events/:id - Event detail (always fresh for accurate ticket counts)
 */
export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await Event.findById(id).lean();
  if (!event) {
    return respond.notFound(res, 'Event not found');
  }

  const result = transformEvent(event);
  respond.success(res, result);
});

/**
 * POST /events - Create event (admin)
 */
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const {
    title, description, content, location, start_time, end_time,
    banner_image, sub_banners, category, status, is_hot,
    max_tickets_per_user, room_ids, ticket_types,
  } = req.body;

  const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString(36);

  const event = await Event.create({
    title,
    slug,
    description,
    content,
    location,
    startTime: start_time || undefined,
    endTime: end_time || undefined,
    bannerImage: banner_image,
    subBanners: sub_banners || [],
    category,
    status: status || 'draft',
    isHot: is_hot || false,
    maxTicketsPerUser: max_tickets_per_user || 10,
    roomIds: room_ids || [],
    ticketTypes: (ticket_types || []).map((tt: any) => ({
      name: tt.name,
      description: tt.description,
      price: tt.price,
      originalPrice: tt.original_price,
      quantityTotal: tt.quantity_total || 0,
      quantitySold: 0,
      maxPerUser: tt.max_per_user ?? -1,
      status: 'active',
    })),
  });

  // Auto-create banner if image is provided
  if (banner_image) {
    await Banner.create({
      title: `Banner: ${title}`,
      imageUrl: banner_image,
      eventId: event._id,
      priority: 0,
      isActive: true,
    });
  }

  // Auto-sync rooms
  if (room_ids && room_ids.length > 0) {
    await Room.updateMany(
      { _id: { $in: room_ids } },
      { $addToSet: { eventIds: event._id } }
    );
  }

  try {
    const axios = (await import('axios')).default;
    const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
    await axios.post(`${notificationUrl}/api/notifications/activities`, {
      type: 'event',
      title: `Sự kiện "${event.title}" đã được admin tạo`,
      details: { eventId: event._id }
    });
  } catch (err: any) {
    logger.warn('Failed to track event creation:', err.message);
  }

  cache.del('featured_events');
  respond.successWithMessage(res, transformEvent(event.toObject()), 'Event created', 201);
});

/**
 * PUT /events/:id - Update event (admin)
 */
export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const {
    title, description, content, location, start_time, end_time,
    banner_image, sub_banners, category, status, is_hot,
    max_tickets_per_user, room_ids, ticket_types,
  } = req.body;

  const updateData: any = {};
  if (title !== undefined) {
    updateData.title = title;
    updateData.slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  if (description !== undefined) updateData.description = description;
  if (content !== undefined) updateData.content = content;
  if (location !== undefined) updateData.location = location;
  if (start_time !== undefined) updateData.startTime = start_time || undefined;
  if (end_time !== undefined) updateData.endTime = end_time || undefined;
  if (banner_image !== undefined) updateData.bannerImage = banner_image;
  if (sub_banners !== undefined) updateData.subBanners = sub_banners;
  if (category !== undefined) updateData.category = category;
  if (status !== undefined) updateData.status = status;
  if (is_hot !== undefined) updateData.isHot = is_hot;
  if (max_tickets_per_user !== undefined) updateData.maxTicketsPerUser = max_tickets_per_user;
  if (room_ids !== undefined) updateData.roomIds = room_ids;
  if (ticket_types !== undefined) {
    updateData.ticketTypes = ticket_types.map((tt: any) => ({
      _id: tt.id || undefined,
      name: tt.name,
      description: tt.description,
      price: tt.price,
      originalPrice: tt.original_price,
      quantityTotal: tt.quantity_total,
      quantitySold: tt.quantity_sold || 0,
      maxPerUser: tt.max_per_user ?? -1,
      status: tt.status || 'active',
    }));
  }

  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!event) {
    return respond.notFound(res, 'Event not found');
  }

  // Auto-sync banner
  if (banner_image !== undefined) {
    const existingBanner = await Banner.findOne({ eventId: event._id });
    if (existingBanner) {
      if (!banner_image) {
        // If banner was removed in event, also remove it from Banners
        await Banner.findByIdAndDelete(existingBanner._id);
      } else {
        await Banner.findByIdAndUpdate(existingBanner._id, { imageUrl: banner_image });
      }
    } else if (banner_image) {
      // Create new banner tied to event
      await Banner.create({
        title: `Banner: ${event.title}`,
        imageUrl: banner_image,
        eventId: event._id,
        priority: 0,
        isActive: true,
      });
    }
  }

  // Auto-sync rooms
  if (room_ids !== undefined) {
    // Remove this event from all rooms first
    await Room.updateMany(
      { eventIds: req.params.id },
      { $pull: { eventIds: req.params.id } }
    );
    // Add this event to selected rooms
    if (room_ids.length > 0) {
      await Room.updateMany(
        { _id: { $in: room_ids } },
        { $addToSet: { eventIds: req.params.id } }
      );
    }
  }

  try {
    const axios = (await import('axios')).default;
    const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
    await axios.post(`${notificationUrl}/api/notifications/activities`, {
      type: 'event',
      title: `Sự kiện "${event.title}" đã được admin cập nhật`,
      details: { eventId: event._id }
    });
  } catch (err: any) {
    logger.warn('Failed to track event update:', err.message);
  }

  cache.del(`event_${req.params.id}`);
  cache.del('featured_events');
  cache.flushAll(); // Flush banners too because they might have been synced
  respond.successWithMessage(res, transformEvent(event), 'Event updated');
});

/**
 * DELETE /events/:id - Delete event (admin)
 */
export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findByIdAndDelete(req.params.id).lean();
  if (!event) {
    return respond.notFound(res, 'Event not found');
  }

  cache.del(`event_${req.params.id}`);
  cache.del('featured_events');

  // Auto-sync rooms
  await Room.updateMany(
    { eventIds: req.params.id },
    { $pull: { eventIds: req.params.id } }
  );

  respond.successMessage(res, 'Event deleted');
});

// ==================== Rooms ====================

export const getRooms = asyncHandler(async (req: Request, res: Response) => {
  // Always fetch fresh due to fast-moving seat statuses, skip cache for rooms
  const rooms = await Room.find().sort({ name: 1 }).populate('eventIds', 'title status').lean();
  
  const result = rooms.map((room: any) => {
     const formatted = transformRoom(room);
     if (formatted) {
        // format populated events natively for frontend matching
        (formatted as any).events = (room.eventIds || []).map((ev: any) => ({ id: ev._id, title: ev.title, status: ev.status }));
     }
     return formatted;
  });
  respond.success(res, result);
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const { name, rows, seats_per_row } = req.body;
  
  // Generate a matrix of seats based on rows and seats_per_row
  const seats = [];

  for (let r = 0; r < rows; r++) {
    const rowLabel = `Hàng ${r + 1}`;
    for (let currentNumber = 1; currentNumber <= seats_per_row; currentNumber++) {
       seats.push({
          id: `H${r + 1}-${currentNumber}`,
          row: rowLabel,
          number: currentNumber,
          isActive: true
       });
    }
  }

  const room = await Room.create({ name, rows, seatsPerRow: seats_per_row, seats });
  respond.successWithMessage(res, transformRoom(room.toObject()), 'Room created', 201);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const { name, eventIds } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (eventIds !== undefined) updateData.eventIds = eventIds;

  const room = await Room.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true })
        .populate('eventIds', 'title status').lean();
  
  if (!room) return respond.notFound(res, 'Room not found');

  const formatted = transformRoom(room);
  if (formatted) {
     (formatted as any).events = (room.eventIds || []).map((ev: any) => ({ id: ev._id, title: ev.title, status: ev.status }));
  }

  // Auto-sync events backwards
  if (eventIds !== undefined) {
    await Event.updateMany(
      { roomIds: req.params.id },
      { $pull: { roomIds: req.params.id } }
    );
    if (eventIds.length > 0) {
      await Event.updateMany(
        { _id: { $in: eventIds } },
        { $addToSet: { roomIds: req.params.id } }
      );
    }
  }
  
  respond.successWithMessage(res, formatted, 'Room updated');
});

// New endpoint dedicated to bulk toggling specific seat statuses in a room
export const updateRoomSeatsBatch = asyncHandler(async (req: Request, res: Response) => {
   const { id } = req.params;
   const { updates } = req.body; // Expects array of { id: string, isActive: boolean }

   if (!Array.isArray(updates) || updates.length === 0) {
      return respond.error(res, 'Invalid updates payload provided', 400);
   }

   const room = await Room.findById(id);
   if (!room) return respond.notFound(res, 'Room not found');

   let modified = false;
   for (const update of updates) {
       const seat = room.seats.find(s => s.id === update.id);
       if (seat && seat.isActive !== update.isActive) {
           seat.isActive = update.isActive;
           modified = true;
       }
   }

   if (modified) {
      await room.save();
   }

   const leanRoom = await Room.findById(id).populate('eventIds', 'title status').lean();
   const formatted = transformRoom(leanRoom);
   if (formatted && leanRoom) {
      (formatted as any).events = (leanRoom.eventIds || []).map((ev: any) => ({ id: ev._id, title: ev.title, status: ev.status }));
   }

   respond.successWithMessage(res, formatted, 'Seats updated successfully');
});

// New endpoint dedicated to bulk toggling specific seat locks (event/ticketType specific)
export const updateRoomSeatLocksBatch = asyncHandler(async (req: Request, res: Response) => {
   const { id } = req.params;
   const { updates } = req.body; // Expects array of { id: string, eventId: string, ticketTypeId: string | null, action: 'add' | 'remove' }

   if (!Array.isArray(updates) || updates.length === 0) {
      return respond.error(res, 'Invalid updates payload provided', 400);
   }

   const room = await Room.findById(id);
   if (!room) return respond.notFound(res, 'Room not found');

   let modified = false;
   for (const update of updates) {
       const { id: seatId, eventId, ticketTypeId = null, action } = update;
       
       if (!eventId || !['add', 'remove'].includes(action)) continue;

       const seat = room.seats.find(s => s.id === seatId);
       if (!seat) continue;
       
       if (!seat.locks) seat.locks = [];
       
       const existingLockIndex = seat.locks.findIndex(l => 
          l.eventId === eventId && (l.ticketTypeId || null) === ticketTypeId
       );

       if (action === 'add' && existingLockIndex === -1) {
           seat.locks.push({ eventId, ticketTypeId });
           modified = true;
       } else if (action === 'remove' && existingLockIndex !== -1) {
           seat.locks.splice(existingLockIndex, 1);
           modified = true;
       }
   }

   if (modified) {
      room.markModified('seats');
      await room.save();
   }

   const leanRoom = await Room.findById(id).populate('eventIds', 'title status').lean();
   // Cast to any since the event populate throws TS error due to Mongoose interface
   const formatted = transformRoom(leanRoom) as any;
   if (formatted && leanRoom) {
      formatted.events = (leanRoom.eventIds || []).map((ev: any) => ({ id: ev._id, title: ev.title, status: ev.status }));
   }

   respond.successWithMessage(res, formatted, 'Seat locks updated successfully');
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await Room.findByIdAndDelete(req.params.id).lean();
  if (!room) return respond.notFound(res, 'Room not found');

  // Auto-sync events backwards
  await Event.updateMany(
    { roomIds: req.params.id },
    { $pull: { roomIds: req.params.id } }
  );

  respond.successMessage(res, 'Room deleted');
});

// ==================== Banners ====================

export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const onlyActive = req.query.active === 'true';
  const cacheKey = `banners_${onlyActive}`;
  const cached = cache.get(cacheKey);
  if (cached) return respond.success(res, cached);

  const filter: any = {};
  if (onlyActive) filter.isActive = true;

  const banners = await Banner.find(filter).sort({ priority: -1 }).lean();
  const result = banners.map(transformBanner);
  cache.set(cacheKey, result, 600); // 10 min
  respond.success(res, result);
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  const { title, image_url, link_url, event_id, priority, is_active } = req.body;
  const banner = await Banner.create({
    title, imageUrl: image_url, linkUrl: link_url,
    eventId: event_id, priority: priority || 0, isActive: is_active !== false,
  });
  cache.flushAll();
  respond.successWithMessage(res, transformBanner(banner.toObject()), 'Banner created', 201);
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const { title, image_url, link_url, event_id, priority, is_active } = req.body;
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (image_url !== undefined) updateData.imageUrl = image_url;
  if (link_url !== undefined) updateData.linkUrl = link_url;
  if (event_id !== undefined) updateData.eventId = event_id;
  if (priority !== undefined) updateData.priority = priority;
  if (is_active !== undefined) updateData.isActive = is_active;

  const banner = await Banner.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true }).lean();
  if (!banner) return respond.notFound(res, 'Banner not found');
  cache.flushAll();
  respond.successWithMessage(res, transformBanner(banner), 'Banner updated');
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await Banner.findByIdAndDelete(req.params.id).lean();
  if (!banner) return respond.notFound(res, 'Banner not found');
  cache.flushAll();
  respond.successMessage(res, 'Banner deleted');
});


