/**
 * Guest Repository Unit Tests
 * Tests the repository using a temporary file
 */

import { createGuestRepository } from '../../../src/repositories/guestRepository.js';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

describe('guestRepository', () => {
  let testDataPath;
  let repository;

  beforeEach(async () => {
    // Create unique temp file for each test
    testDataPath = join(tmpdir(), `guests-test-${Date.now()}-${Math.random().toString(36)}.json`);
    repository = createGuestRepository(testDataPath);
  });

  afterEach(async () => {
    // Clean up temp file
    try {
      if (existsSync(testDataPath)) {
        await unlink(testDataPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('findAll', () => {
    it('should return empty array when file does not exist', async () => {
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    it('should return all guests from file', async () => {
      const mockGuests = [
        { id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' },
        { id: '2', name: 'Guest 2', arrivalDate: '2025-12-05', departureDate: '2025-12-10' }
      ];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const result = await repository.findAll();

      expect(result).toEqual(mockGuests);
    });

    it('should handle array format (legacy)', async () => {
      const mockGuests = [{ id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' }];
      await writeFile(testDataPath, JSON.stringify(mockGuests), 'utf-8');

      const result = await repository.findAll();

      expect(result).toEqual(mockGuests);
    });

    it('should filter out invalid guests and log warning', async () => {
      const mockData = {
        guests: [
          { id: '1', name: 'Valid', arrivalDate: '2025-11-27', departureDate: '2025-12-01' },
          { id: '2', name: 'Missing dates' }, // Invalid - no dates
          { name: 'No ID' }, // Invalid - no id
          null // Invalid - null
        ]
      };
      await writeFile(testDataPath, JSON.stringify(mockData), 'utf-8');

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('findById', () => {
    it('should return guest when found', async () => {
      const mockGuests = [
        { id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' },
        { id: '2', name: 'Guest 2', arrivalDate: '2025-12-05', departureDate: '2025-12-10' }
      ];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const result = await repository.findById('2');

      expect(result).toEqual({ id: '2', name: 'Guest 2', arrivalDate: '2025-12-05', departureDate: '2025-12-10' });
    });

    it('should return null when not found', async () => {
      const mockGuests = [{ id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' }];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const result = await repository.findById('999');

      expect(result).toBeNull();
    });

    it('should return null when file is empty', async () => {
      const result = await repository.findById('1');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should add guest to file', async () => {
      const mockGuests = [{ id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' }];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const newGuest = { id: '2', name: 'Guest 2', arrivalDate: '2025-12-05', departureDate: '2025-12-10' };
      const result = await repository.create(newGuest);

      expect(result).toEqual(newGuest);

      const allGuests = await repository.findAll();
      expect(allGuests).toHaveLength(2);
      expect(allGuests[1]).toEqual(newGuest);
    });

    it('should create file if it does not exist', async () => {
      const newGuest = { id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' };
      await repository.create(newGuest);

      expect(existsSync(testDataPath)).toBe(true);
      const allGuests = await repository.findAll();
      expect(allGuests).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update existing guest', async () => {
      const mockGuests = [{ id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' }];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const updatedGuest = { id: '1', name: 'Updated Guest', arrivalDate: '2025-11-27', departureDate: '2025-12-01' };
      const result = await repository.update('1', updatedGuest);

      expect(result).toEqual(updatedGuest);

      const allGuests = await repository.findAll();
      expect(allGuests[0].name).toBe('Updated Guest');
    });

    it('should return null when guest not found', async () => {
      const mockGuests = [{ id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' }];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const result = await repository.update('999', { id: '999', name: 'Not Found', arrivalDate: '2025-11-27', departureDate: '2025-12-01' });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove existing guest', async () => {
      const mockGuests = [
        { id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' },
        { id: '2', name: 'Guest 2', arrivalDate: '2025-12-05', departureDate: '2025-12-10' }
      ];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const result = await repository.remove('1');

      expect(result).toBe(true);

      const allGuests = await repository.findAll();
      expect(allGuests).toHaveLength(1);
      expect(allGuests[0].id).toBe('2');
    });

    it('should return false when guest not found', async () => {
      const mockGuests = [{ id: '1', name: 'Guest 1', arrivalDate: '2025-11-27', departureDate: '2025-12-01' }];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const result = await repository.remove('999');

      expect(result).toBe(false);
    });
  });

  describe('findWhere', () => {
    it('should return guests matching predicate', async () => {
      const mockGuests = [
        { id: '1', name: 'Alice', isActive: true, arrivalDate: '2025-11-27', departureDate: '2025-12-01' },
        { id: '2', name: 'Bob', isActive: false, arrivalDate: '2025-12-05', departureDate: '2025-12-10' },
        { id: '3', name: 'Charlie', isActive: true, arrivalDate: '2025-12-15', departureDate: '2025-12-20' }
      ];
      await writeFile(testDataPath, JSON.stringify({ guests: mockGuests }), 'utf-8');

      const result = await repository.findWhere((g) => g.isActive);

      expect(result).toHaveLength(2);
      expect(result.map(g => g.name)).toEqual(['Alice', 'Charlie']);
    });
  });
});
