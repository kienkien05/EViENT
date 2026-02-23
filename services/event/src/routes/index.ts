import { Router } from 'express';
import { authenticate, authorize, validate, validators } from '@evient/shared';
import * as ctrl from '../controllers/eventController';

const router = Router();

// ==================== Events ====================

router.get('/events', [...validators.paginationRules, validate], ctrl.getEvents);
router.get('/events/featured', ctrl.getFeaturedEvents);
router.get('/events/:id', [validators.objectIdParam(), validate], ctrl.getEventById);

router.post('/events', authenticate, authorize('admin'), [
  validators.requiredString('title', 'Title'),
  validate,
], ctrl.createEvent);

router.put('/events/:id', authenticate, authorize('admin'), [
  validators.objectIdParam(), validate,
], ctrl.updateEvent);

router.delete('/events/:id', authenticate, authorize('admin'), [
  validators.objectIdParam(), validate,
], ctrl.deleteEvent);

// ==================== Rooms ====================

router.get('/rooms', ctrl.getRooms);

router.post('/rooms', authenticate, authorize('admin'), [
  validators.requiredString('name', 'Room name'),
  validate,
], ctrl.createRoom);

router.put('/rooms/:id', authenticate, authorize('admin'), [
  validators.objectIdParam(), validate,
], ctrl.updateRoom);

router.put('/rooms/:id/seats', authenticate, authorize('admin'), [
  validators.objectIdParam(), validate,
], ctrl.updateRoomSeatsBatch);

router.put('/rooms/:id/seat-locks', authenticate, authorize('admin'), [
  validators.objectIdParam(), validate,
], ctrl.updateRoomSeatLocksBatch);

router.delete('/rooms/:id', authenticate, authorize('admin'), [
  validators.objectIdParam(), validate,
], ctrl.deleteRoom);

// ==================== Banners ====================

router.get('/banners', ctrl.getBanners);

router.post('/banners', authenticate, authorize('admin'), [
  validators.requiredString('title', 'Title'),
  validators.requiredString('image_url', 'Image URL'),
  validate,
], ctrl.createBanner);

router.put('/banners/:id', authenticate, authorize('admin'), [
  validators.objectIdParam(), validate,
], ctrl.updateBanner);

router.delete('/banners/:id', authenticate, authorize('admin'), [
  validators.objectIdParam(), validate,
], ctrl.deleteBanner);

export default router;
