/**
 * Main Application
 * Handles app initialization and event binding
 */

import * as api from './api.js';
import * as ui from './ui.js';

// Application State
const state = {
  currentGuest: null,
  guests: [],
  historyVisible: false
};

// DOM Elements
const elements = {
  statusContent: document.getElementById('status-content'),
  activeGuestActions: document.getElementById('active-guest-actions'),
  refreshBtn: document.getElementById('refresh-btn'),
  addGuestForm: document.getElementById('add-guest-form'),
  guestName: document.getElementById('guest-name'),
  arrivalDate: document.getElementById('arrival-date'),
  departureDate: document.getElementById('departure-date'),
  submitBtn: document.getElementById('submit-btn'),
  checkoutBtn: document.getElementById('checkout-btn'),
  editDepartureBtn: document.getElementById('edit-departure-btn'),
  deleteGuestBtn: document.getElementById('delete-guest-btn'),
  toggleHistory: document.getElementById('toggle-history'),
  historyContent: document.getElementById('history-content'),
  historyChevron: document.getElementById('history-chevron'),
  historyCount: document.getElementById('history-count'),
  guestList: document.getElementById('guest-list'),
  editModal: document.getElementById('edit-modal'),
  editForm: document.getElementById('edit-form'),
  editGuestId: document.getElementById('edit-guest-id'),
  editDepartureDate: document.getElementById('edit-departure-date'),
  closeModal: document.getElementById('close-modal'),
  cancelEdit: document.getElementById('cancel-edit'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  confirmCancel: document.getElementById('confirm-cancel'),
  confirmAction: document.getElementById('confirm-action'),
  themeToggle: document.getElementById('theme-toggle')
};

// Pending confirmation callback
let pendingConfirmAction = null;

/**
 * Initializes the application
 */
async function init() {
  // Set default dates
  const today = ui.getToday();
  elements.arrivalDate.value = today;
  elements.arrivalDate.min = today;
  elements.departureDate.min = today;

  // Set up event listeners
  setupEventListeners();

  // Initialize dark mode
  initDarkMode();

  // Load initial data
  await loadData();
}

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
  // Refresh button
  elements.refreshBtn.addEventListener('click', loadData);

  // Add guest form
  elements.addGuestForm.addEventListener('submit', handleAddGuest);

  // Date validation
  elements.arrivalDate.addEventListener('change', () => {
    elements.departureDate.min = elements.arrivalDate.value;
    if (elements.departureDate.value < elements.arrivalDate.value) {
      elements.departureDate.value = elements.arrivalDate.value;
    }
  });

  // Active guest actions
  elements.checkoutBtn.addEventListener('click', handleCheckout);
  elements.editDepartureBtn.addEventListener('click', () => openEditModal(state.currentGuest));
  elements.deleteGuestBtn.addEventListener('click', () => confirmDelete(state.currentGuest));

  // History toggle
  elements.toggleHistory.addEventListener('click', toggleHistory);

  // Guest list actions (event delegation)
  elements.guestList.addEventListener('click', handleGuestListClick);

  // Edit modal
  elements.closeModal.addEventListener('click', closeEditModal);
  elements.cancelEdit.addEventListener('click', closeEditModal);
  elements.editForm.addEventListener('submit', handleEditSubmit);
  elements.editModal.addEventListener('click', (e) => {
    if (e.target === elements.editModal) closeEditModal();
  });

  // Confirm modal
  elements.confirmCancel.addEventListener('click', closeConfirmModal);
  elements.confirmAction.addEventListener('click', executeConfirmAction);
  elements.confirmModal.addEventListener('click', (e) => {
    if (e.target === elements.confirmModal) closeConfirmModal();
  });

  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleDarkMode);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeConfirmModal();
    }
  });
}

/**
 * Loads status and guest data
 */
async function loadData() {
  try {
    // Show loading state
    elements.statusContent.innerHTML = `
      <div class="loading-spinner mx-auto mb-4"></div>
      <p class="text-gray-500 dark:text-gray-400">Laden...</p>
    `;

    // Load status and guests in parallel
    const [status, guestsData] = await Promise.all([
      api.getStatus(),
      api.getGuests()
    ]);

    // Update state
    state.currentGuest = status.currentGuest;
    state.guests = guestsData.guests;

    // Render status
    elements.statusContent.innerHTML = ui.renderStatus(status);

    // Show/hide active guest actions
    if (status.hasActiveGuest) {
      elements.activeGuestActions.classList.remove('hidden');
    } else {
      elements.activeGuestActions.classList.add('hidden');
    }

    // Update guest list
    elements.guestList.innerHTML = ui.renderGuestList(state.guests);
    elements.historyCount.textContent = state.guests.length;

  } catch (error) {
    console.error('Failed to load data:', error);
    elements.statusContent.innerHTML = `
      <div class="text-red-500 dark:text-red-400">
        <p class="mb-2">Fehler beim Laden</p>
        <p class="text-sm">${ui.escapeHtml(error.message)}</p>
      </div>
    `;
    ui.showToast('Fehler beim Laden der Daten', 'error');
  }
}

/**
 * Handles add guest form submission
 * @param {Event} e - Submit event
 */
async function handleAddGuest(e) {
  e.preventDefault();

  const data = {
    name: elements.guestName.value.trim(),
    arrivalDate: elements.arrivalDate.value,
    departureDate: elements.departureDate.value
  };

  // Validate
  if (data.departureDate < data.arrivalDate) {
    ui.showToast('Abreisedatum muss nach Ankunftsdatum liegen', 'error');
    return;
  }

  ui.setButtonLoading(elements.submitBtn, true);

  try {
    await api.createGuest(data);
    ui.showToast('Gast erfolgreich eingetragen', 'success');

    // Reset form
    elements.addGuestForm.reset();
    elements.arrivalDate.value = ui.getToday();
    elements.departureDate.min = ui.getToday();

    // Reload data
    await loadData();

    // Show history if hidden
    if (!state.historyVisible) {
      toggleHistory();
    }

  } catch (error) {
    console.error('Failed to create guest:', error);
    const message = error.details?.length > 0
      ? error.details.join(', ')
      : error.message;
    ui.showToast(message, 'error');
  } finally {
    ui.setButtonLoading(elements.submitBtn, false);
  }
}

/**
 * Handles checkout of current guest
 */
async function handleCheckout() {
  if (!state.currentGuest) return;

  showConfirmModal(
    'Gast auschecken',
    `Mochten Sie den Gast "${state.currentGuest.name || 'Gast'}" jetzt auschecken? Das Abreisedatum wird auf heute gesetzt.`,
    async () => {
      ui.setButtonLoading(elements.checkoutBtn, true);
      try {
        await api.checkoutGuest(state.currentGuest.id);
        ui.showToast('Gast erfolgreich ausgecheckt', 'success');
        await loadData();
      } catch (error) {
        console.error('Failed to checkout guest:', error);
        ui.showToast(error.message, 'error');
      } finally {
        ui.setButtonLoading(elements.checkoutBtn, false);
      }
    }
  );
}

/**
 * Handles clicks in the guest list (event delegation)
 * @param {Event} e - Click event
 */
function handleGuestListClick(e) {
  const editBtn = e.target.closest('.edit-guest-btn');
  const deleteBtn = e.target.closest('.delete-from-list-btn');

  if (editBtn) {
    const guestId = editBtn.dataset.id;
    const guest = state.guests.find(g => g.id === guestId);
    if (guest) openEditModal(guest);
  }

  if (deleteBtn) {
    const guestId = deleteBtn.dataset.id;
    const guest = state.guests.find(g => g.id === guestId);
    if (guest) confirmDelete(guest);
  }
}

/**
 * Opens the edit modal for a guest
 * @param {object} guest - Guest to edit
 */
function openEditModal(guest) {
  if (!guest) return;

  elements.editGuestId.value = guest.id;
  elements.editDepartureDate.value = guest.departureDate;
  elements.editDepartureDate.min = guest.arrivalDate;
  elements.editModal.classList.remove('hidden');
  elements.editDepartureDate.focus();
}

/**
 * Closes the edit modal
 */
function closeEditModal() {
  elements.editModal.classList.add('hidden');
  elements.editForm.reset();
}

/**
 * Handles edit form submission
 * @param {Event} e - Submit event
 */
async function handleEditSubmit(e) {
  e.preventDefault();

  const id = elements.editGuestId.value;
  const departureDate = elements.editDepartureDate.value;

  try {
    await api.updateGuest(id, { departureDate });
    ui.showToast('Abreisedatum aktualisiert', 'success');
    closeEditModal();
    await loadData();
  } catch (error) {
    console.error('Failed to update guest:', error);
    ui.showToast(error.message, 'error');
  }
}

/**
 * Shows confirmation dialog for deleting a guest
 * @param {object} guest - Guest to delete
 */
function confirmDelete(guest) {
  if (!guest) return;

  showConfirmModal(
    'Gast loschen',
    `Mochten Sie den Aufenthalt von "${guest.name || 'Gast'}" wirklich loschen? Diese Aktion kann nicht ruckgangig gemacht werden.`,
    async () => {
      try {
        await api.deleteGuest(guest.id);
        ui.showToast('Gast erfolgreich geloscht', 'success');
        await loadData();
      } catch (error) {
        console.error('Failed to delete guest:', error);
        ui.showToast(error.message, 'error');
      }
    }
  );
}

/**
 * Shows the confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} onConfirm - Callback on confirm
 */
function showConfirmModal(title, message, onConfirm) {
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  pendingConfirmAction = onConfirm;
  elements.confirmModal.classList.remove('hidden');
}

/**
 * Closes the confirmation modal
 */
function closeConfirmModal() {
  elements.confirmModal.classList.add('hidden');
  pendingConfirmAction = null;
}

/**
 * Executes the pending confirmation action
 */
async function executeConfirmAction() {
  if (pendingConfirmAction) {
    await pendingConfirmAction();
  }
  closeConfirmModal();
}

/**
 * Toggles the history section visibility
 */
function toggleHistory() {
  state.historyVisible = !state.historyVisible;
  elements.historyContent.classList.toggle('hidden', !state.historyVisible);
  elements.historyChevron.classList.toggle('rotate-180', state.historyVisible);
}

/**
 * Initializes dark mode based on system preference or saved preference
 */
function initDarkMode() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
}

/**
 * Toggles dark mode
 */
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

export { loadData };
