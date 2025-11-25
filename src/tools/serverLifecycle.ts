/**
 * MCP Tools: Server Lifecycle Management
 * boot_server, quit_server, reboot_server, configure_server
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SuperColliderClient } from '../supercollider/client.js';
import type { ServerOptions } from '../supercollider/types.js';
import { logger } from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers.js';

/**
 * Handler for boot_server MCP tool
 * Boots SuperCollider server with optional configuration
 *
 * @param scClient - SuperCollider client instance
 * @param options - Server boot options
 * @returns MCP tool response with server status or error
 */
export async function bootServerHandler(
  scClient: SuperColliderClient,
  options: ServerOptions = {}
): Promise<CallToolResult> {
  try {
    logger.info('boot_server tool called with options:', options);

    // Store server options for reboot functionality
    scClient.setServerOptions(options);

    // Boot the server
    await scClient.connect();

    // Get status to confirm boot
    const status = await scClient.getStatus();

    return createSuccessResponse('boot_server', {
      message: 'SuperCollider server booted successfully',
      status,
      options: scClient.getServerOptions(),
    });
  } catch (error) {
    return createErrorResponse('boot_server', error);
  }
}

/**
 * Handler for quit_server MCP tool
 * Quits SuperCollider server gracefully
 *
 * @param scClient - SuperCollider client instance
 * @returns MCP tool response with quit confirmation or error
 */
export async function quitServerHandler(
  scClient: SuperColliderClient
): Promise<CallToolResult> {
  try {
    logger.info('quit_server tool called');

    // Disconnect from server (includes automatic resource cleanup)
    await scClient.disconnect();

    return createSuccessResponse('quit_server', {
      message: 'SuperCollider server quit successfully',
      connectionState: scClient.getConnectionState(),
    });
  } catch (error) {
    return createErrorResponse('quit_server', error);
  }
}

/**
 * Handler for reboot_server MCP tool
 * Quits and reboots SuperCollider server with preserved configuration
 *
 * @param scClient - SuperCollider client instance
 * @returns MCP tool response with reboot status or error
 */
export async function rebootServerHandler(
  scClient: SuperColliderClient
): Promise<CallToolResult> {
  try {
    logger.info('reboot_server tool called');

    // Get current server options before quitting
    const savedOptions = scClient.getServerOptions();

    // Quit the server
    await scClient.disconnect();

    // Small delay to ensure clean shutdown
    await new Promise(resolve => setTimeout(resolve, 500));

    // Boot with saved options
    await scClient.connect();

    // Get status to confirm reboot
    const status = await scClient.getStatus();

    return createSuccessResponse('reboot_server', {
      message: 'SuperCollider server rebooted successfully',
      status,
      preservedOptions: savedOptions,
    });
  } catch (error) {
    return createErrorResponse('reboot_server', error, {
      hint: 'Server may need to be manually booted with boot_server tool',
    });
  }
}

/**
 * Handler for configure_server MCP tool
 * Updates server configuration options
 *
 * @param scClient - SuperCollider client instance
 * @param options - Server configuration options to update
 * @returns MCP tool response with configuration status
 */
export async function configureServerHandler(
  scClient: SuperColliderClient,
  options: ServerOptions
): Promise<CallToolResult> {
  try {
    logger.info('configure_server tool called with options:', options);

    // Get current options
    const currentOptions = scClient.getServerOptions();

    // Update server options
    scClient.setServerOptions(options);

    // Get updated options
    const updatedOptions = scClient.getServerOptions();

    // Check if server is currently running
    const isRunning = scClient.getConnectionState() === 'connected';

    // Determine which options require reboot
    const requiresReboot = isRunning && (
      options.port !== undefined ||
      options.sampleRate !== undefined ||
      options.numInputBusChannels !== undefined ||
      options.numOutputBusChannels !== undefined ||
      options.device !== undefined
    );

    return createSuccessResponse('configure_server', {
      message: 'Server configuration updated',
      previousOptions: currentOptions,
      currentOptions: updatedOptions,
      requiresReboot,
      rebootHint: requiresReboot
        ? 'Some options require server reboot to take effect. Use reboot_server tool.'
        : 'Configuration updated. Changes will apply on next boot.',
    });
  } catch (error) {
    return createErrorResponse('configure_server', error);
  }
}
