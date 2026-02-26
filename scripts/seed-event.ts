import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const EVENT_DB = process.env.MONGODB_EVENT_DB || 'evient_events';

const ticketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  quantityTotal: { type: Number, required: true },
  quantitySold: { type: Number, default: 0, min: 0 },
  maxPerUser: { type: Number, default: -1 },
  status: { type: String, default: 'active' },
});

const eventSchema = new mongoose.Schema(
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
    status: { type: String, default: 'published' },
    isHot: { type: Boolean, default: false },
    maxTicketsPerUser: { type: Number, default: 10 },
    roomIds: [{ type: mongoose.Schema.Types.ObjectId }],
    ticketTypes: [ticketTypeSchema],
  },
  { timestamps: true }
);

async function seedEvent() {
  console.log('🌱 Bắt đầu seed Event...\n');
  const eventConn = mongoose.createConnection(`${MONGO_URI}/${EVENT_DB}`);
  const Event = eventConn.model('Event', eventSchema);

  try {
    const existingEvent = await Event.findOne({ slug: 'test-event-vnpay' });
    if (existingEvent) {
      console.log('✅ Event "Test Event VNPay" đã tồn tại.');
      return;
    }

    const newEvent = new Event({
      title: 'Test Event VNPay',
      slug: 'test-event-vnpay',
      description: 'Sự kiện dùng để test quy trình thanh toán VNPay Sandbox',
      content: 'Chi tiết nội dung sự kiện test...',
      location: 'Hà Nội',
      startTime: new Date('2026-12-01T08:00:00Z'),
      endTime: new Date('2026-12-05T20:00:00Z'),
      category: 'Music',
      status: 'published',
      isHot: true,
      thumbnailImage: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', // Placeholder
      bannerImage: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      ticketTypes: [
        {
          name: 'Vé Standard',
          price: 50000,
          quantityTotal: 100,
          status: 'active',
        },
        {
          name: 'Vé VIP',
          price: 150000,
          quantityTotal: 50,
          status: 'active',
        }
      ],
    });

    await newEvent.save();
    console.log('✅ Đã tạo event: Test Event VNPay');
  } catch (err) {
    console.error('❌ Thất bại:', err);
  } finally {
    await eventConn.close();
    process.exit(0);
  }
}

seedEvent();
