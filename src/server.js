/**
 * Server Entry Point
 */

import { createApp } from './app.js';
import { createTelegramBot } from './services/telegramBot.js';
import config from './config/index.js';

const app = createApp();

// Start Telegram Bot (if configured)
const telegramBot = createTelegramBot();

const server = app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    Guest Manager                           ║
║                Smart Home Integration                      ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port ${String(config.port).padEnd(33)}║
║  Environment: ${config.nodeEnv.padEnd(42)}║
║  Timezone: ${config.timezone.padEnd(45)}║
╚════════════════════════════════════════════════════════════╝
  `);

  if (config.isDevelopment) {
    console.log(`  → Frontend: http://localhost:${config.port}`);
    console.log(`  → API:      http://localhost:${config.port}/api/v1/status`);
  }

  if (telegramBot) {
    console.log('  → Telegram: Bot is running');
  } else {
    console.log('  → Telegram: Not configured (set TELEGRAM_BOT_TOKEN)');
  }
  console.log('');
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop Telegram bot
  if (telegramBot) {
    telegramBot.stopPolling();
    console.log('Telegram bot stopped.');
  }

  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
