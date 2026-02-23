import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize, validate, validators } from '@evient/shared';
import * as authCtrl from '../controllers/authController';
import * as userCtrl from '../controllers/userController';
import { upload, handleUpload } from '../controllers/uploadController';

const router = Router();

// ==================== Auth Routes (public) ====================

router.post('/auth/register', [
  validators.emailRule(),
  validators.passwordRule(),
  validators.requiredString('full_name', 'Full name'),
  validate,
], authCtrl.register);

router.post('/auth/verify-register', [
  validators.emailRule(),
  body('otp').notEmpty().withMessage('OTP is required'),
  validators.passwordRule(),
  validators.requiredString('full_name', 'Full name'),
  validate,
], authCtrl.verifyRegister);

router.post('/auth/login', [
  validators.emailRule(),
  validators.passwordRule(),
  validate,
], authCtrl.login);

router.post('/auth/verify-login', [
  validators.emailRule(),
  body('otp').notEmpty().withMessage('OTP is required'),
  validate,
], authCtrl.verifyLogin);

router.post('/auth/forgot-password', [
  validators.emailRule(),
  validate,
], authCtrl.forgotPassword);

router.post('/auth/reset-password', [
  validators.emailRule(),
  body('otp').notEmpty().withMessage('OTP is required'),
  body('new_password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
], authCtrl.resetPassword);

// ==================== Profile Routes (authenticated) ====================

router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/profile', authenticate, authCtrl.updateProfile);

// ==================== Upload Route ====================

router.post('/upload', authenticate, upload.single('file'), handleUpload);

// ==================== User Admin Routes (admin only) ====================

router.get('/users', authenticate, authorize('admin'), [
  ...validators.paginationRules,
  validate,
], userCtrl.getUsers);

router.get('/users/:id',
  authenticate,
  authorize('admin'),
  [validators.objectIdParam(), validate],
  userCtrl.getUserById
);

router.post('/users', authenticate, authorize('admin'), [
  validators.emailRule(),
  validators.passwordRule(),
  validators.requiredString('full_name', 'Full name'),
  validate,
], userCtrl.createUser);

router.put('/users/:id', authenticate, authorize('admin'), [
  validators.objectIdParam(),
  validate,
], userCtrl.updateUser);

router.delete('/users/:id', authenticate, authorize('admin'), [
  validators.objectIdParam(),
  validate,
], userCtrl.deleteUser);

router.patch('/users/:id/toggle-status', authenticate, authorize('admin'), [
  validators.objectIdParam(),
  validate,
], userCtrl.toggleUserStatus);

export default router;
