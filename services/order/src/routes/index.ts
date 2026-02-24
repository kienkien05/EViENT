import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize, validate, validators } from '@evient/shared';
import * as ctrl from '../controllers/orderController';

const router = Router();

// ==================== Orders (authenticated users) ====================

router.post('/orders', authenticate, [
  body('event_id').notEmpty().withMessage('Event ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  validate,
], ctrl.createOrder);

router.get('/orders/my-tickets', authenticate, [
  ...validators.paginationRules,
  validate,
], ctrl.getMyTickets);

router.get('/orders/remaining/:eventId', ctrl.getRemainingTickets);
router.get('/orders/events/:eventId/sold-seats', ctrl.getSoldSeats);
router.get('/orders/revenue-report', authenticate, authorize('admin'), ctrl.getRevenueReport);

// ==================== Tickets (admin) ====================

router.get('/tickets', authenticate, authorize('admin'), [
  ...validators.paginationRules,
  validate,
], ctrl.getTickets);

router.post('/tickets/validate-qr', authenticate, authorize('admin'), [
  body('ticket_code').notEmpty().withMessage('Ticket code is required'),
  validate,
], ctrl.validateQR);

router.get('/tickets/info/:code', authenticate, authorize('admin'), ctrl.getTicketInfo);

router.post('/tickets/resend-email', authenticate, authorize('admin'), [
  body('ticket_id').notEmpty().withMessage('Ticket ID is required'),
  validate,
], ctrl.resendTicketEmail);

router.delete('/orders/:id', authenticate, authorize('admin'), ctrl.deleteOrder);
router.put('/tickets/:id', authenticate, authorize('admin'), ctrl.updateTicket);

export default router;
