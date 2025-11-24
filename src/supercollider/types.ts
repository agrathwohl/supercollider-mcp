/**
 * SuperCollider server status response
 * Represents the current state and metrics of a running SuperCollider server
 */
export interface SuperColliderStatus {
  /** Port number the server is running on (typically 57110 for scsynth, 57120 for sclang) */
  port: number;

  /** Current connection state of the server */
  status: 'running' | 'disconnected' | 'error';

  /** SuperCollider version string (e.g., "3.13.0") */
  version?: string;

  /** Number of unit generators currently running */
  ugenCount?: number;

  /** Number of synths currently active */
  synthCount?: number;

  /** Current CPU usage percentage */
  cpuUsage?: number;

  /** Sample rate in Hz (e.g., 48000) */
  sampleRate?: number;
}

/**
 * Connection state machine for SuperCollider client
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * OSC /status.reply response structure
 * Based on SuperCollider OSC protocol specification
 */
export interface OSCStatusReply {
  /** Unused field (always 0) */
  unused: number;

  /** Number of unit generators */
  ugenCount: number;

  /** Number of synths */
  synthCount: number;

  /** Number of groups */
  groupCount: number;

  /** Number of loaded synthdefs */
  synthDefCount: number;

  /** Average CPU usage */
  avgCPU: number;

  /** Peak CPU usage */
  peakCPU: number;

  /** Nominal sample rate */
  nominalSampleRate: number;

  /** Actual sample rate */
  actualSampleRate: number;
}

/**
 * Type-safe OSC status reply array
 * SuperCollider /status.reply returns exactly 9 numeric values in array format
 * This type provides indexed access for runtime validation
 */
export interface OSCStatusReplyArray extends Array<number> {
  0: number; // unused
  1: number; // ugenCount
  2: number; // synthCount
  3: number; // groupCount
  4: number; // synthDefCount
  5: number; // avgCPU
  6: number; // peakCPU
  7: number; // nominalSampleRate
  8: number; // actualSampleRate
}
