/**
 * Guest Controller
 * Handles HTTP requests for guest management
 */

import { createGuestService } from '../services/guestService.js';
import { notifyCheckin, notifyCheckout, notifyDelete } from '../services/telegramNotifier.js';
import { sendSuccess } from '../utils/responseHelper.js';

/**
 * Creates guest controller handlers
 * @param {object} [service] - Guest service instance
 * @returns {object} Controller methods
 */
export function createGuestController(service = createGuestService()) {
  /**
   * GET /status
   * Returns current guest status for 1home integration
   */
  async function getStatus(req, res, next) {
    try {
      const status = await service.getStatus();
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /guests
   * Returns all guests with statistics
   */
  async function getAllGuests(req, res, next) {
    try {
      const result = await service.getAllGuests();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /guests/:id
   * Returns a single guest by ID
   */
  async function getGuestById(req, res, next) {
    try {
      const guest = await service.getGuestById(req.params.id);
      sendSuccess(res, { guest });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /guests
   * Creates a new guest
   */
  async function createGuest(req, res, next) {
    try {
      const guest = await service.createNewGuest(req.body);

      // Send Telegram notification (async, don't wait)
      notifyCheckin(guest, 'website').catch(() => {});

      sendSuccess(res, { guest }, {
        statusCode: 201,
        message: 'Guest created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /guests/:id
   * Updates an existing guest
   */
  async function updateGuest(req, res, next) {
    try {
      const guest = await service.updateExistingGuest(req.params.id, req.body);
      sendSuccess(res, { guest }, {
        message: 'Guest updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /guests/:id
   * Deletes a guest
   */
  async function deleteGuest(req, res, next) {
    try {
      // Get guest data before deletion for notification
      const guest = await service.getGuestById(req.params.id);
      await service.deleteGuest(req.params.id);

      // Send Telegram notification (async, don't wait)
      notifyDelete(guest, 'website').catch(() => {});

      sendSuccess(res, null, {
        message: 'Guest deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /guests/:id/checkout
   * Checks out a guest (sets departure to today)
   */
  async function checkoutGuest(req, res, next) {
    try {
      const guest = await service.checkoutGuest(req.params.id);

      // Send Telegram notification (async, don't wait)
      notifyCheckout(guest, 'website').catch(() => {});

      sendSuccess(res, { guest }, {
        message: 'Guest checked out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  return {
    getStatus,
    getAllGuests,
    getGuestById,
    createGuest,
    updateGuest,
    deleteGuest,
    checkoutGuest
  };
}

// Default controller instance
export const guestController = createGuestController();

export default guestController;
