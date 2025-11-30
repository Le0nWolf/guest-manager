/**
 * Internal API Client
 * Used by Telegram bot to call the REST API
 */

import config from '../config/index.js';

const BASE_URL = `http://localhost:${config.port}/api/v1`;

/**
 * Makes an API request
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'API request failed');
  }

  return data.data;
}

/**
 * Gets current guest status
 * @returns {Promise<object>} Status data
 */
export async function getStatus() {
  return request('/status');
}

/**
 * Gets all guests
 * @returns {Promise<object>} Guests data
 */
export async function getAllGuests() {
  return request('/guests');
}

/**
 * Creates a new guest
 * @param {object} guestData - Guest data
 * @returns {Promise<object>} Created guest
 */
export async function createGuest(guestData) {
  const result = await request('/guests', {
    method: 'POST',
    body: JSON.stringify(guestData)
  });
  return result.guest;
}

/**
 * Checks out a guest
 * @param {string} guestId - Guest ID
 * @returns {Promise<object>} Updated guest
 */
export async function checkoutGuest(guestId) {
  const result = await request(`/guests/${guestId}/checkout`, {
    method: 'POST'
  });
  return result.guest;
}

/**
 * Deletes a guest
 * @param {string} guestId - Guest ID
 * @returns {Promise<void>}
 */
export async function deleteGuest(guestId) {
  await request(`/guests/${guestId}`, {
    method: 'DELETE'
  });
}

export default {
  getStatus,
  getAllGuests,
  createGuest,
  checkoutGuest,
  deleteGuest
};
