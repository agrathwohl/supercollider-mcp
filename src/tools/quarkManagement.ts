/**
 * MCP Tools: Quark Package Management
 * install_quark, remove_quark, update_quark, list_quarks
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  listInstalledQuarks,
  installQuark,
  removeQuark,
  executeSclang,
} from '../supercollider/quarks.js';
import { logger } from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers.js';

/**
 * Handler for install_quark MCP tool
 * Installs a SuperCollider extension package by name
 *
 * @param quarkName - Name of the quark to install
 * @returns MCP tool response with installation status
 */
export async function installQuarkHandler(
  quarkName: string
): Promise<CallToolResult> {
  try {
    logger.info(`install_quark tool called for: ${quarkName}`);

    const result = await installQuark(quarkName);

    return createSuccessResponse('install_quark', {
      message: result,
      quarkName,
    });
  } catch (error) {
    return createErrorResponse('install_quark', error, {
      quarkName,
      hint: 'Check that the quark name is correct and your network connection is active',
    });
  }
}

/**
 * Handler for remove_quark MCP tool
 * Removes an installed SuperCollider extension package
 *
 * @param quarkName - Name of the quark to remove
 * @returns MCP tool response with removal status
 */
export async function removeQuarkHandler(
  quarkName: string
): Promise<CallToolResult> {
  try {
    logger.info(`remove_quark tool called for: ${quarkName}`);

    const result = await removeQuark(quarkName);

    return createSuccessResponse('remove_quark', {
      message: result,
      quarkName,
    });
  } catch (error) {
    return createErrorResponse('remove_quark', error, {
      quarkName,
    });
  }
}

/**
 * Handler for update_quark MCP tool
 * Updates a quark to the latest version
 *
 * @param quarkName - Name of the quark to update (or "all" for all quarks)
 * @returns MCP tool response with update status
 */
export async function updateQuarkHandler(
  quarkName: string
): Promise<CallToolResult> {
  try {
    logger.info(`update_quark tool called for: ${quarkName}`);

    const code = quarkName === 'all'
      ? `
        Quarks.update;
        "All quarks updated successfully".postln;
        0.exit;
      `
      : `
        Quarks.update("${quarkName}");
        "Quark '${quarkName}' updated successfully".postln;
        0.exit;
      `;

    const output = await executeSclang(code);

    if (output.includes('ERROR') || output.includes('failed')) {
      throw new Error(`Update failed: ${output}`);
    }

    return createSuccessResponse('update_quark', {
      message: quarkName === 'all'
        ? 'All quarks updated successfully'
        : `Quark '${quarkName}' updated successfully`,
      quarkName,
    });
  } catch (error) {
    return createErrorResponse('update_quark', error, {
      quarkName,
      hint: 'Check network connection and that the quark is installed',
    });
  }
}

/**
 * Handler for list_quarks MCP tool
 * Lists all installed SuperCollider extension packages
 *
 * @returns MCP tool response with list of installed quarks
 */
export async function listQuarksHandler(): Promise<CallToolResult> {
  try {
    logger.info('list_quarks tool called');

    const quarks = await listInstalledQuarks();

    return createSuccessResponse('list_quarks', {
      count: quarks.length,
      quarks,
    });
  } catch (error) {
    return createErrorResponse('list_quarks', error, {
      hint: 'Ensure sclang is installed and accessible in PATH',
    });
  }
}
