/**
 * Telegram Notification Service
 * Sends notifications and manages channel status
 */

import config from '../config/index.js';
import { formatDateForDisplay } from '../utils/dateUtils.js';

// Singleton state
let botInstance = null;
let guestServiceInstance = null;

/**
 * Registers the bot instance for notifications
 * @param {TelegramBot} bot - The bot instance
 * @param {object} guestService - Guest service instance
 */
export function registerBot(bot, guestService) {
  botInstance = bot;
  guestServiceInstance = guestService;
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
 * Updates the chat title to reflect guest status
 * @param {boolean} hasGuest - Whether a guest is present
 * @param {string} [guestName] - Optional guest name
 */
export async function updateChatTitle(hasGuest, guestName = '') {
  if (!botInstance) return;

  const chatIds = getChatIds();
  if (chatIds.length === 0) return;

  const title = hasGuest
    ? `🟠 Gast: ${guestName || 'anwesend'}`
    : '🟢 Kein Gast';

  for (const chatId of chatIds) {
    try {
      await botInstance.setChatTitle(chatId, title);
    } catch (error) {
      // Bot might not have permission to change title
      if (!error.message?.includes('not enough rights')) {
        console.error(`Failed to update chat title for ${chatId}:`, error.message);
      }
    }
  }
}

/**
 * Notifies about a new guest check-in
 * @param {object} guest - Guest data
 * @param {string} source - Source of action ('website', 'telegram', 'api')
 */
export async function notifyCheckin(guest, source = 'website') {
  const guestName = guest.name || 'Gast';
  const sourceIcon = source === 'website' ? '🌐' : source === 'telegram' ? '📱' : '🔌';

  const message = `
${sourceIcon} *Neuer Check-in*

👤 ${guestName}
📅 ${formatDateForDisplay(guest.arrivalDate)} → ${formatDateForDisplay(guest.departureDate)}
${guest.isActive ? '\n_Rollladenautomation deaktiviert_' : ''}`;

  await sendNotification(message);

  if (guest.isActive) {
    await updateChatTitle(true, guestName);
  }
}

/**
 * Notifies about a guest checkout
 * @param {object} guest - Guest data
 * @param {string} source - Source of action
 */
export async function notifyCheckout(guest, source = 'website') {
  const guestName = guest.name || 'Gast';
  const sourceIcon = source === 'website' ? '🌐' : source === 'telegram' ? '📱' : '🔌';

  const message = `
${sourceIcon} *Check-out*

👤 ${guestName}
📅 Abreise: ${formatDateForDisplay(guest.departureDate)}

_Rollladenautomation wieder aktiv_`;

  await sendNotification(message);
  await updateChatTitle(false);
}

/**
 * Notifies about a deleted guest
 * @param {object} guest - Guest data
 * @param {string} source - Source of action
 */
export async function notifyDelete(guest, source = 'website') {
  const guestName = guest.name || 'Gast';
  const sourceIcon = source === 'website' ? '🌐' : source === 'telegram' ? '📱' : '🔌';

  const message = `
${sourceIcon} *Buchung gelöscht*

👤 ${guestName}
📅 ${formatDateForDisplay(guest.arrivalDate)} → ${formatDateForDisplay(guest.departureDate)}`;

  await sendNotification(message);

  // Check if there's still an active guest
  if (guestServiceInstance) {
    try {
      const status = await guestServiceInstance.getStatus();
      if (status.hasActiveGuest && status.currentGuest) {
        await updateChatTitle(true, status.currentGuest.name);
      } else {
        await updateChatTitle(false);
      }
    } catch {
      await updateChatTitle(false);
    }
  }
}

/**
 * Updates channel title based on current status
 * Call this on startup to sync the title
 */
export async function syncChannelTitle() {
  if (!botInstance || !guestServiceInstance) return;

  try {
    const status = await guestServiceInstance.getStatus();
    if (status.hasActiveGuest && status.currentGuest) {
      await updateChatTitle(true, status.currentGuest.name);
    } else {
      await updateChatTitle(false);
    }
  } catch (error) {
    console.error('Failed to sync channel title:', error.message);
  }
}
