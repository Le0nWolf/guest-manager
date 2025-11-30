/**
 * Guest Service Unit Tests
 */

import { jest } from '@jest/globals';
import { createGuestService } from '../../../src/services/guestService.js';
import { getToday, formatDate } from '../../../src/utils/dateUtils.js';

describe('guestService', () => {
  let service;
  let mockRepository;

  const today = getToday();
  const yesterday = formatDate(new Date(Date.now() - 86400000));
  const tomorrow = formatDate(new Date(Date.now() + 86400000));
  const nextWeek = formatDate(new Date(Date.now() + 7 * 86400000));

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findWhere: jest.fn()
    };
    service = createGuestService(mockRepository);
  });

  describe('getStatus', () => {
    it('should return hasActiveGuest=true when there is an active guest', async () => {
      const activeGuest = {
        id: '1',
        name: 'Active Guest',
        arrivalDate: yesterday,
        departureDate: tomorrow
      };
      mockRepository.findAll.mockResolvedValue([activeGuest]);

      const result = await service.getStatus();

      expect(result.hasActiveGuest).toBe(true);
      expect(result.currentGuest).toBeDefined();
      expect(result.currentGuest.id).toBe('1');
      expect(result.currentGuest.isActive).toBe(true);
    });

    it('should return hasActiveGuest=false when there are no active guests', async () => {
      const pastGuest = {
        id: '1',
        name: 'Past Guest',
        arrivalDate: formatDate(new Date(Date.now() - 10 * 86400000)),
        departureDate: formatDate(new Date(Date.now() - 5 * 86400000))
      };
      mockRepository.findAll.mockResolvedValue([pastGuest]);

      const result = await service.getStatus();

      expect(result.hasActiveGuest).toBe(false);
      expect(result.currentGuest).toBeNull();
    });

    it('should return hasActiveGuest=false when no guests exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.getStatus();

      expect(result.hasActiveGuest).toBe(false);
      expect(result.currentGuest).toBeNull();
    });
  });

  describe('getAllGuests', () => {
    it('should return all guests sorted by arrival date descending', async () => {
      const guests = [
        { id: '1', name: 'Guest 1', arrivalDate: '2025-11-01', departureDate: '2025-11-05' },
        { id: '2', name: 'Guest 2', arrivalDate: '2025-11-15', departureDate: '2025-11-20' },
        { id: '3', name: 'Guest 3', arrivalDate: '2025-11-10', departureDate: '2025-11-12' }
      ];
      mockRepository.findAll.mockResolvedValue(guests);

      const result = await service.getAllGuests();

      expect(result.guests).toHaveLength(3);
      expect(result.guests[0].id).toBe('2'); // Most recent first
      expect(result.guests[1].id).toBe('3');
      expect(result.guests[2].id).toBe('1');
      expect(result.total).toBe(3);
    });

    it('should count active guests correctly', async () => {
      const guests = [
        { id: '1', name: 'Active', arrivalDate: yesterday, departureDate: tomorrow },
        { id: '2', name: 'Past', arrivalDate: formatDate(new Date(Date.now() - 10 * 86400000)), departureDate: yesterday },
        { id: '3', name: 'Future', arrivalDate: tomorrow, departureDate: nextWeek }
      ];
      mockRepository.findAll.mockResolvedValue(guests);

      const result = await service.getAllGuests();

      expect(result.active).toBe(1);
    });
  });

  describe('getGuestById', () => {
    it('should return enriched guest when found', async () => {
      const guest = { id: '1', name: 'Test Guest', arrivalDate: yesterday, departureDate: tomorrow };
      mockRepository.findById.mockResolvedValue(guest);

      const result = await service.getGuestById('1');

      expect(result.id).toBe('1');
      expect(result.isActive).toBe(true);
      expect(result.status).toBe('active');
    });

    it('should throw ApiError when guest not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getGuestById('999')).rejects.toThrow('Guest with ID 999 not found');
    });
  });

  describe('createNewGuest', () => {
    it('should create a new guest with valid data', async () => {
      const data = {
        name: 'New Guest',
        arrivalDate: tomorrow,
        departureDate: nextWeek
      };
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.create.mockImplementation((guest) => Promise.resolve(guest));

      const result = await service.createNewGuest(data);

      expect(result.name).toBe('New Guest');
      expect(result.arrivalDate).toBe(tomorrow);
      expect(result.departureDate).toBe(nextWeek);
      expect(result.id).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw error when dates are missing', async () => {
      const data = { name: 'Invalid Guest' };

      await expect(service.createNewGuest(data)).rejects.toThrow('Validation failed');
    });

    it('should throw error when departure is before arrival', async () => {
      const data = {
        name: 'Invalid Guest',
        arrivalDate: tomorrow,
        departureDate: yesterday
      };

      await expect(service.createNewGuest(data)).rejects.toThrow('Validation failed');
    });

    it('should throw error when dates overlap with existing guest', async () => {
      const existingGuest = {
        id: '1',
        name: 'Existing',
        arrivalDate: tomorrow,
        departureDate: nextWeek
      };
      mockRepository.findAll.mockResolvedValue([existingGuest]);

      const data = {
        name: 'Overlapping',
        arrivalDate: formatDate(new Date(Date.now() + 3 * 86400000)),
        departureDate: formatDate(new Date(Date.now() + 10 * 86400000))
      };

      await expect(service.createNewGuest(data)).rejects.toThrow('Date range overlaps');
    });
  });

  describe('updateExistingGuest', () => {
    it('should update guest with valid data', async () => {
      const existingGuest = {
        id: '1',
        name: 'Original',
        arrivalDate: yesterday,
        departureDate: tomorrow
      };
      mockRepository.findById.mockResolvedValue(existingGuest);
      mockRepository.findAll.mockResolvedValue([existingGuest]);
      mockRepository.update.mockImplementation((id, guest) => Promise.resolve(guest));

      const result = await service.updateExistingGuest('1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw error when guest not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.updateExistingGuest('999', { name: 'Test' })).rejects.toThrow('not found');
    });
  });

  describe('deleteGuest', () => {
    it('should delete existing guest', async () => {
      mockRepository.remove.mockResolvedValue(true);

      await expect(service.deleteGuest('1')).resolves.toBeUndefined();
      expect(mockRepository.remove).toHaveBeenCalledWith('1');
    });

    it('should throw error when guest not found', async () => {
      mockRepository.remove.mockResolvedValue(false);

      await expect(service.deleteGuest('999')).rejects.toThrow('not found');
    });
  });

  describe('checkoutGuest', () => {
    it('should set departure date to today for active guest', async () => {
      const activeGuest = {
        id: '1',
        name: 'Active Guest',
        arrivalDate: yesterday,
        departureDate: nextWeek
      };
      mockRepository.findById.mockResolvedValue(activeGuest);
      mockRepository.update.mockImplementation((id, guest) => Promise.resolve(guest));

      const result = await service.checkoutGuest('1');

      expect(result.departureDate).toBe(today);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw error when guest not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.checkoutGuest('999')).rejects.toThrow('not found');
    });

    it('should throw error when guest has already been checked out', async () => {
      const checkedOutGuest = {
        id: '1',
        name: 'Checked Out Guest',
        arrivalDate: formatDate(new Date(Date.now() - 10 * 86400000)),
        departureDate: yesterday,
        checkoutDate: yesterday
      };
      mockRepository.findById.mockResolvedValue(checkedOutGuest);

      await expect(service.checkoutGuest('1')).rejects.toThrow('already been checked out');
    });

    it('should throw error when guest has not arrived yet', async () => {
      const futureGuest = {
        id: '1',
        name: 'Future Guest',
        arrivalDate: tomorrow,
        departureDate: nextWeek
      };
      mockRepository.findById.mockResolvedValue(futureGuest);

      await expect(service.checkoutGuest('1')).rejects.toThrow('not arrived yet');
    });
  });
});
