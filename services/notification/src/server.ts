import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { body } from 'express-validator';
import { createLogger, respond, asyncHandler, validate, errorHandler, authenticate } from '@evient/shared';

const app = express();
const logger = createLogger('notification-service');

app.use(express.json({ limit: '5mb' }));

// ==================== Email Transporter ====================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
  ignoreTLS: true,
});

// ==================== Notification Model ====================

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['otp', 'ticket_confirmation', 'order_confirmation'], required: true },
  recipientEmail: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  sentAt: Date,
  error: String,
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

// ==================== Health Check ====================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'notification',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ==================== Send OTP ====================

app.post('/api/notifications/send-otp', [
  body('email').isEmail(),
  body('otp_code').notEmpty(),
  body('type').isIn(['register', 'login', 'reset_password']),
  validate,
], asyncHandler(async (req, res) => {
  const { email, otp_code, type } = req.body;

  const typeLabels: Record<string, string> = {
    register: 'Xác nhận đăng ký',
    login: 'Xác nhận đăng nhập',
    reset_password: 'Đặt lại mật khẩu',
  };

  const subject = `[EViENT] ${typeLabels[type] || 'OTP'} - Mã xác thực: ${otp_code}`;
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #6366f1;">🎫 EViENT</h2>
      <p>Mã xác thực của bạn:</p>
      <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">${otp_code}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Mã có hiệu lực trong 5 phút. Không chia sẻ mã này cho bất kỳ ai.</p>
    </div>
  `;

  const notification = await Notification.create({
    type: 'otp',
    recipientEmail: email,
    subject,
    body,
    status: 'pending',
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@evient.vn',
      to: email,
      subject,
      html: body,
    });

    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();
    logger.info(`OTP email sent to ${email}`);
  } catch (err: any) {
    notification.status = 'failed';
    notification.error = err.message;
    await notification.save();
    logger.error(`Failed to send OTP email to ${email}:`, err);
  }

  respond.successMessage(res, 'OTP email processed');
}));

// ==================== Send Ticket Confirmation ====================

app.post('/api/notifications/send-ticket', [
  body('email').isEmail(),
  body('tickets').isArray({ min: 1 }),
  body('event_title').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const { email, tickets, event_title, event_date, event_location } = req.body;

  const ticketRows = tickets.map((t: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${t.ticket_code}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${t.ticket_type_name}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${t.seat || 'N/A'}</td>
    </tr>
  `).join('');

  const subject = `[EViENT] Xác nhận vé - ${event_title}`;
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #6366f1;">🎫 EViENT - Xác nhận vé</h2>
      <p>Bạn đã đặt vé thành công cho sự kiện:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">${event_title}</h3>
        ${event_date ? `<p style="margin: 4px 0; color: #6b7280;">📅 ${event_date}</p>` : ''}
        ${event_location ? `<p style="margin: 4px 0; color: #6b7280;">📍 ${event_location}</p>` : ''}
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #6366f1; color: white;">
            <th style="padding: 8px; text-align: left;">Mã vé</th>
            <th style="padding: 8px; text-align: left;">Loại vé</th>
            <th style="padding: 8px; text-align: left;">Chỗ ngồi</th>
          </tr>
        </thead>
        <tbody>${ticketRows}</tbody>
      </table>
      <p style="color: #6b7280; font-size: 14px;">Vui lòng mang theo mã QR khi tham gia sự kiện.</p>
    </div>
  `;

  const notification = await Notification.create({
    type: 'ticket_confirmation',
    recipientEmail: email,
    subject,
    body,
    status: 'pending',
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@evient.vn',
      to: email,
      subject,
      html: body,
    });

    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();
    logger.info(`Ticket confirmation sent to ${email}`);
  } catch (err: any) {
    notification.status = 'failed';
    notification.error = err.message;
    await notification.save();
    logger.error(`Failed to send ticket email to ${email}:`, err);
  }

  respond.successMessage(res, 'Ticket email processed');
}));

// ==================== In-App Notifications ====================

const userNotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['ticket_booked', 'password_changed', 'admin_message', 'order_update', 'system'],
    default: 'system',
  },
  isRead: { type: Boolean, default: false },
  link: String, // optional link to navigate to
}, { timestamps: true });

const UserNotification = mongoose.model('UserNotification', userNotificationSchema);

// GET /api/notifications/user-notifications - Get current user's notifications
app.get('/api/notifications/user-notifications', authenticate, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  const [notifications, total] = await Promise.all([
    UserNotification.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    UserNotification.countDocuments({ userId }),
  ]);

  res.json({
    success: true,
    data: notifications.map((n: any) => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.isRead,
      link: n.link,
      created_at: n.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

// GET /api/notifications/unread-count - Get unread count
app.get('/api/notifications/unread-count', authenticate, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;

  const count = await UserNotification.countDocuments({ userId, isRead: false });
  res.json({ success: true, data: { count } });
}));

// PATCH /api/notifications/user-notifications/:id/read - Mark one as read
app.patch('/api/notifications/user-notifications/:id/read', authenticate, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;

  await UserNotification.updateOne(
    { _id: req.params.id, userId },
    { $set: { isRead: true } }
  );
  respond.successMessage(res, 'Marked as read');
}));

// PATCH /api/notifications/read-all - Mark all as read
app.patch('/api/notifications/read-all', authenticate, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;

  await UserNotification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
  respond.successMessage(res, 'All marked as read');
}));

// POST /api/notifications/user-notifications - Create in-app notification (internal)
app.post('/api/notifications/user-notifications', [
  body('user_id').notEmpty(),
  body('title').notEmpty(),
  body('message').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const { user_id, title, message, type, link } = req.body;

  const notification = await UserNotification.create({
    userId: user_id,
    title,
    message,
    type: type || 'system',
    link,
  });

  res.json({
    success: true,
    data: {
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
    },
  });
}));

// ==================== Error Handler ====================

app.use(errorHandler);

// ==================== Start ====================

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3004;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function start() {
  try {
    await mongoose.connect(`${MONGO_URI}/evient_notifications`, { maxPoolSize: 5 });
    logger.info('Connected to MongoDB: evient_notifications');

    // Verify SMTP connection
    try {
      await transporter.verify();
      logger.info('SMTP connection verified');
    } catch {
      logger.warn('SMTP not available - emails will fail');
    }

    app.listen(PORT, () => logger.info(`Notification Service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start Notification Service:', err);
    process.exit(1);
  }
}

start();
export default app;
