/**
 * Guest Repository
 * Handles data persistence using JSON file storage
 */

import { readFile, writeFile, mkdir, rename, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import config from '../config/index.js';

/**
 * Validates a guest object has required fields
 * @param {*} guest - Object to validate
 * @returns {boolean} True if valid guest structure
 */
function isValidGuest(guest) {
  if (!guest || typeof guest !== 'object') return false;
  if (!guest.id || typeof guest.id !== 'string') return false;
  if (!guest.arrivalDate || typeof guest.arrivalDate !== 'string') return false;
  if (!guest.departureDate || typeof guest.departureDate !== 'string') return false;
  return true;
}

/**
 * Creates a guest repository instance
 * @param {string} [dataPath] - Path to the JSON file
 * @returns {object} Repository instance
 */
export function createGuestRepository(dataPath = config.dataPath) {
  /**
   * Ensures the data directory exists
   */
  async function ensureDataDirectory() {
    const dir = dirname(dataPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Reads all guests from the JSON file
   * @returns {Promise<object[]>} Array of guests
   */
  async function readData() {
    try {
      await ensureDataDirectory();

      if (!existsSync(dataPath)) {
        return [];
      }

      const content = await readFile(dataPath, 'utf-8');
      const data = JSON.parse(content);

      // Handle both array format and object with guests array
      const rawGuests = Array.isArray(data) ? data : (data.guests || []);

      // Filter and validate guests, log any invalid entries
      const validGuests = [];
      for (const guest of rawGuests) {
        if (isValidGuest(guest)) {
          validGuests.push(guest);
        } else {
          console.warn('Invalid guest object found and skipped:', JSON.stringify(guest));
        }
      }

      return validGuests;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Writes guests array to the JSON file using atomic write
   * (write to temp file, then rename to prevent data corruption)
   * @param {object[]} guests - Array of guests
   */
  async function writeData(guests) {
    await ensureDataDirectory();

    const data = {
      guests,
      lastUpdated: new Date().toISOString()
    };

    const tempPath = `${dataPath}.tmp`;

    try {
      // Write to temp file first
      await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      // Atomic rename (prevents corruption on concurrent writes)
      await rename(tempPath, dataPath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Gets all guests
   * @returns {Promise<object[]>} Array of all guests
   */
  async function findAll() {
    return readData();
  }

  /**
   * Gets a single guest by ID
   * @param {string} id - Guest ID
   * @returns {Promise<object|null>} Guest or null if not found
   */
  async function findById(id) {
    const guests = await readData();
    return guests.find((g) => g.id === id) || null;
  }

  /**
   * Creates a new guest
   * @param {object} guest - Guest object to create
   * @returns {Promise<object>} Created guest
   */
  async function create(guest) {
    const guests = await readData();
    guests.push(guest);
    await writeData(guests);
    return guest;
  }

  /**
   * Updates an existing guest
   * @param {string} id - Guest ID
   * @param {object} updatedGuest - Updated guest object
   * @returns {Promise<object|null>} Updated guest or null if not found
   */
  async function update(id, updatedGuest) {
    const guests = await readData();
    const index = guests.findIndex((g) => g.id === id);

    if (index === -1) {
      return null;
    }

    guests[index] = updatedGuest;
    await writeData(guests);
    return updatedGuest;
  }

  /**
   * Deletes a guest by ID
   * @param {string} id - Guest ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async function remove(id) {
    const guests = await readData();
    const index = guests.findIndex((g) => g.id === id);

    if (index === -1) {
      return false;
    }

    guests.splice(index, 1);
    await writeData(guests);
    return true;
  }

  /**
   * Finds guests matching a predicate
   * @param {Function} predicate - Filter function
   * @returns {Promise<object[]>} Matching guests
   */
  async function findWhere(predicate) {
    const guests = await readData();
    return guests.filter(predicate);
  }

  return {
    findAll,
    findById,
    create,
    update,
    remove,
    findWhere
  };
}

// Default repository instance
export const guestRepository = createGuestRepository();

export default guestRepository;
