/**
 * Guest Model
 * Defines the structure and validation for guest objects
 */

import { v4 as uuidv4 } from 'uuid';
import { isValidDateFormat, isValidDateRange, isDateRangeActive, getDateRangeStatus } from '../utils/dateUtils.js';

/**
 * Creates a new guest object
 * @param {object} data - Guest data
 * @param {string} [data.name] - Guest name (optional)
 * @param {string} data.arrivalDate - Arrival date (YYYY-MM-DD)
 * @param {string} data.departureDate - Departure date (YYYY-MM-DD)
 * @returns {object} Guest object
 */
export function createGuest({ name = '', arrivalDate, departureDate }) {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: name.trim(),
    arrivalDate,
    departureDate,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Validates guest input data
 * @param {object} data - Data to validate
 * @param {boolean} isUpdate - Whether this is an update (partial data allowed)
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateGuestInput(data, isUpdate = false) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid input data'] };
  }

  // For new guests, arrivalDate and departureDate are required
  if (!isUpdate) {
    if (!data.arrivalDate) {
      errors.push('arrivalDate is required');
    }
    if (!data.departureDate) {
      errors.push('departureDate is required');
    }
  }

  // Validate date formats if provided
  if (data.arrivalDate !== undefined) {
    if (!isValidDateFormat(data.arrivalDate)) {
      errors.push('arrivalDate must be in YYYY-MM-DD format');
    }
  }

  if (data.departureDate !== undefined) {
    if (!isValidDateFormat(data.departureDate)) {
      errors.push('departureDate must be in YYYY-MM-DD format');
    }
  }

  // Validate name if provided
  if (data.name !== undefined && typeof data.name !== 'string') {
    errors.push('name must be a string');
  }

  // Validate date range if both dates are valid
  if (data.arrivalDate && data.departureDate) {
    if (isValidDateFormat(data.arrivalDate) && isValidDateFormat(data.departureDate)) {
      if (!isValidDateRange(data.arrivalDate, data.departureDate)) {
        errors.push('departureDate must be on or after arrivalDate');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Adds computed properties to a guest object
 * @param {object} guest - Guest object from storage
 * @returns {object} Guest with computed properties
 */
export function enrichGuest(guest) {
  return {
    ...guest,
    isActive: isDateRangeActive(guest.arrivalDate, guest.departureDate),
    status: getDateRangeStatus(guest.arrivalDate, guest.departureDate)
  };
}

/**
 * Updates a guest object with new data
 * @param {object} guest - Existing guest
 * @param {object} updates - Fields to update
 * @returns {object} Updated guest
 */
export function updateGuest(guest, updates) {
  const allowedFields = ['name', 'arrivalDate', 'departureDate'];
  const updatedGuest = { ...guest };

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updatedGuest[field] = field === 'name' ? updates[field].trim() : updates[field];
    }
  }

  updatedGuest.updatedAt = new Date().toISOString();

  return updatedGuest;
}

export default {
  createGuest,
  validateGuestInput,
  enrichGuest,
  updateGuest
};
