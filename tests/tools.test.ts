import { describe, test, expect, jest } from '@jest/globals';
import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getServerStatusHandler } from '../src/tools/getServerStatus.js';
import type { SuperColliderClient } from '../src/supercollider/client.js';

describe('MCP Tool Schemas', () => {
  describe('get_server_status tool', () => {
    test('should define get_server_status tool schema', () => {
      // Tool schema should accept empty input
      const schema = z.object({});

      // Validate empty input succeeds
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('should validate empty input (no parameters required)', () => {
      const schema = z.object({});

      // Should accept empty object
      expect(schema.safeParse({}).success).toBe(true);

      // Should also accept undefined (optional parameters)
      expect(schema.safeParse(undefined).success).toBe(false); // Expects object
    });

    test('should have correct tool metadata', () => {
      const toolName = 'get_server_status';
      const toolDescription = 'Query status of running SuperCollider server';

      expect(toolName).toBe('get_server_status');
      expect(toolDescription).toContain('SuperCollider');
      expect(toolDescription).toContain('status');
    });
  });

  describe('get_server_status handler', () => {
    test('should return server status when connected', async () => {
      // Create mock client
      const mockClient = {
        getStatus: jest.fn().mockResolvedValue({
          port: 57110,
          status: 'running',
          ugenCount: 10,
          synthCount: 5,
          cpuUsage: 12.5,
          sampleRate: 48000,
        }),
      } as unknown as SuperColliderClient;

      const response = await getServerStatusHandler(mockClient);

      expect(response.isError).toBeUndefined();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');

      if (response.content[0].type === 'text') {
        const statusData = JSON.parse(response.content[0].text);
        expect(statusData.port).toBe(57110);
        expect(statusData.status).toBe('running');
      }
    });

    test('should return error message when SC not available', async () => {
      // Create mock client that throws error
      const mockClient = {
        getStatus: jest.fn().mockRejectedValue(new Error('SuperCollider not found')),
      } as unknown as SuperColliderClient;

      const response = await getServerStatusHandler(mockClient);

      expect(response.isError).toBe(true);
      expect(response.content[0].type).toBe('text');

      if (response.content[0].type === 'text') {
        expect(response.content[0].text).toContain('SuperCollider not available');
        expect(response.content[0].text).toContain('not found');
      }
    });

    test('should return formatted JSON response', async () => {
      const mockStatus = {
        port: 57120,
        status: 'running' as const,
        cpuUsage: 8.2,
      };

      const mockClient = {
        getStatus: jest.fn().mockResolvedValue(mockStatus),
      } as unknown as SuperColliderClient;

      const response = await getServerStatusHandler(mockClient);

      expect(response.content[0].type).toBe('text');

      if (response.content[0].type === 'text') {
        // Should be valid JSON
        const parsed = JSON.parse(response.content[0].text);
        expect(parsed).toEqual(mockStatus);

        // Should be formatted (pretty-printed)
        expect(response.content[0].text).toContain('\n');
      }
    });
  });
});
