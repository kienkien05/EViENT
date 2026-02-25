import { createLogger, errorHandler } from '@evient/shared';
import express from 'express';
import mongoose from 'mongoose';
import { cancelExpiredOrders } from './controllers/orderController';
import routes from './routes';

const app = express();
const logger = createLogger('order-service');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'order',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', routes);
app.use(errorHandler);

const PORT = process.env.ORDER_SERVICE_PORT || 3003;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_ORDER_DB || 'evient_orders';

async function start() {
  try {
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`, { maxPoolSize: 10 });
    logger.info(`Connected to MongoDB: ${DB_NAME}`);
    app.listen(PORT, () => logger.info(`Order Service running on port ${PORT}`));

    // Run expired order cleanup every 5 minutes
    setInterval(async () => {
      try {
        await cancelExpiredOrders();
      } catch (err) {
        logger.error('Error running cancelExpiredOrders:', err);
      }
    }, 5 * 60 * 1000);
  } catch (err) {
    logger.error('Failed to start Order Service:', err);
    process.exit(1);
  }
}

start();
export default app;

