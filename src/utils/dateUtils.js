/**
 * Date Utility Functions
 * All dates are handled as YYYY-MM-DD strings in local timezone
 */

/**
 * Gets today's date as YYYY-MM-DD string in local timezone
 * @returns {string} Today's date
 */
export function getToday() {
  const now = new Date();
  return formatDate(now);
}

/**
 * Formats a Date object to YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string to Date object (at midnight local time)
 * @param {string} dateString - Date string to parse
 * @returns {Date} Parsed date
 */
export function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Validates a date string format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid
 */
export function isValidDateFormat(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  // Check if it's a real date
  const date = parseDate(dateString);
  return !isNaN(date.getTime()) && formatDate(date) === dateString;
}

/**
 * Checks if a date range is active (includes today)
 * @param {string} arrivalDate - Arrival date (YYYY-MM-DD)
 * @param {string} departureDate - Departure date (YYYY-MM-DD)
 * @returns {boolean} True if date range includes today
 */
export function isDateRangeActive(arrivalDate, departureDate) {
  const today = getToday();
  return arrivalDate <= today && departureDate >= today;
}

/**
 * Checks if arrival date is before or equal to departure date
 * @param {string} arrivalDate - Arrival date (YYYY-MM-DD)
 * @param {string} departureDate - Departure date (YYYY-MM-DD)
 * @returns {boolean} True if valid range
 */
export function isValidDateRange(arrivalDate, departureDate) {
  return arrivalDate <= departureDate;
}

/**
 * Categorizes a date range as past, active, or future
 * @param {string} arrivalDate - Arrival date (YYYY-MM-DD)
 * @param {string} departureDate - Departure date (YYYY-MM-DD)
 * @returns {'past' | 'active' | 'future'} Category
 */
export function getDateRangeStatus(arrivalDate, departureDate) {
  const today = getToday();

  if (departureDate < today) {
    return 'past';
  }

  if (arrivalDate <= today && departureDate >= today) {
    return 'active';
  }

  return 'future';
}

/**
 * Formats a date for display (e.g., "27.11.2025")
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date for display
 */
export function formatDateForDisplay(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

export default {
  getToday,
  formatDate,
  parseDate,
  isValidDateFormat,
  isDateRangeActive,
  isValidDateRange,
  getDateRangeStatus,
  formatDateForDisplay
};
