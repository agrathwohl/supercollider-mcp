import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SuperColliderClient } from '../src/supercollider/client.js';

/**
 * SuperCollider Client Tests
 *
 * Note: These tests require SuperCollider (scsynth) to be installed for full integration testing.
 * Without SC installed, the tests verify error handling and state management logic.
 */
describe('SuperColliderClient - Connection State', () => {
  let client: SuperColliderClient;

  beforeEach(() => {
    client = new SuperColliderClient();
  });

  afterEach(async () => {
    if (client.getConnectionState() === 'connected') {
      try {
        await client.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('Initial State', () => {
    test('should start in disconnected state', () => {
      expect(client.getConnectionState()).toBe('disconnected');
    });

    test('should have null server initially', () => {
      expect(client.getServer()).toBeNull();
    });
  });

  describe('Disconnection', () => {
    test('should handle disconnect when already disconnected', async () => {
      expect(client.getConnectionState()).toBe('disconnected');
      await client.disconnect();
      expect(client.getConnectionState()).toBe('disconnected');
    });
  });

  /**
   * Integration tests requiring SuperCollider installation
   * These tests are skipped if SC is not available
   *
   * TODO: Add tests for:
   * - Connection state transitions when SC is installed
   * - Error handling with invalid paths (requires fixing supercolliderjs error emission)
   * - Server status queries
   * - OSC communication
   */
});
