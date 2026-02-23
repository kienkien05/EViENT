import express from 'express';
import mongoose from 'mongoose';
import { createLogger, errorHandler } from '@evient/shared';
import routes from './routes';

const app = express();
const logger = createLogger('event-service');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'event',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', routes);
app.use(errorHandler);

const PORT = process.env.EVENT_SERVICE_PORT || 3002;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_EVENT_DB || 'evient_events';

async function start() {
  try {
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`, { maxPoolSize: 10 });
    logger.info(`Connected to MongoDB: ${DB_NAME}`);
    app.listen(PORT, () => logger.info(`Event Service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start Event Service:', err);
    process.exit(1);
  }
}

start();
export default app;
