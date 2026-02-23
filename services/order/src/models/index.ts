import mongoose, { Schema, Document } from 'mongoose';

// ==================== Order Schema ====================

export interface IOrderDocument extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  items: Array<{
    ticketTypeId: mongoose.Types.ObjectId;
    ticketTypeName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  buyerSnapshot?: {
    fullName: string;
    email: string;
  };
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: string;
  createdAt: Date;
}

const orderSchema = new Schema<IOrderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, required: true, index: true },
    items: [{
      ticketTypeId: { type: Schema.Types.ObjectId, required: true },
      ticketTypeName: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    buyerSnapshot: {
      fullName: String,
      email: String,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentMethod: String,
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ eventId: 1, status: 1 });

export const Order = mongoose.model<IOrderDocument>('Order', orderSchema);

// ==================== Ticket Schema ====================

export interface ITicketDocument extends Document {
  ticketCode: string;
  qrCode: string;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  ticketTypeId: mongoose.Types.ObjectId;
  ticketTypeName: string;
  seatId?: mongoose.Types.ObjectId;
  priceAtPurchase: number;
  status: 'valid' | 'used' | 'cancelled';
  usedAt?: Date;
  // Denormalized snapshots for performance (avoid cross-service queries)
  eventSnapshot?: {
    title: string;
    startTime?: Date;
    endTime?: Date;
    location?: string;
    bannerImage?: string;
  };
  buyerSnapshot?: {
    fullName: string;
    email: string;
  };
  seatSnapshot?: {
    roomName: string;
    row: string;
    number: number;
  };
  createdAt: Date;
}

const ticketSchema = new Schema<ITicketDocument>(
  {
    ticketCode: { type: String, required: true, unique: true, index: true },
    qrCode: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, required: true, index: true },
    ticketTypeId: { type: Schema.Types.ObjectId, required: true },
    ticketTypeName: { type: String, required: true },
    seatId: { type: Schema.Types.ObjectId },
    priceAtPurchase: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['valid', 'used', 'cancelled'],
      default: 'valid',
    },
    usedAt: Date,
    eventSnapshot: {
      title: String,
      startTime: Date,
      endTime: Date,
      location: String,
      bannerImage: String,
    },
    buyerSnapshot: {
      fullName: String,
      email: String,
    },
    seatSnapshot: {
      roomName: String,
      row: String,
      number: Number,
    },
  },
  { timestamps: true }
);

ticketSchema.index({ userId: 1, status: 1 });
ticketSchema.index({ eventId: 1, status: 1 });

export const Ticket = mongoose.model<ITicketDocument>('Ticket', ticketSchema);

// ==================== Minimal Event Schema (Cross-Service DB Access) ====================
// Used strictly for atomic bulk updates on ticket quantity counters
const minimalEventSchema = new Schema({}, { strict: false, collection: 'events' });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const EVENT_DB_NAME = process.env.MONGODB_EVENT_DB || 'evient_events';

const eventDbConnection = mongoose.createConnection(`${MONGO_URI}/${EVENT_DB_NAME}`, { maxPoolSize: 5 });
export const EventLocal = eventDbConnection.model('Event', minimalEventSchema);
