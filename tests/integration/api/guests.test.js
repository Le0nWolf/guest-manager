/**
 * API Integration Tests
 * Tests the complete API flow
 */

import request from 'supertest';
import { createApp } from '../../../src/app.js';
import { getToday, formatDate } from '../../../src/utils/dateUtils.js';

describe('Guest API', () => {
  let app;

  const today = getToday();
  const tomorrow = formatDate(new Date(Date.now() + 86400000));
  const nextWeek = formatDate(new Date(Date.now() + 7 * 86400000));

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/v1', () => {
    it('should return API information', async () => {
      const res = await request(app).get('/api/v1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Guest Manager API');
      expect(res.body.data.endpoints).toBeDefined();
    });
  });

  describe('GET /api/v1/status', () => {
    it('should return status information', async () => {
      const res = await request(app).get('/api/v1/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('hasActiveGuest');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/v1/guests', () => {
    it('should return guests list', async () => {
      const res = await request(app).get('/api/v1/guests');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('guests');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('active');
      expect(Array.isArray(res.body.data.guests)).toBe(true);
    });
  });

  describe('GET /api/v1/guests/:id', () => {
    it('should return 404 for non-existent guest', async () => {
      const res = await request(app).get('/api/v1/guests/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/guests', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/guests')
        .send({
          name: 'Invalid'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toContain('arrivalDate is required');
    });

    it('should return 400 for invalid date format', async () => {
      const res = await request(app)
        .post('/api/v1/guests')
        .send({
          arrivalDate: '27-11-2025',
          departureDate: '30-11-2025'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when departure is before arrival', async () => {
      const yesterday = formatDate(new Date(Date.now() - 86400000));
      const res = await request(app)
        .post('/api/v1/guests')
        .send({
          arrivalDate: tomorrow,
          departureDate: yesterday
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/guests/:id', () => {
    it('should return 404 when guest not found', async () => {
      const res = await request(app)
        .patch('/api/v1/guests/non-existent')
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/guests/:id', () => {
    it('should return 404 when guest not found', async () => {
      const res = await request(app).delete('/api/v1/guests/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/guests/:id/checkout', () => {
    it('should return 404 when guest not found', async () => {
      const res = await request(app).post('/api/v1/guests/non-existent/checkout');

      expect(res.status).toBe(404);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown API endpoints', async () => {
      const res = await request(app).get('/api/v1/unknown');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
