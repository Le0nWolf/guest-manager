/**
 * Route Aggregator
 * Combines all API routes
 */

import { Router } from 'express';
import guestRoutes from './guestRoutes.js';

const router = Router();

// Mount guest routes
router.use(guestRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Guest Manager API',
      version: '1.0.0',
      endpoints: {
        status: 'GET /api/v1/status',
        guests: {
          list: 'GET /api/v1/guests',
          get: 'GET /api/v1/guests/:id',
          create: 'POST /api/v1/guests',
          update: 'PATCH /api/v1/guests/:id',
          delete: 'DELETE /api/v1/guests/:id',
          checkout: 'POST /api/v1/guests/:id/checkout'
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
