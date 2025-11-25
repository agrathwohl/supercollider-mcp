/**
 * MCP Tool Response Helpers
 * Standardized response building for all MCP tool handlers
 */

import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Create standardized error response for MCP tools
 * @param operationName - Operation identifier for logging
 * @param error - Error that occurred
 * @param additionalFields - Extra fields to include in response
 */
export function createErrorResponse(
  operationName: string,
  error: unknown,
  additionalFields?: Record<string, unknown>
): CallToolResult {
  const errorMessage = getErrorMessage(error);
  logger.error(`${operationName} failed:`, error);

  const content: TextContent = {
    type: 'text',
    text: JSON.stringify({
      success: false,
      error: errorMessage,
      ...additionalFields,
    }, null, 2),
  };

  return {
    content: [content],
    isError: true,
  };
}

/**
 * Create standardized success response for MCP tools
 * @param operationName - Operation identifier for logging
 * @param data - Response data to serialize
 */
export function createSuccessResponse(
  operationName: string,
  data: Record<string, unknown>
): CallToolResult {
  logger.info(`${operationName} completed successfully`);

  const content: TextContent = {
    type: 'text',
    text: JSON.stringify({
      success: true,
      ...data,
    }, null, 2),
  };

  return {
    content: [content],
  };
}
