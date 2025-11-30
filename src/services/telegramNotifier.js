/**
 * Telegram Notification Service
 * Sends notifications for guest events
 * Uses the REST API for data operations (same as website and Telegram bot)
 */

import * as api from './apiClient.js';
import config from '../config/index.js';
import { formatDateForDisplay } from '../utils/dateUtils.js';

// Singleton state
let botInstance = null;

/**
 * Registers the bot instance for notifications
 * @param {TelegramBot} bot - The bot instance
 */
export function registerBot(bot) {
  botInstance = bot;
  console.log('Telegram Notifier: Registered with', getChatIds().length, 'chat(s)');
}

/**
 * Gets the configured chat IDs
 * @returns {string[]} Array of chat IDs
 */
function getChatIds() {
  return config.telegramAuthorizedUsers;
}

/**
 * Sends a notification to all configured chats
 * @param {string} message - Message to send (Markdown)
 */
export async function sendNotification(message) {
  if (!botInstance) {
    console.log('Telegram Notifier: No bot instance registered');
    return;
  }

  const chatIds = getChatIds();
  if (chatIds.length === 0) {
    console.log('Telegram Notifier: No chat IDs configured');
    return;
  }

  for (const chatId of chatIds) {
    try {
      await botInstance.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      console.log(`Telegram Notifier: Sent to ${chatId}`);
    } catch (error) {
      console.error(`Telegram notification failed for chat ${chatId}:`, error.message);
    }
  }
}

/**
 * Notifies about a new guest check-in
 * @param {object} guest - Guest data
 * @param {string} source - Source of action ('website', 'telegram', 'api')
 */
export async function notifyCheckin(guest, source = 'website') {
  console.log(`Telegram Notifier: notifyCheckin called (source: ${source})`);

  const guestName = guest.name || 'Gast';
  const sourceIcon = source === 'website' ? '🌐' : source === 'telegram' ? '📱' : '🔌';

  const message = `
${sourceIcon} *Neuer Check-in*

👤 ${guestName}
📅 ${formatDateForDisplay(guest.arrivalDate)} → ${formatDateForDisplay(guest.departureDate)}
${guest.isActive ? '\n_Rollladenautomation deaktiviert_' : ''}`;

  await sendNotification(message);
}

/**
 * Notifies about a guest checkout
 * @param {object} guest - Guest data
 * @param {string} source - Source of action
 */
export async function notifyCheckout(guest, source = 'website') {
  console.log(`Telegram Notifier: notifyCheckout called (source: ${source})`);

  const guestName = guest.name || 'Gast';
  const sourceIcon = source === 'website' ? '🌐' : source === 'telegram' ? '📱' : '🔌';

  const message = `
${sourceIcon} *Check-out*

👤 ${guestName}
📅 Abreise: ${formatDateForDisplay(guest.departureDate)}

_Rollladenautomation wieder aktiv_`;

  await sendNotification(message);
}

/**
 * Notifies about a deleted guest
 * @param {object} guest - Guest data
 * @param {string} source - Source of action
 */
export async function notifyDelete(guest, source = 'website') {
  console.log(`Telegram Notifier: notifyDelete called (source: ${source})`);

  const guestName = guest.name || 'Gast';
  const sourceIcon = source === 'website' ? '🌐' : source === 'telegram' ? '📱' : '🔌';

  const message = `
${sourceIcon} *Buchung gelöscht*

👤 ${guestName}
📅 ${formatDateForDisplay(guest.arrivalDate)} → ${formatDateForDisplay(guest.departureDate)}`;

  await sendNotification(message);
}

/**
 * Sends a startup notification to all configured chats
 */
export async function sendStartupNotification() {
  if (!botInstance) return;

  try {
    const status = await api.getStatus();
    const guestInfo = status.hasActiveGuest && status.currentGuest
      ? `🟠 Aktuell: ${status.currentGuest.name || 'Gast'} (${formatDateForDisplay(status.currentGuest.arrivalDate)} → ${formatDateForDisplay(status.currentGuest.departureDate)})`
      : '🟢 Kein Gast eingetragen';

    const message = `
🏠 *Guest Manager gestartet*

${guestInfo}

_Bot ist bereit für Befehle_`;

    await sendNotification(message);
  } catch (error) {
    console.error('Failed to send startup notification:', error.message);
  }
}
