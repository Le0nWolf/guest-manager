/**
 * Guest Routes
 * API endpoints for guest management
 */

import { Router } from 'express';
import { guestController } from '../controllers/guestController.js';

const router = Router();

// Status endpoint for 1home integration
router.get('/status', guestController.getStatus);

// CRUD operations
router.get('/guests', guestController.getAllGuests);
router.get('/guests/:id', guestController.getGuestById);
router.post('/guests', guestController.createGuest);
router.patch('/guests/:id', guestController.updateGuest);
router.delete('/guests/:id', guestController.deleteGuest);

// Quick actions
router.post('/guests/:id/checkout', guestController.checkoutGuest);

export default router;
