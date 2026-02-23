/**
 * Seed script — tạo tài khoản cho EViENT
 *
 * Chạy: npm run seed
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── Config ──────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const AUTH_DB = process.env.MONGODB_AUTH_DB || 'evient_auth';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

// ─── User Schema ─────────────────────────────────────────
function getUserModel(conn: mongoose.Connection) {
  const userSchema = new mongoose.Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      fullName: { type: String, required: true, trim: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ['user', 'admin'], default: 'user' },
      isActive: { type: Boolean, default: true },
      avatarUrl: String,
      phoneNumber: String,
      facebookUrl: String,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      address: String,
      dateOfBirth: Date,
    },
    { timestamps: true }
  );
  return conn.model('User', userSchema);
}

// ─── Seed ────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  const authConn = mongoose.createConnection(`${MONGO_URI}/${AUTH_DB}`);
  const User = getUserModel(authConn);

  try {
    console.log('👤 Tạo tài khoản...');

    const adminPassword = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
    const userPassword = await bcrypt.hash('user123', BCRYPT_ROUNDS);

    await User.findOneAndUpdate(
      { email: 'admin@evient.vn' },
      {
        email: 'admin@evient.vn',
        fullName: 'Admin EViENT',
        passwordHash: adminPassword,
        role: 'admin',
        isActive: true,
        gender: 'other',
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { email: 'user@evient.vn' },
      {
        email: 'user@evient.vn',
        fullName: 'Nguyễn Văn A',
        passwordHash: userPassword,
        role: 'user',
        isActive: true,
        gender: 'male',
        phoneNumber: '0901234567',
        address: 'TP. Hồ Chí Minh',
      },
      { upsert: true, new: true }
    );

    console.log('   ✅ admin@evient.vn / admin123 (role: admin)');
    console.log('   ✅ user@evient.vn  / user123  (role: user)');

    console.log('\n🎉 Seed hoàn tất!\n');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Tài khoản Admin                            ║');
    console.log('║  Email:    admin@evient.vn                   ║');
    console.log('║  Password: admin123                          ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Tài khoản User                             ║');
    console.log('║  Email:    user@evient.vn                    ║');
    console.log('║  Password: user123                           ║');
    console.log('╚══════════════════════════════════════════════╝');
  } catch (err) {
    console.error('❌ Seed thất bại:', err);
  } finally {
    await authConn.close();
    console.log('\n📦 Đã đóng kết nối MongoDB.');
    process.exit(0);
  }
}

seed();
