/**
 * MCP Tools: SynthDef Compilation
 * compile_synthdef, compile_synthdefs_batch
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SuperColliderClient } from '../supercollider/client.js';
import {
  compileSynthDef,
  compileSynthDefsBatch,
  getSynthDefParameters,
} from '../supercollider/quarks.js';
import { buildSynthDefRecv } from '../utils/osc.js';
import { logger } from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers.js';

/**
 * Handler for compile_synthdef MCP tool
 * Compiles SuperCollider SynthDef source code using isolated sclang process and loads to server via OSC
 *
 * @param scClient - SuperCollider client instance
 * @param defName - SynthDef name
 * @param source - SuperCollider SynthDef source code
 * @returns MCP tool response with compilation status and parameters
 */
export async function compileSynthDefHandler(
  scClient: SuperColliderClient,
  defName: string,
  source: string
): Promise<CallToolResult> {
  try {
    logger.info(`compile_synthdef tool called for: ${defName}`);

    // Ensure server is connected
    if (scClient.getConnectionState() !== 'connected') {
      await scClient.connect();
    }

    // Compile SynthDef using our isolated sclang process (no scsynth interaction)
    const synthDefBinary = await compileSynthDef(source, defName);

    // Load compiled SynthDef to scsynth using OSC
    const oscMessage = buildSynthDefRecv(synthDefBinary);
    await scClient.sendOscMessageWithSync(oscMessage);

    // Get parameters from sclang (uses separate isolated process)
    let parameters;
    try {
      parameters = await getSynthDefParameters(defName);
    } catch (error) {
      logger.warn(`Could not get parameters for '${defName}':`, error);
      parameters = undefined;
    }

    return createSuccessResponse('compile_synthdef', {
      message: `SynthDef '${defName}' compiled and loaded successfully`,
      defName,
      parameters,
    });
  } catch (error) {
    return createErrorResponse('compile_synthdef', error, {
      defName,
      hint: 'Check SynthDef syntax and ensure sclang is installed',
    });
  }
}

/**
 * Handler for compile_synthdefs_batch MCP tool
 * Compiles multiple SynthDefs in a single operation
 *
 * @param scClient - SuperCollider client instance
 * @param synthDefs - Array of {name, source} objects
 * @returns MCP tool response with per-SynthDef compilation results
 */
export async function compileSynthDefsBatchHandler(
  scClient: SuperColliderClient,
  synthDefs: Array<{ name: string; source: string }>
): Promise<CallToolResult> {
  try {
    logger.info(`compile_synthdefs_batch tool called for ${synthDefs.length} SynthDefs`);

    // Compile all SynthDefs
    const compilationResults = await compileSynthDefsBatch(synthDefs);

    // Separate successful compilations from failures
    const successfulCompilations = compilationResults.filter(r => r.success && r.data);
    const failedCompilations = compilationResults.filter(r => !r.success || !r.data);

    const loadResults: Array<{
      name: string;
      success: boolean;
      parameters?: unknown[];
      error?: string;
    }> = [];

    // Load all successful compilations as a batch using OSC bundle
    if (successfulCompilations.length > 0) {
      try {
        // Optimization: Send all /d_recv messages without waiting for individual replies
        // This is significantly faster than syncing after each message
        // The final sync ensures all SynthDefs are loaded before continuing
        for (const result of successfulCompilations) {
          const oscMessage = buildSynthDefRecv(result.data!);
          await scClient.sendOscMessage(oscMessage);
        }

        // Single sync confirms all preceding messages are processed
        await scClient.syncServer();

        // Get parameters for all loaded SynthDefs
        for (const result of successfulCompilations) {
          try {
            const parameters = await getSynthDefParameters(result.name);
            loadResults.push({
              name: result.name,
              success: true,
              parameters,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to get parameters for '${result.name}':`, error);
            loadResults.push({
              name: result.name,
              success: false,
              error: `Failed to get parameters: ${errorMessage}. SynthDef may not be loaded or sclang is unavailable.`,
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Mark all as failed if batch load fails
        for (const result of successfulCompilations) {
          loadResults.push({
            name: result.name,
            success: false,
            error: `Failed to load to server: ${errorMessage}`,
          });
        }
      }
    }

    // Add failed compilations to results
    for (const result of failedCompilations) {
      loadResults.push({
        name: result.name,
        success: false,
        error: result.error || 'Compilation failed',
      });
    }

    const successCount = loadResults.filter(r => r.success).length;
    const failCount = loadResults.filter(r => !r.success).length;

    return createSuccessResponse('compile_synthdefs_batch', {
      message: `Batch compilation complete: ${successCount} succeeded, ${failCount} failed`,
      total: synthDefs.length,
      succeeded: successCount,
      failed: failCount,
      results: loadResults,
    });
  } catch (error) {
    return createErrorResponse('compile_synthdefs_batch', error, {
      count: synthDefs.length,
      hint: 'Check SynthDef syntax and ensure sclang is installed',
    });
  }
}
