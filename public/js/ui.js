/**
 * UI Components and Rendering
 * Handles all DOM manipulation and rendering
 */

/**
 * Formats a date string for display (DD.MM.YYYY)
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

/**
 * Gets today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets tomorrow's date in YYYY-MM-DD format
 * @returns {string} Tomorrow's date
 */
export function getTomorrow() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Renders the status card content
 * @param {object} status - Status data from API
 * @returns {string} HTML content
 */
export function renderStatus(status) {
  if (status.hasActiveGuest && status.currentGuest) {
    const guest = status.currentGuest;
    const name = guest.name || 'Gast';
    return `
      <div class="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-6">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500 flex items-center justify-center">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-2">Gast anwesend</h3>
        <p class="text-orange-700 dark:text-orange-300 text-lg mb-1">${escapeHtml(name)}</p>
        <p class="text-orange-600 dark:text-orange-400">
          ${formatDate(guest.arrivalDate)} - ${formatDate(guest.departureDate)}
        </p>
        <p class="text-sm text-orange-500 dark:text-orange-500 mt-4">
          Automatische Rollladensteuerung deaktiviert
        </p>
      </div>
    `;
  }

  return `
    <div class="bg-green-100 dark:bg-green-900/30 rounded-xl p-6">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h3 class="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">Kein Gast</h3>
      <p class="text-green-600 dark:text-green-400">
        Alle Automationen sind aktiv
      </p>
    </div>
  `;
}

/**
 * Renders a single guest item for the history list
 * @param {object} guest - Guest data
 * @returns {string} HTML content
 */
export function renderGuestItem(guest) {
  const name = guest.name || 'Gast (ohne Name)';
  const statusColors = {
    active: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    future: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    past: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  };
  const statusLabels = {
    active: 'Aktiv',
    future: 'Geplant',
    past: 'Vergangen'
  };

  return `
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between gap-4" data-guest-id="${guest.id}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h4 class="font-medium text-gray-900 dark:text-white truncate">${escapeHtml(name)}</h4>
          <span class="px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[guest.status]}">${statusLabels[guest.status]}</span>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          ${formatDate(guest.arrivalDate)} - ${formatDate(guest.departureDate)}
        </p>
      </div>
      <div class="flex items-center gap-2">
        ${guest.status !== 'past' ? `
          <button class="edit-guest-btn p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-id="${guest.id}" title="Bearbeiten">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        ` : ''}
        <button class="delete-from-list-btn p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-id="${guest.id}" title="Löschen">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders the guest list
 * @param {object[]} guests - Array of guests
 * @returns {string} HTML content
 */
export function renderGuestList(guests) {
  if (!guests || guests.length === 0) {
    return `
      <p class="text-center text-gray-500 dark:text-gray-400 py-4">
        Noch keine Gäste eingetragen
      </p>
    `;
  }

  return guests.map(renderGuestItem).join('');
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {'success' | 'error' | 'info'} type - Toast type
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-primary-500'
  };

  const icons = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>',
    error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>',
    info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
  };

  const toast = document.createElement('div');
  toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform translate-x-full transition-transform duration-300`;
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${icons[type]}
    </svg>
    <span class="text-sm font-medium">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });

  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Escapes HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sets loading state on a button
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} loading - Loading state
 */
export function setButtonLoading(button, loading) {
  if (loading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `
      <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Laden...</span>
    `;
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

export default {
  formatDate,
  getToday,
  getTomorrow,
  renderStatus,
  renderGuestItem,
  renderGuestList,
  showToast,
  escapeHtml,
  setButtonLoading
};
