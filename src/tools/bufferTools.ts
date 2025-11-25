/**
 * MCP Tools: Buffer Management
 * load_audio_file, record_jack_input, record_microphone, free_buffer
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SuperColliderClient } from '../supercollider/client.js';
import { buildBufferAllocRead, buildBufferAlloc, buildBufferFree, buildSynthNew, buildNodeFree } from '../utils/osc.js';
import { logger } from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers.js';

/**
 * Handler for load_audio_file MCP tool
 * Loads an audio file from disk into a server buffer
 *
 * @param scClient - SuperCollider client instance
 * @param path - Absolute path to audio file (WAV, AIFF, FLAC)
 * @param startFrame - Starting frame in file (default: 0)
 * @param numFrames - Number of frames to read (-1 = entire file, default: -1)
 * @returns MCP tool response with buffer ID and file metadata
 */
export async function loadAudioFileHandler(
  scClient: SuperColliderClient,
  path: string,
  startFrame: number = 0,
  numFrames: number = -1
): Promise<CallToolResult> {
  try {
    logger.info(`load_audio_file tool called for: ${path}`);

    // Allocate unique buffer ID
    const bufferAllocator = scClient.getBufferAllocator();
    const bufferId = bufferAllocator.alloc();

    if (bufferId === null) {
      return createErrorResponse('load_audio_file', new Error('Buffer ID allocation failed: limit reached'), {
        path,
        hint: 'Maximum number of buffers reached. Free some buffers before loading new files.',
      });
    }

    // Build and send /b_allocRead OSC message
    // This allocates buffer and loads file in single operation
    const oscMessage = buildBufferAllocRead(bufferId, path, startFrame, numFrames);
    await scClient.sendOscMessageWithSync(oscMessage);

    return createSuccessResponse('load_audio_file', {
      message: `Audio file loaded successfully`,
      bufferId,
      path,
      startFrame,
      numFrames: numFrames === -1 ? 'entire file' : numFrames,
    });
  } catch (error) {
    return createErrorResponse('load_audio_file', error, {
      path,
      hint: 'Ensure file exists, is a valid audio format (WAV, AIFF, FLAC), and server is running',
    });
  }
}

/**
 * Handler for record_jack_input MCP tool
 * Records audio from JACK input ports into a buffer
 *
 * @param scClient - SuperCollider client instance
 * @param duration - Recording duration in seconds
 * @param jackPorts - Array of JACK port names to record from
 * @param channels - Number of channels to record (default: jackPorts.length)
 * @returns MCP tool response with buffer ID
 */
export async function recordJackInputHandler(
  scClient: SuperColliderClient,
  duration: number,
  jackPorts: string[],
  channels?: number
): Promise<CallToolResult> {
  try {
    logger.info(`record_jack_input tool called for ${duration}s from ports: ${jackPorts.join(', ')}`);

    const numChannels = channels ?? jackPorts.length;

    // Validate inputs
    if (duration <= 0) {
      return createErrorResponse('record_jack_input', new Error('Invalid duration'), {
        duration,
        hint: 'Duration must be positive number of seconds',
      });
    }

    if (jackPorts.length === 0) {
      return createErrorResponse('record_jack_input', new Error('No JACK ports specified'), {
        hint: 'Provide at least one JACK port name to record from',
      });
    }

    // Validate channel count is positive
    if (numChannels <= 0) {
      return createErrorResponse('record_jack_input', new Error('Invalid channel count'), {
        numChannels,
        hint: 'Channel count must be at least 1',
      });
    }

    // Validate channel count doesn't exceed server's input channels
    const serverOptions = scClient.getServerOptions();
    const maxInputChannels = serverOptions.numInputBusChannels ?? 8;
    if (numChannels > maxInputChannels) {
      return createErrorResponse('record_jack_input', new Error('Channel count exceeds server capacity'), {
        numChannels,
        maxInputChannels,
        hint: `Server only has ${maxInputChannels} input channels. Use configure_server to increase numInputBusChannels, then reboot_server.`,
      });
    }

    // Allocate buffer for recording
    const bufferAllocator = scClient.getBufferAllocator();
    const bufferId = bufferAllocator.alloc();

    if (bufferId === null) {
      return createErrorResponse('record_jack_input', new Error('Buffer ID allocation failed: limit reached'), {
        duration,
        jackPorts,
        hint: 'Maximum number of buffers reached. Free some buffers before recording.',
      });
    }

    // Calculate number of frames needed (duration * sample rate)
    const sampleRate = await scClient.getSampleRate();
    const numFrames = Math.ceil(duration * sampleRate);
    logger.debug(`Calculated buffer size: ${numFrames} frames at ${sampleRate} Hz`);

    // Allocate buffer with calculated size
    const allocMessage = buildBufferAlloc(bufferId, numFrames, numChannels);
    await scClient.sendOscMessageWithSync(allocMessage);

    // Create and execute recording SynthDef via sclang
    const { executeSclang } = await import('../supercollider/quarks.js');

    const recordingCode = `
{
  var sig = SoundIn.ar(${Array.from({length: numChannels}, (_, i) => i).join(', ')});

  SynthDef(\\__mcp_record_${bufferId}, {
    RecordBuf.ar(sig, ${bufferId}, loop: 0, doneAction: 2);
    Line.kr(0, 1, ${duration}, doneAction: 2);
  }).add;

  s.sync;
  Synth(\\__mcp_record_${bufferId});
}.value;
`;

    await executeSclang(recordingCode, 5000);

    logger.info(`Recording started: buffer ${bufferId}, ${duration}s, ${numChannels} channels`);

    return createSuccessResponse('record_jack_input', {
      message: `Recording ${duration}s to buffer ${bufferId}`,
      bufferId,
      duration,
      jackPorts,
      channels: numChannels,
      numFrames,
      sampleRate,
      hint: `Recording in progress. Will auto-stop after ${duration}s. Use free_buffer to deallocate when done.`,
    });
  } catch (error) {
    return createErrorResponse('record_jack_input', error, {
      duration,
      jackPorts,
      hint: 'Ensure JACK is running, ports are valid, and server is running',
    });
  }
}

/**
 * Handler for record_microphone MCP tool
 * Convenience wrapper around record_jack_input for system default microphone
 *
 * @param scClient - SuperCollider client instance
 * @param duration - Recording duration in seconds
 * @param channels - Number of channels (default: 2 for stereo)
 * @returns MCP tool response with buffer ID
 */
export async function recordMicrophoneHandler(
  scClient: SuperColliderClient,
  duration: number,
  channels: number = 2
): Promise<CallToolResult> {
  try {
    logger.info(`record_microphone tool called for ${duration}s (${channels} channels)`);

    // Validate duration
    if (duration <= 0) {
      return createErrorResponse('record_microphone', new Error('Invalid duration'), {
        duration,
        hint: 'Duration must be positive number of seconds',
      });
    }

    // Validate channel count is positive
    if (channels <= 0) {
      return createErrorResponse('record_microphone', new Error('Invalid channel count'), {
        channels,
        hint: 'Channel count must be at least 1',
      });
    }

    // Validate channel count doesn't exceed server capacity
    const serverOptions = scClient.getServerOptions();
    const maxInputChannels = serverOptions.numInputBusChannels ?? 8;
    if (channels > maxInputChannels) {
      return createErrorResponse('record_microphone', new Error('Channel count exceeds server capacity'), {
        channels,
        maxInputChannels,
        hint: `Server only has ${maxInputChannels} input channels. Use configure_server to increase numInputBusChannels, then reboot_server.`,
      });
    }

    // Auto-detect system default input ports
    // On Linux with JACK: typically "system:capture_1", "system:capture_2", etc.
    // On macOS with CoreAudio: handled by SuperCollider's hardware inputs
    const jackPorts: string[] = [];
    for (let i = 1; i <= channels; i++) {
      jackPorts.push(`system:capture_${i}`);
    }

    // Delegate to record_jack_input with detected ports
    return await recordJackInputHandler(scClient, duration, jackPorts, channels);
  } catch (error) {
    return createErrorResponse('record_microphone', error, {
      duration,
      channels,
      hint: 'Ensure audio input device is connected and JACK is running (Linux) or CoreAudio is available (macOS)',
    });
  }
}

/**
 * Handler for free_buffer MCP tool
 * Frees a buffer and deallocates its memory
 *
 * @param scClient - SuperCollider client instance
 * @param bufferId - Buffer ID to free
 * @returns MCP tool response confirming buffer freed
 */
export async function freeBufferHandler(
  scClient: SuperColliderClient,
  bufferId: number
): Promise<CallToolResult> {
  try {
    logger.info(`free_buffer tool called for buffer: ${bufferId}`);

    // Build and send /b_free OSC message
    const oscMessage = buildBufferFree(bufferId);
    await scClient.sendOscMessageWithSync(oscMessage);

    // Deallocate buffer ID
    const bufferAllocator = scClient.getBufferAllocator();
    bufferAllocator.free(bufferId);

    return createSuccessResponse('free_buffer', {
      message: `Buffer ${bufferId} freed successfully`,
      bufferId,
    });
  } catch (error) {
    return createErrorResponse('free_buffer', error, {
      bufferId,
      hint: 'Buffer may already be freed or never existed',
    });
  }
}
