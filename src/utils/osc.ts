/**
 * OSC message builder utilities for SuperCollider server commands
 * Provides type-safe construction of OSC messages following SuperCollider protocol
 *
 * @see http://doc.sccode.org/Reference/Server-Command-Reference.html
 */

/**
 * Build /s_new OSC message for creating a synth instance
 *
 * @param defName - SynthDef name
 * @param nodeId - Unique node ID (from NodeAllocator)
 * @param addAction - Where to add node (0=head, 1=tail, 2=before, 3=after, 4=replace)
 * @param targetId - Target group or node ID
 * @param controls - Parameter key-value pairs (alternating names and values)
 * @returns OSC message array ['/s_new', defName, nodeId, addAction, targetId, ...controls]
 */
export function buildSynthNew(
  defName: string,
  nodeId: number,
  addAction: number = 1,
  targetId: number = 1,
  controls: Record<string, number> = {}
): unknown[] {
  const message: unknown[] = ['/s_new', defName, nodeId, addAction, targetId];

  // Add controls as alternating key-value pairs
  for (const [key, value] of Object.entries(controls)) {
    message.push(key, value);
  }

  return message;
}

/**
 * Build /n_free OSC message for freeing a node (synth or group)
 *
 * @param nodeIds - One or more node IDs to free
 * @returns OSC message array ['/n_free', ...nodeIds]
 */
export function buildNodeFree(...nodeIds: number[]): unknown[] {
  return ['/n_free', ...nodeIds];
}

/**
 * Build /n_set OSC message for setting node parameters
 *
 * @param nodeId - Target node ID
 * @param controls - Parameter key-value pairs
 * @returns OSC message array ['/n_set', nodeId, ...controls]
 */
export function buildNodeSet(
  nodeId: number,
  controls: Record<string, number>
): unknown[] {
  const message: unknown[] = ['/n_set', nodeId];

  // Add controls as alternating key-value pairs
  for (const [key, value] of Object.entries(controls)) {
    message.push(key, value);
  }

  return message;
}

/**
 * Build /g_new OSC message for creating a group
 *
 * @param groupId - Unique node ID for group (from NodeAllocator)
 * @param addAction - Where to add group (0=head, 1=tail, 2=before, 3=after)
 * @param targetId - Target group ID
 * @returns OSC message array ['/g_new', groupId, addAction, targetId]
 */
export function buildGroupNew(
  groupId: number,
  addAction: number = 1,
  targetId: number = 1
): unknown[] {
  return ['/g_new', groupId, addAction, targetId];
}

/**
 * Build /b_alloc OSC message for allocating a buffer
 *
 * @param bufferId - Unique buffer ID (from BufferAllocator)
 * @param frames - Number of sample frames
 * @param channels - Number of audio channels
 * @returns OSC message array ['/b_alloc', bufferId, frames, channels]
 */
export function buildBufferAlloc(
  bufferId: number,
  frames: number,
  channels: number = 1
): unknown[] {
  return ['/b_alloc', bufferId, frames, channels];
}

/**
 * Build /b_allocRead OSC message for allocating buffer and loading audio file
 *
 * @param bufferId - Unique buffer ID (from BufferAllocator)
 * @param path - Absolute file path to audio file
 * @param startFrame - Starting frame in file (default: 0)
 * @param numFrames - Number of frames to read (-1 = entire file, default: -1)
 * @returns OSC message array ['/b_allocRead', bufferId, path, startFrame, numFrames]
 */
export function buildBufferAllocRead(
  bufferId: number,
  path: string,
  startFrame: number = 0,
  numFrames: number = -1
): unknown[] {
  return ['/b_allocRead', bufferId, path, startFrame, numFrames];
}

/**
 * Build /b_free OSC message for freeing a buffer
 *
 * @param bufferIds - One or more buffer IDs to free
 * @returns OSC message array ['/b_free', ...bufferIds]
 */
export function buildBufferFree(...bufferIds: number[]): unknown[] {
  return ['/b_free', ...bufferIds];
}

/**
 * Build /b_query OSC message for querying buffer info
 *
 * @param bufferIds - One or more buffer IDs to query
 * @returns OSC message array ['/b_query', ...bufferIds]
 */
export function buildBufferQuery(...bufferIds: number[]): unknown[] {
  return ['/b_query', ...bufferIds];
}

/**
 * Build /n_query OSC message for querying node info
 *
 * @param nodeIds - One or more node IDs to query
 * @returns OSC message array ['/n_query', ...nodeIds]
 */
export function buildNodeQuery(...nodeIds: number[]): unknown[] {
  return ['/n_query', ...nodeIds];
}

/**
 * Build /g_freeAll OSC message for freeing all nodes in a group
 *
 * @param groupIds - One or more group IDs to free all children from
 * @returns OSC message array ['/g_freeAll', ...groupIds]
 */
export function buildGroupFreeAll(...groupIds: number[]): unknown[] {
  return ['/g_freeAll', ...groupIds];
}

/**
 * Build /sync OSC message for server synchronization
 *
 * @param syncId - Unique sync ID (server will reply with /synced message)
 * @returns OSC message array ['/sync', syncId]
 */
export function buildSync(syncId: number): unknown[] {
  return ['/sync', syncId];
}

/**
 * Build /quit OSC message for quitting the server
 *
 * @returns OSC message array ['/quit']
 */
export function buildQuit(): unknown[] {
  return ['/quit'];
}

/**
 * Build /notify OSC message for enabling/disabling notifications
 *
 * @param enabled - true to enable notifications, false to disable
 * @returns OSC message array ['/notify', 1] or ['/notify', 0]
 */
export function buildNotify(enabled: boolean): unknown[] {
  return ['/notify', enabled ? 1 : 0];
}

/**
 * Build /status OSC message for querying server status
 *
 * @returns OSC message array ['/status']
 */
export function buildStatus(): unknown[] {
  return ['/status'];
}

/**
 * Build /d_recv OSC message for loading compiled SynthDef
 *
 * @param synthDefData - Compiled SynthDef binary data (Uint8Array)
 * @param completionMsg - Optional OSC message to execute after loading
 * @returns OSC message array ['/d_recv', synthDefData, completionMsg?]
 */
export function buildSynthDefRecv(
  synthDefData: Uint8Array,
  completionMsg?: unknown[]
): unknown[] {
  if (completionMsg) {
    return ['/d_recv', synthDefData, completionMsg];
  }
  return ['/d_recv', synthDefData];
}

/**
 * Build /d_load OSC message for loading SynthDef from file
 *
 * @param path - Absolute path to .scsyndef file
 * @param completionMsg - Optional OSC message to execute after loading
 * @returns OSC message array ['/d_load', path, completionMsg?]
 */
export function buildSynthDefLoad(
  path: string,
  completionMsg?: unknown[]
): unknown[] {
  if (completionMsg) {
    return ['/d_load', path, completionMsg];
  }
  return ['/d_load', path];
}

/**
 * Build /d_free OSC message for removing SynthDef from server
 *
 * @param defNames - One or more SynthDef names to remove
 * @returns OSC message array ['/d_free', ...defNames]
 */
export function buildSynthDefFree(...defNames: string[]): unknown[] {
  return ['/d_free', ...defNames];
}
