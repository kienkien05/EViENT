import express from 'express';
import mongoose from 'mongoose';
import { createLogger, errorHandler } from '@evient/shared';
import routes from './routes';

const app = express();
const logger = createLogger('auth-service');

import path from 'path';

// ==================== Middleware ====================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve local uploads
app.use('/api/auth/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== Health Check ====================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'auth',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ==================== Routes ====================

app.use('/api', routes);

// ==================== Error Handler ====================

app.use(errorHandler);

// ==================== Database + Server ====================

const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_AUTH_DB || 'evient_auth';

async function start() {
  try {
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`, {
      maxPoolSize: 10,
    });
    logger.info(`Connected to MongoDB: ${DB_NAME}`);

    app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start Auth Service:', err);
    process.exit(1);
  }
}

start();

export default app;
