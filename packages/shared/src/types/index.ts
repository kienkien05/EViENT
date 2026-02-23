// ==================== User Types ====================

export type UserRole = 'user' | 'admin';
export type Gender = 'male' | 'female' | 'other';

export interface IPasswordHistoryEntry {
  changedAt: Date;
  reason: 'register' | 'reset' | 'admin_update' | 'self_update';
}

export interface IUser {
  _id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  phoneNumber?: string;
  facebookUrl?: string;
  gender?: Gender;
  address?: string;
  dateOfBirth?: Date;
  passwordHistory?: IPasswordHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPasswordHistoryPublic {
  changed_at: string;
  reason: string;
}

export interface IUserPublic {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  phone_number?: string;
  facebook_url?: string;
  gender?: Gender;
  address?: string;
  date_of_birth?: string;
  password_history?: IPasswordHistoryPublic[];
  created_at: string;
  updated_at?: string;
}

export interface IOtpCode {
  _id: string;
  email: string;
  code: string;
  type: 'register' | 'login' | 'reset_password';
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

// ==================== Event Types ====================

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type TicketTypeStatus = 'active' | 'sold_out' | 'hidden';

export interface ITicketType {
  _id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  quantityTotal: number;
  quantitySold: number;
  status: TicketTypeStatus;
}

export interface IEvent {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  bannerImage?: string;
  subBanners?: string[];
  thumbnailImage?: string;
  category?: string;
  status: EventStatus;
  isHot: boolean;
  maxTicketsPerUser: number;
  roomIds: string[];
  ticketTypes: ITicketType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventPublic {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  banner_image?: string;
  sub_banners?: string[];
  show_sub_banners?: boolean;
  thumbnail_image?: string;
  category?: string;
  status: EventStatus;
  is_hot: boolean;
  max_tickets_per_user?: number;
  room_ids?: string[];
  ticket_types?: ITicketTypePublic[];
  created_at: string;
}

export interface ITicketTypePublic {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  quantity_total: number;
  quantity_sold: number;
  max_per_user: number;
  status: TicketTypeStatus;
}

// ==================== Room & Seat Types ====================

export interface IRoom {
  _id: string;
  name: string;
  rows: number;
  seatsPerRow: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISeatLock {
  eventId: string;
  ticketTypeId?: string;
}

export interface ISeat {
  _id: string;
  roomId: string;
  row: string;
  number: number;
  isActive: boolean;
  locks?: ISeatLock[];
}

// ==================== Order & Ticket Types ====================

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';
export type TicketStatus = 'valid' | 'used' | 'cancelled';

export interface IOrderItem {
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
}

export interface IOrder {
  _id: string;
  userId: string;
  eventId: string;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod?: string;
  createdAt: Date;
}

export interface ITicket {
  _id: string;
  ticketCode: string;
  qrCode: string;
  userId: string;
  eventId: string;
  orderId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  seatId?: string;
  priceAtPurchase: number;
  status: TicketStatus;
  usedAt?: Date;
  createdAt: Date;
}

// ==================== Banner Types ====================

export interface IBanner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  eventId?: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Notification Types ====================

export type NotificationType = 'otp' | 'ticket_confirmation' | 'order_confirmation';

export interface INotification {
  _id: string;
  type: NotificationType;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  createdAt: Date;
}

// ==================== API Response Types ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== Request Types ====================

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
