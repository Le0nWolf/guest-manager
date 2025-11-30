/**
 * Application Configuration
 * Loads configuration from environment variables with sensible defaults
 */

const config = {
  // Server configuration
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Timezone
  timezone: process.env.TZ || 'Europe/Berlin',

  // Data storage path
  dataPath: process.env.DATA_PATH || './src/data/guests.json',

  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramAuthorizedUsers: process.env.TELEGRAM_AUTHORIZED_USERS
    ? process.env.TELEGRAM_AUTHORIZED_USERS.split(',').map((id) => id.trim())
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
