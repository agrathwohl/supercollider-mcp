/**
 * MCP tool handlers for SuperCollider sclang pattern operations
 * Provides tools for creating and controlling Pdefs and Tdefs
 */

import { z } from 'zod';
import { SclangClient } from '../supercollider/sclangClient.js';
import { SuperColliderError } from '../utils/errors.js';

// Zod validation schemas for tool inputs

export const CreatePdefSchema = z.object({
  name: z.string().min(1).describe('Pattern name (unique identifier)'),
  pattern: z.string().min(1).describe('SuperCollider pattern code (e.g., "Pbind(\\\\freq, 440, \\\\dur, 0.5)")'),
  quant: z.number().optional().describe('Optional quant value for pattern scheduling synchronization'),
});

export const CreateTdefSchema = z.object({
  name: z.string().min(1).describe('Task name (unique identifier)'),
  task: z.string().min(1).describe('SuperCollider task code (function/routine)'),
  quant: z.number().optional().describe('Optional quant value for task scheduling synchronization'),
});

export const ModifyPatternSchema = z.object({
  name: z.string().min(1).describe('Pattern or task name to modify'),
  type: z.enum(['pdef', 'tdef']).describe('Pattern type (pdef or tdef)'),
  code: z.string().min(1).describe('New pattern or task code'),
});

export const GetPatternStatusSchema = z.object({
  name: z.string().min(1).describe('Pattern or task name to query'),
  type: z.enum(['pdef', 'tdef']).optional().describe('Pattern type (pdef or tdef), auto-detects if not specified'),
});

export const ControlPatternSchema = z.object({
  name: z.string().min(1).describe('Pattern name to control'),
  action: z.enum(['play', 'stop', 'pause']).describe('Control action: play (start pattern), stop (stop and reset), pause (pause without reset)'),
});

export const ListActivePatternsSchema = z.object({});

// MCP tool handler implementations

/**
 * Create a new Pdef pattern
 */
export async function createPdefHandler(
  client: SclangClient,
  args: z.infer<typeof CreatePdefSchema>
) {
  try {
    // Auto-connect if not connected
    if (!client.isConnected()) {
      await client.connect();
    }

    const result = await client.createPdef(args.name, args.pattern, args.quant);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            pdef: result,
            message: `Pdef '${args.name}' created successfully`,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Create a new Tdef task
 */
export async function createTdefHandler(
  client: SclangClient,
  args: z.infer<typeof CreateTdefSchema>
) {
  try {
    // Auto-connect if not connected
    if (!client.isConnected()) {
      await client.connect();
    }

    const result = await client.createTdef(args.name, args.task, args.quant);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            tdef: result,
            message: `Tdef '${args.name}' created successfully`,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Modify an existing pattern (Pdef or Tdef)
 */
export async function modifyPatternHandler(
  client: SclangClient,
  args: z.infer<typeof ModifyPatternSchema>
) {
  try {
    // Auto-connect if not connected
    if (!client.isConnected()) {
      await client.connect();
    }

    let result;

    if (args.type === 'pdef') {
      result = await client.modifyPdef(args.name, args.code);
    } else {
      result = await client.modifyTdef(args.name, args.code);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            pattern: result,
            message: `${args.type === 'pdef' ? 'Pdef' : 'Tdef'} '${args.name}' modified successfully`,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get status of a pattern (Pdef or Tdef)
 */
export async function getPatternStatusHandler(
  client: SclangClient,
  args: z.infer<typeof GetPatternStatusSchema>
) {
  try {
    // Auto-connect if not connected
    if (!client.isConnected()) {
      await client.connect();
    }

    let result;

    if (args.type === 'pdef' || !args.type) {
      // Try Pdef first if not specified
      try {
        result = await client.getPdefStatus(args.name);
      } catch (error) {
        // If Pdef not found and type not specified, try Tdef
        if (!args.type) {
          result = await client.getTdefStatus(args.name);
        } else {
          throw error;
        }
      }
    } else {
      result = await client.getTdefStatus(args.name);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            status: result,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Control a pattern (play, stop, pause)
 */
export async function controlPatternHandler(
  client: SclangClient,
  args: z.infer<typeof ControlPatternSchema>
) {
  try {
    // Auto-connect if not connected
    if (!client.isConnected()) {
      await client.connect();
    }

    const result = await client.controlPdef(args.name, args.action);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            pattern: result,
            message: `Pattern '${args.name}' ${args.action} command executed`,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * List all active patterns (Pdefs and Tdefs)
 */
export async function listActivePatternsHandler(
  client: SclangClient,
  args: z.infer<typeof ListActivePatternsSchema>
) {
  try {
    // Auto-connect if not connected
    if (!client.isConnected()) {
      await client.connect();
    }

    const patterns = await client.listActivePatterns();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            count: patterns.length,
            patterns,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
