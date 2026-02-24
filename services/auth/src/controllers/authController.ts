import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { respond, transformUser, asyncHandler, createLogger } from '@evient/shared';
import type { JwtPayload } from '@evient/shared';
import { User } from '../models/User';
import { OtpCode } from '../models/OtpCode';

const logger = createLogger('auth-controller');

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

/**
 * Send OTP via Notification Service (MailHog)
 */
async function sendOtpEmail(email: string, otpCode: string, type: 'register' | 'login' | 'reset_password') {
  try {
    await axios.post(`${NOTIFICATION_URL}/api/notifications/send-otp`, {
      email,
      otp_code: otpCode,
      type,
    });
    logger.info(`OTP email sent to ${email} via notification service | OTP: ${otpCode}`);
  } catch (err: any) {
    logger.error(`Failed to send OTP email to ${email}: ${err.message}`);
    // Don't throw — still allow flow to continue even if email fails
  }
}

/**
 * Generate 6-digit OTP
 */
function generateOtp(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('\n==================================');
  console.log(`=== OTP CODE: ${otp} ===`);
  console.log('==================================\n');
  return otp;
}

/**
 * POST /auth/register - Send OTP to register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    return respond.error(res, 'Email đã được đăng ký', 409);
  }

  const otpCode = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store OTP (with hashed password for later use)
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 10);

  await OtpCode.create({
    email: email.toLowerCase(),
    code: otpCode,
    type: 'register',
    expiresAt,
    isUsed: false,
  });

  // Send OTP via notification service (MailHog)
  await sendOtpEmail(email.toLowerCase(), otpCode, 'register');

  respond.successMessage(res, 'Mã OTP đã được gửi đến email của bạn', 200);
});

/**
 * POST /auth/verify-register - Verify OTP and create user
 */
export const verifyRegister = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, password, full_name } = req.body;

  const otpRecord = await OtpCode.findOne({
    email: email.toLowerCase(),
    code: otp,
    type: 'register',
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    return respond.error(res, 'Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  }

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();

  // Create user with password history
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 10);
  const user = await User.create({
    email: email.toLowerCase(),
    fullName: full_name,
    passwordHash,
    role: 'user',
    isActive: true,
    passwordHistory: [{ changedAt: new Date(), reason: 'register' }],
  });

  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );

  respond.successWithMessage(res, {
    token,
    user: transformUser(user),
  }, 'Đăng ký thành công', 201);
});

/**
 * POST /auth/login - Send OTP for login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return respond.error(res, 'Email hoặc mật khẩu không đúng', 401);
  }

  if (!user.isActive) {
    return respond.error(res, 'Tài khoản đang bị khóa', 403);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return respond.error(res, 'Email hoặc mật khẩu không đúng', 401);
  }

  // DEV MODE: Skip OTP if SKIP_LOGIN_OTP is set
  if (process.env.SKIP_LOGIN_OTP === 'true') {
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );
    return respond.successWithMessage(res, {
      token,
      user: transformUser(user),
    }, 'Đăng nhập thành công');
  }

  const otpCode = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await OtpCode.create({
    email: email.toLowerCase(),
    code: otpCode,
    type: 'login',
    expiresAt,
    isUsed: false,
  });

  // Send OTP via notification service (MailHog)
  await sendOtpEmail(email.toLowerCase(), otpCode, 'login');

  respond.successMessage(res, 'Mã OTP đã được gửi đến email của bạn');
});

/**
 * POST /auth/verify-login - Verify OTP and return JWT
 */
export const verifyLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const otpRecord = await OtpCode.findOne({
    email: email.toLowerCase(),
    code: otp,
    type: 'login',
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    return respond.error(res, 'Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!user) {
    return respond.error(res, 'Không tìm thấy người dùng', 404);
  }

  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );

  respond.successWithMessage(res, {
    token,
    user: transformUser(user),
  }, 'Đăng nhập thành công');
});

/**
 * POST /auth/forgot-password - Send reset password OTP
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!user) {
    // Don't reveal if user exists
    return respond.successMessage(res, 'Nếu email hợp lệ, bạn sẽ nhận được mã OTP khôi phục');
  }

  const otpCode = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await OtpCode.create({
    email: email.toLowerCase(),
    code: otpCode,
    type: 'reset_password',
    expiresAt,
    isUsed: false,
  });

  // Send OTP via notification service (MailHog)
  await sendOtpEmail(email.toLowerCase(), otpCode, 'reset_password');

  respond.successMessage(res, 'Nếu email hợp lệ, bạn sẽ nhận được mã OTP khôi phục');
});

/**
 * POST /auth/reset-password - Reset password with OTP
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, new_password } = req.body;

  const otpRecord = await OtpCode.findOne({
    email: email.toLowerCase(),
    code: otp,
    type: 'reset_password',
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    return respond.error(res, 'Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  const passwordHash = await bcrypt.hash(new_password, Number(process.env.BCRYPT_ROUNDS) || 10);
  await User.updateOne(
    { email: email.toLowerCase() },
    {
      $set: { passwordHash },
      $push: { passwordHistory: { changedAt: new Date(), reason: 'reset' } },
    }
  );

  respond.successMessage(res, 'Đặt lại mật khẩu thành công');
});

/**
 * GET /auth/profile - Get current user profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).lean();
  if (!user) {
    return respond.notFound(res, 'Không tìm thấy người dùng');
  }
  respond.success(res, transformUser(user));
});

/**
 * PUT /auth/profile - Update current user profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { full_name, phone_number, facebook_url, gender, address, date_of_birth } = req.body;

  const updateData: any = {};
  if (full_name !== undefined) updateData.fullName = full_name;
  if (phone_number !== undefined) updateData.phoneNumber = phone_number;
  if (facebook_url !== undefined) updateData.facebookUrl = facebook_url;
  if (gender !== undefined) updateData.gender = gender;
  if (address !== undefined) updateData.address = address;
  if (date_of_birth !== undefined) updateData.dateOfBirth = date_of_birth;

  // Handle avatar upload via Cloudinary (if file present)
  if (req.file) {
    // Cloudinary upload is handled by middleware, URL is on req.file
    updateData.avatarUrl = (req.file as any).path || (req.file as any).secure_url;
  }

  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!user) {
    return respond.notFound(res, 'Không tìm thấy người dùng');
  }

  respond.successWithMessage(res, transformUser(user), 'Cập nhật hồ sơ thành công');
});

/**
 * DELETE /auth/profile - Self delete current user
 */
export const deleteProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndDelete(req.user!.id).lean();
  if (!user) {
    return respond.notFound(res, 'Không tìm thấy người dùng');
  }

  // Also clean up any pending OTP codes for this user
  await OtpCode.deleteMany({ email: user.email });

  respond.successWithMessage(res, null, 'Xóa tài khoản thành công', 200);
});
