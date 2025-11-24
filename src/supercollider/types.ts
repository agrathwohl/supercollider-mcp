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

/**
 * Server boot configuration options
 * Used for starting SuperCollider server (scsynth) with custom settings
 */
export interface ServerOptions {
  /** UDP port number for OSC communication (default: 57110) */
  port?: number;

  /** Number of input audio channels (default: 8) */
  numInputBusChannels?: number;

  /** Number of output audio channels (default: 8) */
  numOutputBusChannels?: number;

  /** Number of audio bus channels for routing (default: 128) */
  numAudioBusChannels?: number;

  /** Number of control bus channels for modulation (default: 16384) */
  numControlBusChannels?: number;

  /** Maximum number of nodes (synths + groups) (default: 1024) */
  maxNodes?: number;

  /** Maximum number of buffers (default: 1024) */
  maxBuffers?: number;

  /** Sample rate in Hz (default: 48000) */
  sampleRate?: number;

  /** Audio hardware device name (platform-specific) */
  device?: string;

  /** Block size for audio processing (default: 64) */
  blockSize?: number;

  /** Number of hardware input channels (default: 2) */
  hardwareBufferSize?: number;

  /** Memory size in KB for real-time memory pool (default: 8192) */
  memSize?: number;

  /** Maximum number of wire buffers (default: 64) */
  numWireBufs?: number;

  /** Random number generator seed */
  randomSeed?: number;

  /** Enable real-time scheduling (Linux only) */
  realtime?: boolean;

  /** Verbosity level (0-4, default: 0) */
  verbosity?: number;
}

/**
 * Quark (SuperCollider extension package) metadata
 * Quarks are community-contributed extensions to SuperCollider
 */
export interface QuarkInfo {
  /** Quark package name (e.g., "VSTPlugin", "SuperDirt") */
  name: string;

  /** Semantic version string (e.g., "1.2.3") */
  version: string;

  /** Human-readable package description */
  description: string;

  /** Installation status */
  installed: boolean;

  /** Package author */
  author?: string;

  /** Repository URL */
  url?: string;

  /** Dependencies on other quarks */
  dependencies?: string[];
}

/**
 * SynthDef (Synthesis Definition) metadata
 * SynthDefs define the audio processing structure compiled to scsynth
 */
export interface SynthDefInfo {
  /** SynthDef name (used for creating synth instances) */
  name: string;

  /** Parameter definitions with names and default values */
  parameters: SynthDefParameter[];

  /** Number of input channels */
  numInputs?: number;

  /** Number of output channels */
  numOutputs?: number;

  /** SynthDef source code (SuperCollider language) */
  source?: string;
}

/**
 * SynthDef parameter definition
 */
export interface SynthDefParameter {
  /** Parameter name (e.g., "freq", "amp", "pan") */
  name: string;

  /** Default value */
  defaultValue: number;

  /** Parameter index in OSC commands */
  index: number;

  /** Optional minimum value hint */
  minValue?: number;

  /** Optional maximum value hint */
  maxValue?: number;

  /** Optional parameter unit hint (Hz, dB, etc.) */
  unit?: string;
}

/**
 * Running synth instance information
 * Synths are running instances of SynthDefs on the server
 */
export interface SynthInfo {
  /** Unique node ID assigned by allocator */
  id: number;

  /** SynthDef name this synth was created from */
  defName: string;

  /** Parent group ID (0 for default group) */
  groupId: number;

  /** Current parameter values */
  parameters: Record<string, number>;

  /** Creation timestamp */
  createdAt: Date;

  /** Whether synth is currently playing */
  isPlaying: boolean;
}

/**
 * Group node information
 * Groups organize synths hierarchically for easy management
 */
export interface GroupInfo {
  /** Unique node ID assigned by allocator */
  id: number;

  /** Parent group ID (0 for root group, 1 for default group) */
  parentId: number;

  /** Child node IDs (synths and subgroups) */
  children: number[];

  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Audio buffer metadata
 * Buffers hold audio data for playback, recording, or processing
 */
export interface BufferInfo {
  /** Unique buffer ID assigned by allocator */
  id: number;

  /** Number of sample frames */
  frames: number;

  /** Number of audio channels (1=mono, 2=stereo, etc.) */
  channels: number;

  /** Sample rate in Hz */
  sampleRate: number;

  /** Source file path if loaded from disk */
  filePath?: string;

  /** Whether buffer was recorded from input */
  isRecorded?: boolean;

  /** Creation/allocation timestamp */
  createdAt: Date;

  /** Memory size in bytes */
  sizeBytes: number;
}

/**
 * Base interface for resource ID allocators
 * Allocators prevent ID collisions for nodes, buffers, and buses
 */
export interface ResourceAllocatorInterface {
  /**
   * Allocate a new unique ID
   * @returns Allocated ID or null if exhausted
   */
  alloc(): number | null;

  /**
   * Free an allocated ID for reuse
   * @param id Previously allocated ID to free
   */
  free(id: number): void;

  /**
   * Check if an ID is currently allocated
   * @param id ID to check
   * @returns true if allocated, false if free
   */
  isAllocated(id: number): boolean;

  /**
   * Reset allocator to initial state
   * Clears all allocations and free lists
   */
  reset(): void;

  /**
   * Get count of currently allocated IDs
   * @returns Number of active allocations
   */
  getAllocatedCount(): number;

  /**
   * Get all currently allocated IDs
   * @returns Array of allocated IDs
   */
  getAllocatedIds(): number[];
}
