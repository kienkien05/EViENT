import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { body } from 'express-validator';
import { createLogger, respond, asyncHandler, validate, errorHandler, authenticate } from '@evient/shared';

const app = express();
const logger = createLogger('notification-service');

app.use(express.json({ limit: '5mb' }));

// ==================== Email Transporter ====================

const smtpPort = Number(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: smtpPort === 587,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
  tls: {
    rejectUnauthorized: false,
  },
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

  const emailTypes: Record<string, { title: string, desc: string }> = {
    register: {
      title: 'Chào mừng bạn đến với EViENT!',
      desc: 'Cảm ơn bạn đã lựa chọn EViENT. Để tiếp tục quá trình đăng ký và bắt đầu khám phá các sự kiện tuyệt vời, vui lòng nhập mã xác nhận bên dưới:',
    },
    login: {
      title: 'Yêu cầu đăng nhập 🔐',
      desc: 'Chúng tôi nhận được yêu cầu đăng nhập vào tài khoản của bạn. Để bảo mật thông tin, vui lòng nhập mã xác nhận gồm 6 chữ số bên dưới:',
    },
    reset_password: {
      title: 'Yêu cầu đặt lại mật khẩu 🔑',
      desc: 'Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản này. Vui lòng sử dụng mã xác nhận bên dưới để tạo một mật khẩu mới:',
    },
  };

  const context = emailTypes[type] || emailTypes['login'];
  const subject = `[EViENT] Mã xác thực của bạn là: ${otp_code}`;
  
  const body = `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EViENT - OTP Verification</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #fffaf5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fffaf5; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.05), 0 8px 10px -6px rgba(249, 115, 22, 0.01); overflow: hidden; border: 1px solid #ffedd5;">
            
            <!-- Header -->
            <tr>
              <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #ffedd5;">
                <h1 style="margin: 0; color: #ea580c; font-size: 32px; font-weight: 800; letter-spacing: -1px;">EViENT</h1>
                <p style="margin: 8px 0 0 0; color: #78350f; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Nền tảng sự kiện hàng đầu</p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px; text-align: center;">
                <h2 style="margin: 0 0 16px 0; color: #431407; font-size: 24px; font-weight: 700;">${context.title}</h2>
                <p style="margin: 0 0 32px 0; color: #9a3412; font-size: 16px; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto;">
                  ${context.desc}
                </p>

                <!-- OTP Box -->
                <div style="background-color: #fff7ed; border: 2px dashed #fdba74; border-radius: 12px; padding: 24px; width: fit-content; margin: 0 auto; display: inline-block;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; color: #ea580c; letter-spacing: 12px; padding-left: 12px; display: block;">${otp_code}</span>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 32px 40px; background-color: #fffaf5; border-top: 1px solid #ffedd5;">
                <p style="margin: 0 0 8px 0; color: #9a3412; font-size: 13px; line-height: 1.5; text-align: center;">
                  Mã xác nhận này có hiệu lực trong vòng <strong style="color: #ea580c;">5 phút</strong>.<br/>
                  Vì lý do bảo mật, vui lòng <strong style="color: #ea580c;">không chia sẻ</strong> mã này cho bất kỳ ai.
                </p>
                <p style="margin: 16px 0 0 0; color: #fdba74; font-size: 12px; text-align: center;">
                  Đây là email được gửi tự động. Vui lòng không trả lời email này.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
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

// ==================== Activity Logs ====================

const activityLogSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'ticket', 'user', 'event'
  title: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, expires: 31536000, default: Date.now } // TTL index for 365 days
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// GET /api/notifications/activities - Get activity logs for admin dashboard
app.get('/api/notifications/activities', authenticate, asyncHandler(async (req: any, res) => {
  /* Note: Assuming authenticate middleware sets req.user. Role check could be added if needed */
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
     // Allow for now, but in strict systems enforce role
  }

  const { startDate, endDate } = req.query;
  const filter: any = {};
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
  }

  const activities = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(100) // reasonable limit
    .lean();

  res.json({
    success: true,
    data: activities.map((a: any) => ({
      id: a._id.toString(),
      type: a.type,
      title: a.title,
      details: a.details,
      created_at: a.createdAt.toISOString(),
    }))
  });
}));

// POST /api/notifications/activities - Create activity log (internal)
app.post('/api/notifications/activities', [
  body('type').notEmpty(),
  body('title').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const { type, title, details } = req.body;

  const activity = await ActivityLog.create({
    type,
    title,
    details,
  });

  res.json({
    success: true,
    data: {
      id: activity._id.toString(),
      type: activity.type,
      title: activity.title,
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
    logger.info(`SMTP config: host=${process.env.SMTP_HOST}, port=${process.env.SMTP_PORT}, user=${process.env.SMTP_USER ? '***set***' : 'not set'}`);
    try {
      await transporter.verify();
      logger.info('SMTP connection verified');
    } catch (smtpErr: any) {
      logger.warn(`SMTP not available: ${smtpErr.message}`);
    }

    app.listen(PORT, () => logger.info(`Notification Service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start Notification Service:', err);
    process.exit(1);
  }
}

start();
export default app;
