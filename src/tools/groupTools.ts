/**
 * MCP Tools: Group Management
 * create_group, free_group
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SuperColliderClient } from '../supercollider/client.js';
import { buildGroupNew, buildNodeFree } from '../utils/osc.js';
import { logger } from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers.js';

/**
 * Handler for create_group MCP tool
 * Creates a group node for hierarchical organization of synths
 *
 * @param scClient - SuperCollider client instance
 * @param addAction - Where to add group (0=head, 1=tail, 2=before, 3=after)
 * @param targetId - Target group ID to add to
 * @returns MCP tool response with group node ID
 */
export async function createGroupHandler(
  scClient: SuperColliderClient,
  addAction: number = 1,
  targetId: number = 1
): Promise<CallToolResult> {
  try {
    logger.info(`create_group tool called with addAction=${addAction}, targetId=${targetId}`);

    // Allocate unique node ID (groups share node ID space with synths)
    const nodeAllocator = scClient.getNodeAllocator();
    const groupId = nodeAllocator.alloc();

    if (groupId === null) {
      return createErrorResponse('create_group', new Error('Node ID allocation failed: limit reached'), {
        addAction,
        targetId,
        hint: 'Maximum number of nodes reached. Free some nodes/groups before creating new ones.',
      });
    }

    // Build and send /g_new OSC message
    const oscMessage = buildGroupNew(groupId, addAction, targetId);
    await scClient.sendOscMessageWithSync(oscMessage);

    return createSuccessResponse('create_group', {
      message: `Group created successfully`,
      groupId,
      addAction,
      targetId,
    });
  } catch (error) {
    return createErrorResponse('create_group', error, {
      addAction,
      targetId,
      hint: 'Ensure target group exists and server is running',
    });
  }
}

/**
 * Handler for free_group MCP tool
 * Frees a group and all its child nodes recursively
 *
 * @param scClient - SuperCollider client instance
 * @param groupId - Group node ID to free
 * @returns MCP tool response confirming group freed
 */
export async function freeGroupHandler(
  scClient: SuperColliderClient,
  groupId: number
): Promise<CallToolResult> {
  try {
    logger.info(`free_group tool called for group: ${groupId}`);

    // Build and send /n_free OSC message (recursively frees group and all children)
    const oscMessage = buildNodeFree(groupId);
    await scClient.sendOscMessageWithSync(oscMessage);

    // Deallocate node ID
    const nodeAllocator = scClient.getNodeAllocator();
    nodeAllocator.free(groupId);

    return createSuccessResponse('free_group', {
      message: `Group ${groupId} and all children freed successfully`,
      groupId,
    });
  } catch (error) {
    return createErrorResponse('free_group', error, {
      groupId,
      hint: 'Group may already be freed or never existed',
    });
  }
}
