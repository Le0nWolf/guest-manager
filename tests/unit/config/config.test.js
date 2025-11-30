/**
 * Config Unit Tests
 * Tests for configuration parsing and validation
 */

import { jest } from '@jest/globals';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear relevant env vars
    delete process.env.PORT;
    delete process.env.DATA_PATH;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('parsePort', () => {
    it('should return default port 3000 when PORT is not set', async () => {
      const { default: config } = await import('../../../src/config/index.js');
      expect(config.port).toBe(3000);
    });

    it('should parse valid PORT', async () => {
      process.env.PORT = '8080';
      const { default: config } = await import('../../../src/config/index.js');
      expect(config.port).toBe(8080);
    });

    it('should throw error for invalid PORT (not a number)', async () => {
      process.env.PORT = 'abc';
      await expect(import('../../../src/config/index.js')).rejects.toThrow('Invalid PORT');
    });

    it('should throw error for PORT below 1', async () => {
      process.env.PORT = '0';
      await expect(import('../../../src/config/index.js')).rejects.toThrow('Invalid PORT');
    });

    it('should throw error for PORT above 65535', async () => {
      process.env.PORT = '70000';
      await expect(import('../../../src/config/index.js')).rejects.toThrow('Invalid PORT');
    });
  });

  describe('parseDataPath', () => {
    it('should return default path when DATA_PATH is not set', async () => {
      const { default: config } = await import('../../../src/config/index.js');
      expect(config.dataPath).toBe('./src/data/guests.json');
    });

    it('should accept valid DATA_PATH ending with .json', async () => {
      process.env.DATA_PATH = './custom/path/data.json';
      const { default: config } = await import('../../../src/config/index.js');
      expect(config.dataPath).toBe('./custom/path/data.json');
    });

    it('should throw error for DATA_PATH not ending with .json', async () => {
      process.env.DATA_PATH = './data/guests.txt';
      await expect(import('../../../src/config/index.js')).rejects.toThrow('must end with .json');
    });

    it('should throw error for dangerous path /etc', async () => {
      process.env.DATA_PATH = '/etc/passwd.json';
      await expect(import('../../../src/config/index.js')).rejects.toThrow('system directories not allowed');
    });

    it('should throw error for dangerous path /var', async () => {
      process.env.DATA_PATH = '/var/log/app.json';
      await expect(import('../../../src/config/index.js')).rejects.toThrow('system directories not allowed');
    });

    it('should throw error for dangerous path /tmp', async () => {
      process.env.DATA_PATH = '/tmp/data.json';
      await expect(import('../../../src/config/index.js')).rejects.toThrow('system directories not allowed');
    });
  });
});
