import mongoose, { Schema, Document } from 'mongoose';

// ==================== Ticket Type (embedded subdocument) ====================

const ticketTypeSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  quantityTotal: { type: Number, required: true }, // Allow -1 for unlimited
  quantitySold: { type: Number, default: 0, min: 0 },
  maxPerUser: { type: Number, default: -1 }, // -1 = unlimited
  status: {
    type: String,
    enum: ['active', 'sold_out', 'hidden'],
    default: 'active',
  },
});

// ==================== Event Schema ====================

export interface IEventDocument extends Document {
  title: string;
  slug: string;
  description?: string;
  content?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  bannerImage?: string;
  subBanners?: string[];
  showSubBanners: boolean;
  thumbnailImage?: string;
  category?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isHot: boolean;
  maxTicketsPerUser: number;
  roomIds: mongoose.Types.ObjectId[];
  ticketTypes: typeof ticketTypeSchema[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEventDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    content: String,
    location: String,
    startTime: Date,
    endTime: Date,
    bannerImage: String,
    subBanners: [String],
    showSubBanners: { type: Boolean, default: true },
    thumbnailImage: String,
    category: String,
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
    },
    isHot: { type: Boolean, default: false },
    maxTicketsPerUser: { type: Number, default: 10 },
    roomIds: [{ type: Schema.Types.ObjectId }],
    ticketTypes: [ticketTypeSchema],
  },
  { timestamps: true }
);

// Indexes
eventSchema.index({ status: 1, startTime: -1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ isHot: 1, status: 1 });
eventSchema.index({ title: 'text', description: 'text' });

export const Event = mongoose.model<IEventDocument>('Event', eventSchema);

// ==================== Room Schema ====================

export interface ISeatLock {
  eventId: string;
  ticketTypeId?: string;
}

export interface ISeat {
  id: string; // e.g. "A1"
  row: string;
  number: number;
  isActive: boolean;
  locks?: ISeatLock[];
}

export interface IRoomDocument extends Document {
  name: string;
  rows: number;
  seatsPerRow: number;
  isActive: boolean;
  seats: ISeat[];
  eventIds?: mongoose.Types.ObjectId[]; // to track events happening in this room
  createdAt: Date;
  updatedAt: Date;
}

const seatLockSchema = new Schema({
  eventId: { type: String, required: true },
  ticketTypeId: { type: String },
}, { _id: false });

const seatSchema = new Schema({
  id: { type: String, required: true },
  row: { type: String, required: true },
  number: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  locks: { type: [seatLockSchema], default: [] },
}, { _id: false }); // sub-schema doesn't strictly need _id

const roomSchema = new Schema<IRoomDocument>(
  {
    name: { type: String, required: true, trim: true },
    rows: { type: Number, required: true, min: 1 },
    seatsPerRow: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
    seats: [seatSchema],
    eventIds: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
  },
  { timestamps: true }
);

export const Room = mongoose.model<IRoomDocument>('Room', roomSchema);

// ==================== Banner Schema ====================

export interface IBannerDocument extends Document {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  eventId?: mongoose.Types.ObjectId;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBannerDocument>(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    linkUrl: String,
    eventId: { type: Schema.Types.ObjectId },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bannerSchema.index({ isActive: 1, priority: -1 });

export const Banner = mongoose.model<IBannerDocument>('Banner', bannerSchema);
