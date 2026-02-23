import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createLogger, errorHandler } from '@evient/shared';

const app = express();
const logger = createLogger('gateway');

// ==================== Global Middleware ====================

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('short'));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

// ==================== Health Check ====================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() });
});

// ==================== Service Proxy Routes ====================

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const EVENT_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3002';
const ORDER_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

const proxyErrorHandler = (serviceName: string) => ({
  error: (err: Error, _req: any, res: any) => {
    logger.error(`${serviceName} proxy error:`, err);
    if (res && typeof res.status === 'function') {
      res.status(502).json({ success: false, message: `${serviceName} unavailable` });
    }
  },
});

// Auth Service — /api/auth/*, /api/users/*, /api/upload/*
app.use('/api/auth', createProxyMiddleware({ target: AUTH_URL, changeOrigin: true, on: proxyErrorHandler('Auth service') }));
app.use('/api/users', createProxyMiddleware({ target: AUTH_URL, changeOrigin: true, on: proxyErrorHandler('Auth service') }));
app.use('/api/upload', createProxyMiddleware({ target: AUTH_URL, changeOrigin: true, on: proxyErrorHandler('Auth service') }));

// Event Service — /api/events/*, /api/rooms/*, /api/banners/*, /api/ticket-types/*
app.use('/api/events', createProxyMiddleware({ target: EVENT_URL, changeOrigin: true, on: proxyErrorHandler('Event service') }));
app.use('/api/rooms', createProxyMiddleware({ target: EVENT_URL, changeOrigin: true, on: proxyErrorHandler('Event service') }));
app.use('/api/banners', createProxyMiddleware({ target: EVENT_URL, changeOrigin: true, on: proxyErrorHandler('Event service') }));
app.use('/api/ticket-types', createProxyMiddleware({ target: EVENT_URL, changeOrigin: true, on: proxyErrorHandler('Event service') }));

// Order Service — /api/orders/*, /api/tickets/*
app.use('/api/orders', createProxyMiddleware({ target: ORDER_URL, changeOrigin: true, on: proxyErrorHandler('Order service') }));
app.use('/api/tickets', createProxyMiddleware({ target: ORDER_URL, changeOrigin: true, on: proxyErrorHandler('Order service') }));

// Notification Service — /api/notifications/*
app.use('/api/notifications', createProxyMiddleware({ target: NOTIFICATION_URL, changeOrigin: true, on: proxyErrorHandler('Notification service') }));

// ==================== Error Handler ====================

app.use(errorHandler);

// ==================== Start Server ====================

const PORT = process.env.GATEWAY_PORT || 3000;
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Auth Service → ${AUTH_URL}`);
  logger.info(`Event Service → ${EVENT_URL}`);
  logger.info(`Order Service → ${ORDER_URL}`);
  logger.info(`Notification Service → ${NOTIFICATION_URL}`);
});

export default app;
