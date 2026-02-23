import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { respond, transformUser, asyncHandler, createLogger } from '@evient/shared';
import { User } from '../models/User';

const logger = createLogger('user-controller');

/**
 * GET /users - List all users (admin)
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = (req.query.search as string) || '';
  const role = req.query.role as string;
  const status = req.query.status as string;

  const filter: any = {};

  if (search) {
    filter.$text = { $search: search };
  }
  if (role && ['user', 'admin'].includes(role)) {
    filter.role = role;
  }
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  respond.paginated(res, users.map(transformUser), { page, limit, total });
});

/**
 * GET /users/:id - Get user by ID (admin)
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select('-passwordHash').lean();
  if (!user) {
    return respond.notFound(res, 'User not found');
  }
  respond.success(res, transformUser(user));
});

/**
 * POST /users - Create user (admin)
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, full_name, password, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    return respond.error(res, 'Email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 10);
  const user = await User.create({
    email: email.toLowerCase(),
    fullName: full_name,
    passwordHash,
    role: role || 'user',
    isActive: true,
    passwordHistory: [{ changedAt: new Date(), reason: 'register' }],
  });

  const result = user.toObject();
  respond.successWithMessage(res, transformUser(result), 'User created successfully', 201);
});

/**
 * PUT /users/:id - Update user (admin)
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { full_name, email, role, phone_number, gender, address, date_of_birth, facebook_url, is_active } = req.body;

  const updateData: any = {};
  if (full_name !== undefined) updateData.fullName = full_name;
  if (email !== undefined) updateData.email = email.toLowerCase();
  if (role !== undefined) updateData.role = role;
  if (phone_number !== undefined) updateData.phoneNumber = phone_number;
  if (gender !== undefined) updateData.gender = gender;
  if (address !== undefined) updateData.address = address;
  if (date_of_birth !== undefined) updateData.dateOfBirth = date_of_birth;
  if (facebook_url !== undefined) updateData.facebookUrl = facebook_url;
  if (is_active !== undefined) updateData.isActive = is_active;

  if (req.body.password) {
    updateData.passwordHash = await bcrypt.hash(req.body.password, Number(process.env.BCRYPT_ROUNDS) || 10);
  }

  const updateOps: any = { $set: updateData };
  if (req.body.password) {
    updateOps.$push = { passwordHistory: { changedAt: new Date(), reason: 'admin_update' } };
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateOps,
    { new: true, runValidators: true }
  ).select('-passwordHash').lean();

  if (!user) {
    return respond.notFound(res, 'User not found');
  }

  respond.successWithMessage(res, transformUser(user), 'User updated successfully');
});

/**
 * DELETE /users/:id - Delete user (admin)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndDelete(req.params.id).lean();
  if (!user) {
    return respond.notFound(res, 'User not found');
  }
  respond.successMessage(res, 'User deleted successfully');
});

/**
 * PATCH /users/:id/toggle-status - Toggle user active status (admin)
 */
export const toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return respond.notFound(res, 'User not found');
  }

  user.isActive = !user.isActive;
  await user.save();

  respond.successWithMessage(
    res,
    transformUser(user.toObject()),
    `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
  );
});
