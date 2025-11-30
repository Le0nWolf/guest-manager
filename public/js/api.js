/**
 * API Client
 * Handles all communication with the backend
 */

const API_BASE = '/api/v1';

/**
 * Generic fetch wrapper with error handling
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  const data = await response.json();

  if (!response.ok || !data.success) {
    const error = new Error(data.error || 'An error occurred');
    error.details = data.details;
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

/**
 * Gets current guest status
 * @returns {Promise<object>} Status data
 */
export async function getStatus() {
  const response = await fetchApi('/status');
  return response.data;
}

/**
 * Gets all guests
 * @returns {Promise<object>} Guests data with statistics
 */
export async function getGuests() {
  const response = await fetchApi('/guests');
  return response.data;
}

/**
 * Gets a single guest by ID
 * @param {string} id - Guest ID
 * @returns {Promise<object>} Guest data
 */
export async function getGuest(id) {
  const response = await fetchApi(`/guests/${id}`);
  return response.data.guest;
}

/**
 * Creates a new guest
 * @param {object} guestData - Guest data
 * @returns {Promise<object>} Created guest
 */
export async function createGuest(guestData) {
  const response = await fetchApi('/guests', {
    method: 'POST',
    body: JSON.stringify(guestData)
  });
  return response.data.guest;
}

/**
 * Updates a guest
 * @param {string} id - Guest ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated guest
 */
export async function updateGuest(id, updates) {
  const response = await fetchApi(`/guests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  return response.data.guest;
}

/**
 * Deletes a guest
 * @param {string} id - Guest ID
 * @returns {Promise<void>}
 */
export async function deleteGuest(id) {
  await fetchApi(`/guests/${id}`, {
    method: 'DELETE'
  });
}

/**
 * Checks out a guest
 * @param {string} id - Guest ID
 * @returns {Promise<object>} Updated guest
 */
export async function checkoutGuest(id) {
  const response = await fetchApi(`/guests/${id}/checkout`, {
    method: 'POST'
  });
  return response.data.guest;
}

export default {
  getStatus,
  getGuests,
  getGuest,
  createGuest,
  updateGuest,
  deleteGuest,
  checkoutGuest
};
