/**
 * Express Application Setup
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates and configures the Express application
 * @returns {Express} Configured Express app
 */
export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Serve static files from public directory
  app.use(express.static(join(__dirname, '..', 'public')));

  // API Routes
  app.use('/api/v1', routes);

  // Serve index.html for root path
  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  });

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      timestamp: new Date().toISOString()
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
