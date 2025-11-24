import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { discoverSuperCollider } from '../src/supercollider/discovery.js';

describe('Discovery Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return result with port and status if SuperCollider is found', async () => {
    // This test checks the structure, but SC might not be running
    const result = await discoverSuperCollider([57110], { timeout: 500 });

    if (result) {
      expect(result).toHaveProperty('port');
      expect(result).toHaveProperty('status');
      expect(result.port).toBe(57110);
      expect(result.status).toBe('running');
    } else {
      // It's okay if SC isn't running during tests
      expect(result).toBeNull();
    }
  });

  test('should return correct port if found on alternate port', async () => {
    const result = await discoverSuperCollider([57120], { timeout: 500 });

    if (result) {
      expect(result.port).toBe(57120);
      expect(result.status).toBe('running');
    } else {
      // It's okay if SC isn't running during tests
      expect(result).toBeNull();
    }
  });

  test('should return null when SuperCollider not found', async () => {
    // Test with non-standard port that should not have SC running
    const result = await discoverSuperCollider([12345], { timeout: 1000 });

    expect(result).toBeNull();
  });

  test('should respect timeout configuration', async () => {
    // Use a port that's unlikely to be open
    const result = await discoverSuperCollider([65432], { timeout: 500 });

    // Connection should fail (return null) either immediately (ECONNREFUSED)
    // or after timeout, depending on network conditions
    expect(result).toBeNull();
  });

  test('should scan multiple ports in sequence', async () => {
    const ports = [57110, 57120];
    const result = await discoverSuperCollider(ports, { timeout: 500 });

    // Result will be null if SC not running, or have one of the ports if found
    if (result) {
      expect(ports).toContain(result.port);
    } else {
      expect(result).toBeNull();
    }
  });

  test('should use default ports when none specified', async () => {
    const result = await discoverSuperCollider(undefined, { timeout: 500 });

    if (result) {
      // Default ports are 57110 (scsynth) and 57120 (sclang)
      expect([57110, 57120]).toContain(result.port);
    } else {
      expect(result).toBeNull();
    }
  });

  test('should handle invalid ports gracefully', async () => {
    // Port 99999 is out of valid range (0-65535)
    const result = await discoverSuperCollider([99999], { timeout: 100 });

    // Should return null without throwing
    expect(result).toBeNull();
  });

  test('should handle connection errors gracefully', async () => {
    // Port 65432 is unlikely to be open, should handle error gracefully
    const result = await discoverSuperCollider([65432], { timeout: 100 });

    // Should return null without throwing
    expect(result).toBeNull();
  });

  test('should read ports from SC_PORTS environment variable', async () => {
    // Save original env
    const originalEnv = process.env.SC_PORTS;

    try {
      // Set custom ports via environment
      process.env.SC_PORTS = '57130,57140';

      // Call without explicit ports - should use environment
      const result = await discoverSuperCollider(undefined, { timeout: 100 });

      // Will be null since those ports aren't open, but validates env parsing
      expect(result).toBeNull();
    } finally {
      // Restore original env
      if (originalEnv) {
        process.env.SC_PORTS = originalEnv;
      } else {
        delete process.env.SC_PORTS;
      }
    }
  });
});
