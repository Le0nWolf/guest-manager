/**
 * Telegram Bot Service
 * Provides a chat interface for guest management
 * Uses the REST API for all data operations (same as website)
 */

import TelegramBot from 'node-telegram-bot-api';
import * as api from './apiClient.js';
import { registerBot, sendStartupNotification } from './telegramNotifier.js';
import { formatDateForDisplay, getToday, getTomorrow, isValidDateFormat } from '../utils/dateUtils.js';
import config from '../config/index.js';

/**
 * Creates and starts the Telegram bot
 * @returns {TelegramBot|null} Bot instance or null if not configured
 */
export function createTelegramBot() {
  const token = config.telegramBotToken;

  if (!token) {
    console.log('Telegram Bot: No token configured, bot disabled');
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });
  const authorizedUsers = config.telegramAuthorizedUsers;

  console.log('Telegram Bot: Starting...');

  /**
   * Checks if user is authorized
   */
  function isAuthorized(chatId) {
    if (authorizedUsers.length === 0) {
      return true; // No restrictions if no users configured
    }
    return authorizedUsers.includes(chatId.toString());
  }

  /**
   * Sends unauthorized message
   */
  function sendUnauthorized(chatId) {
    bot.sendMessage(chatId, '⛔ Du bist nicht berechtigt, diesen Bot zu nutzen.\n\nDeine Chat-ID: `' + chatId + '`', {
      parse_mode: 'Markdown'
    });
  }

  // /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      sendUnauthorized(chatId);
      return;
    }

    const welcomeMessage = `
🏠 *Guest Manager Bot*

Verwalte deine Gäste direkt über Telegram!

*Verfügbare Befehle:*

🌙 /tonight - Gast für eine Nacht (schnell!)
📊 /status - Aktueller Gast-Status
📋 /list - Alle Gäste anzeigen
➕ /checkin - Neuen Gast eintragen
🚪 /checkout - Aktuellen Gast auschecken
❓ /help - Diese Hilfe anzeigen

_Tipp: Für eine Übernachtung einfach /tonight senden!_
`;

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  // /help command
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      sendUnauthorized(chatId);
      return;
    }

    const helpMessage = `
📖 *Hilfe*

*Schnell-Befehle:*
🌙 \`/tonight [Name]\` - Eine Nacht (heute → morgen)
➕ \`/checkin ANKUNFT ABREISE [Name]\`

*Beispiele:*
• \`/tonight\` - Schnell für eine Nacht
• \`/tonight Max\` - Mit Name
• \`/checkin 2025-12-01 2025-12-05 Max\`

*Status-Farben:*
🟢 Kein Gast - Automationen aktiv
🟠 Gast anwesend - Automationen pausiert
🔵 Zukünftige Buchung
⚪ Vergangener Aufenthalt
`;

    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // /status command
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      sendUnauthorized(chatId);
      return;
    }

    try {
      const status = await api.getStatus();

      let message;
      if (status.hasActiveGuest && status.currentGuest) {
        const guest = status.currentGuest;
        const name = guest.name || 'Gast';
        message = `
🟠 *Gast anwesend*

👤 ${name}
📅 ${formatDateForDisplay(guest.arrivalDate)} - ${formatDateForDisplay(guest.departureDate)}

_Automatische Rollladensteuerung ist deaktiviert_
`;
      } else {
        message = `
🟢 *Kein Gast*

Alle Automationen sind aktiv.

_Nutze /checkin um einen neuen Gast einzutragen_
`;
      }

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  });

  // /list command
  bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      sendUnauthorized(chatId);
      return;
    }

    try {
      const data = await api.getAllGuests();

      if (data.guests.length === 0) {
        bot.sendMessage(chatId, '📋 Keine Gäste eingetragen.\n\n_Nutze /checkin um einen neuen Gast einzutragen_', {
          parse_mode: 'Markdown'
        });
        return;
      }

      let message = `📋 *Gästeliste* (${data.total} gesamt, ${data.active} aktiv)\n\n`;

      for (const guest of data.guests) {
        const statusIcon = guest.status === 'active' ? '🟠' : guest.status === 'future' ? '🔵' : '⚪';
        const name = guest.name || 'Gast';
        message += `${statusIcon} *${name}*\n`;
        message += `    ${formatDateForDisplay(guest.arrivalDate)} - ${formatDateForDisplay(guest.departureDate)}\n\n`;
      }

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  });

  // /tonight command - quick one-night stay
  bot.onText(/\/tonight(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      sendUnauthorized(chatId);
      return;
    }

    const name = match[1] || '';
    const today = getToday();
    const tomorrow = getTomorrow();

    try {
      const guest = await api.createGuest({
        name: name.trim(),
        arrivalDate: today,
        departureDate: tomorrow
      });

      const guestName = guest.name || 'Gast';
      bot.sendMessage(chatId, `
🌙 *Übernachtung eingetragen*

👤 ${guestName}
📅 ${formatDateForDisplay(today)} → ${formatDateForDisplay(tomorrow)}

_Rollo bleibt morgen früh unten!_
`, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  });

  // /checkin command with inline parameters
  bot.onText(/\/checkin(?:\s+(\S+)\s+(\S+)(?:\s+(.+))?)?/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      sendUnauthorized(chatId);
      return;
    }

    const arrivalDate = match[1];
    const departureDate = match[2];
    const name = match[3] || '';

    // If no parameters, show interactive prompt
    if (!arrivalDate || !departureDate) {
      const today = getToday();
      const message = `
➕ *Neuen Gast eintragen*

Sende den Befehl im Format:
\`/checkin ANKUNFT ABREISE [NAME]\`

*Beispiele:*
• \`/checkin ${today} 2025-12-05\`
• \`/checkin ${today} 2025-12-05 Max Mustermann\`

_Datumsformat: YYYY-MM-DD_
`;
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Validate dates
    if (!isValidDateFormat(arrivalDate)) {
      bot.sendMessage(chatId, `❌ Ungültiges Ankunftsdatum: \`${arrivalDate}\`\n\nFormat: YYYY-MM-DD`, {
        parse_mode: 'Markdown'
      });
      return;
    }

    if (!isValidDateFormat(departureDate)) {
      bot.sendMessage(chatId, `❌ Ungültiges Abreisedatum: \`${departureDate}\`\n\nFormat: YYYY-MM-DD`, {
        parse_mode: 'Markdown'
      });
      return;
    }

    try {
      const guest = await api.createGuest({
        name: name.trim(),
        arrivalDate,
        departureDate
      });

      const guestName = guest.name || 'Gast';
      bot.sendMessage(chatId, `
✅ *Gast eingetragen*

👤 ${guestName}
📅 ${formatDateForDisplay(guest.arrivalDate)} - ${formatDateForDisplay(guest.departureDate)}
${guest.isActive ? '\n_Rollladenautomation ist jetzt deaktiviert_' : ''}
`, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  });

  // /checkout command
  bot.onText(/\/checkout/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      sendUnauthorized(chatId);
      return;
    }

    try {
      const status = await api.getStatus();

      if (!status.hasActiveGuest || !status.currentGuest) {
        bot.sendMessage(chatId, '❌ Kein aktiver Gast zum Auschecken vorhanden.');
        return;
      }

      const guest = status.currentGuest;
      const guestName = guest.name || 'Gast';

      // Ask for confirmation
      const confirmMessage = `
🚪 *Gast auschecken?*

👤 ${guestName}
📅 Ankunft: ${formatDateForDisplay(guest.arrivalDate)}
📅 Geplante Abreise: ${formatDateForDisplay(guest.departureDate)}

_Abreisedatum wird auf heute gesetzt_
`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Ja, auschecken', callback_data: `checkout_${guest.id}` },
            { text: '❌ Abbrechen', callback_data: 'cancel' }
          ]
        ]
      };

      bot.sendMessage(chatId, confirmMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      bot.sendMessage(chatId, `❌ Fehler: ${error.message}`);
    }
  });

  // Handle callback queries (button clicks)
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    if (!isAuthorized(chatId)) {
      bot.answerCallbackQuery(callbackQuery.id, { text: 'Nicht berechtigt' });
      return;
    }

    // Cancel action
    if (data === 'cancel') {
      bot.answerCallbackQuery(callbackQuery.id, { text: 'Abgebrochen' });
      bot.editMessageText('❌ Aktion abgebrochen.', {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    // Checkout confirmation
    if (data.startsWith('checkout_')) {
      const guestId = data.replace('checkout_', '');

      try {
        const guest = await api.checkoutGuest(guestId);
        const guestName = guest.name || 'Gast';

        bot.answerCallbackQuery(callbackQuery.id, { text: 'Ausgecheckt!' });
        bot.editMessageText(`
✅ *Gast ausgecheckt*

👤 ${guestName}
📅 Abreise: ${formatDateForDisplay(guest.departureDate)}

_Rollladenautomation ist wieder aktiv_
`, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });
      } catch (error) {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Fehler!' });
        bot.editMessageText(`❌ Fehler: ${error.message}`, {
          chat_id: chatId,
          message_id: messageId
        });
      }
    }
  });

  // /cancel command
  bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      sendUnauthorized(chatId);
      return;
    }

    bot.sendMessage(chatId, '✅ Aktion abgebrochen.');
  });

  // Error handling with time-windowed counter
  let errorCount = 0;
  let lastErrorTime = 0;
  const MAX_ERRORS = 3;
  const ERROR_WINDOW_MS = 60000; // 1 minute window
  let isStopping = false;

  /**
   * Resets error counter (called after successful operations)
   */
  function resetErrorCount() {
    if (errorCount > 0) {
      errorCount = 0;
      console.log('Telegram Bot: Error counter reset after successful operation');
    }
  }

  bot.on('polling_error', (error) => {
    // Prevent multiple stop attempts
    if (isStopping) return;

    const errorMsg = error.message || String(error);

    // Check for authentication errors (invalid token)
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
      isStopping = true;
      console.error('Telegram Bot: Invalid token - bot disabled');
      bot.stopPolling();
      return;
    }

    const now = Date.now();

    // Reset counter if outside error window
    if (now - lastErrorTime > ERROR_WINDOW_MS) {
      errorCount = 0;
    }

    errorCount++;
    lastErrorTime = now;
    console.error(`Telegram Bot polling error (${errorCount}/${MAX_ERRORS}): ${errorMsg}`);

    // Stop polling after too many errors within the time window
    if (errorCount >= MAX_ERRORS) {
      isStopping = true;
      console.error(`Telegram Bot: Too many errors (${MAX_ERRORS}) within ${ERROR_WINDOW_MS / 1000}s, stopping...`);
      bot.stopPolling();
    }
  });

  // Reset error count on successful message handling
  bot.on('message', () => {
    resetErrorCount();
  });

  bot.on('error', (error) => {
    console.error('Telegram Bot error:', error.message);
  });

  // Register bot for notifications
  registerBot(bot);

  // Send startup notification with retry logic
  let startupNotificationSent = false;

  async function trySendStartupNotification(attempt = 1) {
    if (startupNotificationSent || isStopping) return;

    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 2000;

    try {
      await sendStartupNotification();
      startupNotificationSent = true;
      console.log('Telegram Bot: Startup notification sent');
    } catch (error) {
      console.error(`Telegram Bot: Startup notification failed (attempt ${attempt}/${MAX_ATTEMPTS}):`, error.message);
      if (attempt < MAX_ATTEMPTS) {
        setTimeout(() => trySendStartupNotification(attempt + 1), RETRY_DELAY_MS);
      }
    }
  }

  // Delay initial attempt to let polling establish
  setTimeout(() => trySendStartupNotification(), 1000);

  console.log('Telegram Bot: Started successfully');
  return bot;
}

export default createTelegramBot;
