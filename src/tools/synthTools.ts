/**
 * MCP Tools: Synth Instance Control
 * create_synth, free_synth, set_synth_controls
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SuperColliderClient } from '../supercollider/client.js';
import { buildSynthNew, buildNodeFree, buildNodeSet } from '../utils/osc.js';
import { logger } from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers.js';

/**
 * Handler for create_synth MCP tool
 * Creates a synth instance from a loaded SynthDef
 *
 * @param scClient - SuperCollider client instance
 * @param defName - SynthDef name to instantiate
 * @param addAction - Where to add synth (0=head, 1=tail, 2=before, 3=after, 4=replace)
 * @param targetId - Target group or node ID
 * @param controls - Initial parameter values
 * @returns MCP tool response with synth node ID
 */
export async function createSynthHandler(
  scClient: SuperColliderClient,
  defName: string,
  addAction: number = 1,
  targetId: number = 1,
  controls: Record<string, number> = {}
): Promise<CallToolResult> {
  try {
    logger.info(`create_synth tool called for: ${defName}`);

    // Allocate unique node ID
    const nodeAllocator = scClient.getNodeAllocator();
    const nodeId = nodeAllocator.alloc();

    if (nodeId === null) {
      return createErrorResponse('create_synth', new Error('Node ID allocation failed: limit reached'), {
        defName,
        hint: 'Maximum number of nodes reached. Free some nodes before creating new ones.',
      });
    }

    // Build and send /s_new OSC message
    const oscMessage = buildSynthNew(defName, nodeId, addAction, targetId, controls);
    await scClient.sendOscMessageWithSync(oscMessage);

    return createSuccessResponse('create_synth', {
      message: `Synth '${defName}' created successfully`,
      nodeId,
      defName,
      controls,
    });
  } catch (error) {
    return createErrorResponse('create_synth', error, {
      defName,
      hint: 'Ensure SynthDef is loaded and server is running',
    });
  }
}

/**
 * Handler for free_synth MCP tool
 * Frees a synth instance by node ID
 *
 * @param scClient - SuperCollider client instance
 * @param nodeId - Node ID to free
 * @returns MCP tool response confirming synth freed
 */
export async function freeSynthHandler(
  scClient: SuperColliderClient,
  nodeId: number
): Promise<CallToolResult> {
  try {
    logger.info(`free_synth tool called for node: ${nodeId}`);

    // Build and send /n_free OSC message
    const oscMessage = buildNodeFree(nodeId);
    await scClient.sendOscMessageWithSync(oscMessage);

    // Deallocate node ID
    const nodeAllocator = scClient.getNodeAllocator();
    nodeAllocator.free(nodeId);

    return createSuccessResponse('free_synth', {
      message: `Synth node ${nodeId} freed successfully`,
      nodeId,
    });
  } catch (error) {
    return createErrorResponse('free_synth', error, {
      nodeId,
      hint: 'Node may already be freed or never existed',
    });
  }
}

/**
 * Handler for set_synth_controls MCP tool
 * Sets parameter values on a running synth
 *
 * @param scClient - SuperCollider client instance
 * @param nodeId - Target synth node ID
 * @param controls - Parameter key-value pairs to set
 * @returns MCP tool response confirming parameters set
 */
export async function setSynthControlsHandler(
  scClient: SuperColliderClient,
  nodeId: number,
  controls: Record<string, number>
): Promise<CallToolResult> {
  try {
    logger.info(`set_synth_controls tool called for node: ${nodeId}`);

    if (Object.keys(controls).length === 0) {
      return createErrorResponse('set_synth_controls', new Error('No controls provided'), {
        nodeId,
        hint: 'Provide at least one parameter to set',
      });
    }

    // Build and send /n_set OSC message
    const oscMessage = buildNodeSet(nodeId, controls);
    await scClient.sendOscMessageWithSync(oscMessage);

    return createSuccessResponse('set_synth_controls', {
      message: `Controls set successfully on node ${nodeId}`,
      nodeId,
      controls,
    });
  } catch (error) {
    return createErrorResponse('set_synth_controls', error, {
      nodeId,
      hint: 'Verify node exists and parameter names are correct',
    });
  }
}
