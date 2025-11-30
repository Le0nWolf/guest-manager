/**
 * Application Configuration
 * Loads configuration from environment variables with sensible defaults
 */

/**
 * Parses and validates port number
 * @param {string|undefined} portEnv - PORT environment variable
 * @returns {number} Valid port number
 */
function parsePort(portEnv) {
  if (!portEnv) return 3000;

  const port = parseInt(portEnv, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: "${portEnv}" - must be a number between 1 and 65535`);
  }
  return port;
}

const config = {
  // Server configuration
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Timezone
  timezone: process.env.TZ || 'Europe/Berlin',

  // Data storage path
  dataPath: process.env.DATA_PATH || './src/data/guests.json',

  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  // Support both TELEGRAM_CHAT_ID (preferred) and TELEGRAM_AUTHORIZED_USERS (legacy)
  telegramAuthorizedUsers: (process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_AUTHORIZED_USERS)
    ? (process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_AUTHORIZED_USERS).split(',').map((id) => id.trim())
    : [],

  // Derived properties
  get isDevelopment() {
    return this.nodeEnv === 'development';
  },

  get isProduction() {
    return this.nodeEnv === 'production';
  },

  get isTest() {
    return this.nodeEnv === 'test';
  }
};

export default config;
