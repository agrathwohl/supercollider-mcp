/**
 * MCP Tool: get_server_status
 * Query status of running SuperCollider server
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SuperColliderClient } from '../supercollider/client.js';
import { logger } from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers.js';

/**
 * Handler for get_server_status MCP tool
 * Queries SuperCollider server status and returns formatted response
 *
 * @param scClient - SuperCollider client instance
 * @returns MCP tool response with server status or error message
 */
export async function getServerStatusHandler(
  scClient: SuperColliderClient
): Promise<CallToolResult> {
  try {
    logger.info('get_server_status tool called');
    const status = await scClient.getStatus();

    return createSuccessResponse('get_server_status', {
      status,
    });
  } catch (error) {
    return createErrorResponse('get_server_status', error, {
      hint: 'Ensure scsynth is installed and accessible in PATH',
    });
  }
}
