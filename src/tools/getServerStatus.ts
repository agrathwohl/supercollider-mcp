/**
 * MCP Tool: get_server_status
 * Query status of running SuperCollider server
 */

import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { SuperColliderClient } from '../supercollider/client.js';

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
    const status = await scClient.getStatus();

    const content: TextContent = {
      type: 'text',
      text: JSON.stringify(status, null, 2),
    };

    return {
      content: [content],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const content: TextContent = {
      type: 'text',
      text: `SuperCollider not available: ${errorMessage}`,
    };

    return {
      content: [content],
      isError: true,
    };
  }
}
