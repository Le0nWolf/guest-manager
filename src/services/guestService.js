/**
 * Guest Service
 * Business logic for guest management
 */

import { createGuest, validateGuestInput, enrichGuest, updateGuest } from '../models/guest.js';
import { createGuestRepository } from '../repositories/guestRepository.js';
import { getToday, isDateRangeActive, formatDateForDisplay } from '../utils/dateUtils.js';
import { createError } from '../middleware/errorHandler.js';

/**
 * Creates a guest service instance
 * @param {object} [repository] - Guest repository (defaults to file-based)
 * @returns {object} Service instance
 */
export function createGuestService(repository = createGuestRepository()) {
  /**
   * Gets the current status including active guest info
   * @returns {Promise<object>} Status object
   */
  async function getStatus() {
    const guests = await repository.findAll();
    const activeGuest = guests.find((g) =>
      !g.checkoutDate && isDateRangeActive(g.arrivalDate, g.departureDate)
    );

    return {
      hasActiveGuest: !!activeGuest,
      currentGuest: activeGuest ? enrichGuest(activeGuest) : null
    };
  }

  /**
   * Gets all guests with statistics
   * @returns {Promise<object>} Guests list with stats
   */
  async function getAllGuests() {
    const guests = await repository.findAll();
    const enrichedGuests = guests.map(enrichGuest);

    // Sort by arrivalDate descending (newest first)
    enrichedGuests.sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));

    const activeCount = enrichedGuests.filter((g) => g.isActive).length;

    return {
      guests: enrichedGuests,
      total: enrichedGuests.length,
      active: activeCount
    };
  }

  /**
   * Gets a single guest by ID
   * @param {string} id - Guest ID
   * @returns {Promise<object>} Enriched guest object
   * @throws {ApiError} If guest not found
   */
  async function getGuestById(id) {
    const guest = await repository.findById(id);

    if (!guest) {
      throw createError.notFound(`Guest with ID ${id} not found`);
    }

    return enrichGuest(guest);
  }

  /**
   * Creates a new guest
   * @param {object} data - Guest data
   * @returns {Promise<object>} Created guest
   * @throws {ApiError} If validation fails or dates overlap
   */
  async function createNewGuest(data) {
    // Validate input
    const validation = validateGuestInput(data, false);
    if (!validation.valid) {
      throw createError.badRequest('Validation failed', validation.errors);
    }

    // Check for overlapping dates (exclude checked-out guests)
    const existingGuests = await repository.findAll();
    const overlapping = existingGuests.find((g) => {
      // Skip checked-out guests - their dates are free again
      if (g.checkoutDate) return false;
      // Check if date ranges overlap
      return (
        data.arrivalDate <= g.departureDate &&
        data.departureDate >= g.arrivalDate
      );
    });

    if (overlapping) {
      const guestName = overlapping.name || 'Gast';
      const dates = `${formatDateForDisplay(overlapping.arrivalDate)} - ${formatDateForDisplay(overlapping.departureDate)}`;
      throw createError.conflict(
        `Zeitraum überschneidet sich mit ${guestName} (${dates})`
      );
    }

    // Create and save guest
    const guest = createGuest(data);
    await repository.create(guest);

    return enrichGuest(guest);
  }

  /**
   * Updates an existing guest
   * @param {string} id - Guest ID
   * @param {object} data - Fields to update
   * @returns {Promise<object>} Updated guest
   * @throws {ApiError} If validation fails or guest not found
   */
  async function updateExistingGuest(id, data) {
    // Get existing guest
    const existingGuest = await repository.findById(id);
    if (!existingGuest) {
      throw createError.notFound(`Guest with ID ${id} not found`);
    }

    // Validate input
    const validation = validateGuestInput(data, true);
    if (!validation.valid) {
      throw createError.badRequest('Validation failed', validation.errors);
    }

    // Check for overlapping dates if dates are being changed
    if (data.arrivalDate || data.departureDate) {
      const newArrival = data.arrivalDate || existingGuest.arrivalDate;
      const newDeparture = data.departureDate || existingGuest.departureDate;

      // Validate the new range
      const rangeValidation = validateGuestInput(
        { arrivalDate: newArrival, departureDate: newDeparture },
        false
      );
      if (!rangeValidation.valid) {
        throw createError.badRequest('Validation failed', rangeValidation.errors);
      }

      // Check for overlaps with other guests (exclude checked-out)
      const allGuests = await repository.findAll();
      const overlapping = allGuests.find((g) => {
        if (g.id === id) return false; // Skip self
        if (g.checkoutDate) return false; // Skip checked-out guests
        return newArrival <= g.departureDate && newDeparture >= g.arrivalDate;
      });

      if (overlapping) {
        const guestName = overlapping.name || 'Gast';
        const dates = `${formatDateForDisplay(overlapping.arrivalDate)} - ${formatDateForDisplay(overlapping.departureDate)}`;
        throw createError.conflict(
          `Zeitraum überschneidet sich mit ${guestName} (${dates})`
        );
      }
    }

    // Update guest
    const updatedGuest = updateGuest(existingGuest, data);
    await repository.update(id, updatedGuest);

    return enrichGuest(updatedGuest);
  }

  /**
   * Deletes a guest
   * @param {string} id - Guest ID
   * @returns {Promise<void>}
   * @throws {ApiError} If guest not found
   */
  async function deleteGuest(id) {
    const deleted = await repository.remove(id);

    if (!deleted) {
      throw createError.notFound(`Guest with ID ${id} not found`);
    }
  }

  /**
   * Checks out a guest (marks as checked out)
   * @param {string} id - Guest ID
   * @returns {Promise<object>} Updated guest
   * @throws {ApiError} If guest not found or already checked out
   */
  async function checkoutGuest(id) {
    const guest = await repository.findById(id);

    if (!guest) {
      throw createError.notFound(`Guest with ID ${id} not found`);
    }

    // Check if already checked out
    if (guest.checkoutDate) {
      throw createError.badRequest('Guest has already been checked out');
    }

    const today = getToday();

    // Check if guest has arrived
    if (guest.arrivalDate > today) {
      throw createError.badRequest('Guest has not arrived yet');
    }

    // Set checkout date to now
    const updatedGuest = updateGuest(guest, {
      checkoutDate: today,
      departureDate: today  // Also update departure for accuracy
    });
    await repository.update(id, updatedGuest);

    return enrichGuest(updatedGuest);
  }

  return {
    getStatus,
    getAllGuests,
    getGuestById,
    createNewGuest,
    updateExistingGuest,
    deleteGuest,
    checkoutGuest
  };
}

// Default service instance
export const guestService = createGuestService();

export default guestService;
