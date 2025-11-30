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
