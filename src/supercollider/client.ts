/**
 * SuperCollider client for managing server lifecycle and communication
 * Uses supercolliderjs to boot and manage scsynth server process
 */

import sc from 'supercolliderjs';
import * as msg from '@supercollider/server/lib/osc/msg.js';
import type { ConnectionState, SuperColliderStatus, OSCStatusReplyArray, ServerOptions } from './types.js';
import { logger } from '../utils/logger.js';
import { SuperColliderError, SC_CONNECTION_FAILED, SC_NOT_FOUND, SC_INVALID_RESPONSE } from '../utils/errors.js';
import { NodeAllocator, BufferAllocator, AudioBusAllocator, ControlBusAllocator } from './allocators.js';

/**
 * Client options for SuperCollider connection
 */
export interface ClientOptions {
  /** Path to scsynth executable (optional, auto-detected if not provided) */
  scsynth?: string;
  /** Port to use for OSC communication (default: 57110) */
  port?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * SuperCollider client for server management
 * Boots scsynth server process and provides status queries
 */
export class SuperColliderClient {
  private connectionState: ConnectionState = 'disconnected';
  private scServer: any = null; // supercolliderjs Server instance
  private options: ClientOptions;
  private serverOptions: ServerOptions = {};

  // Resource allocators for collision-free ID management
  private nodeAllocator: NodeAllocator;
  private bufferAllocator: BufferAllocator;
  private audioBusAllocator: AudioBusAllocator;
  private controlBusAllocator: ControlBusAllocator;

  // Sync ID counter for unique /sync message IDs
  private nextSyncId: number = 0;

  constructor(options: ClientOptions = {}) {
    this.options = {
      port: 57110,
      debug: false,
      ...options,
    };

    // Initialize allocators with default limits
    this.nodeAllocator = new NodeAllocator(1024);
    this.bufferAllocator = new BufferAllocator(1024);
    this.audioBusAllocator = new AudioBusAllocator(8, 128);
    this.controlBusAllocator = new ControlBusAllocator(16384);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get the underlying supercolliderjs Server instance
   */
  getServer(): any {
    return this.scServer;
  }

  /**
   * Get current server options
   */
  getServerOptions(): ServerOptions {
    return { ...this.serverOptions };
  }

  /**
   * Set server options (will require reboot to take effect)
   */
  setServerOptions(options: ServerOptions): void {
    this.serverOptions = { ...this.serverOptions, ...options };
  }

  /**
   * Get node allocator
   */
  getNodeAllocator(): NodeAllocator {
    return this.nodeAllocator;
  }

  /**
   * Get buffer allocator
   */
  getBufferAllocator(): BufferAllocator {
    return this.bufferAllocator;
  }

  /**
   * Get audio bus allocator
   */
  getAudioBusAllocator(): AudioBusAllocator {
    return this.audioBusAllocator;
  }

  /**
   * Get control bus allocator
   */
  getControlBusAllocator(): ControlBusAllocator {
    return this.controlBusAllocator;
  }

  /**
   * Reset all allocators to initial state
   * Called automatically on disconnect to prevent stale resource IDs
   */
  private resetAllocators(): void {
    logger.debug('Resetting all resource allocators');
    this.nodeAllocator.reset();
    this.bufferAllocator.reset();
    this.audioBusAllocator.reset();
    this.controlBusAllocator.reset();
  }

  /**
   * Set connection state and log transition
   */
  private setState(newState: ConnectionState): void {
    if (this.connectionState !== newState) {
      logger.info(`SuperCollider client state: ${this.connectionState} � ${newState}`);
      this.connectionState = newState;
    }
  }

  /**
   * Validate OSC status reply format
   * Ensures response has expected structure to prevent runtime errors
   *
   * @param reply - Raw OSC response array
   * @returns Type-safe status reply array
   * @throws SuperColliderError if format is invalid
   */
  private validateStatusReply(reply: any): OSCStatusReplyArray {
    if (!Array.isArray(reply)) {
      throw new SuperColliderError(
        'Invalid status reply: expected array',
        SC_INVALID_RESPONSE
      );
    }

    if (reply.length < 9) {
      throw new SuperColliderError(
        `Invalid status reply: expected 9 values, got ${reply.length}`,
        SC_INVALID_RESPONSE
      );
    }

    // Validate all values are numbers
    if (!reply.slice(0, 9).every((val) => typeof val === 'number')) {
      throw new SuperColliderError(
        'Invalid status reply: all values must be numbers',
        SC_INVALID_RESPONSE
      );
    }

    return reply as OSCStatusReplyArray;
  }

  /**
   * Connect to SuperCollider by booting scsynth server
   */
  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.connectionState === 'connected') {
      logger.debug('Already connected to SuperCollider');
      return;
    }

    this.setState('connecting');

    try {
      logger.info('Booting SuperCollider server...');

      // Boot scsynth using supercolliderjs
      this.scServer = await sc.server.boot({
        serverPort: this.options.port?.toString(),
        scsynth: this.options.scsynth,
        debug: this.options.debug,
        echo: false, // Don't echo scsynth output to console
      });

      this.setState('connected');
      logger.info(`SuperCollider server booted successfully on port ${this.options.port}`);
    } catch (error) {
      this.setState('error');

      // Check if error is due to missing SuperCollider installation
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('scsynth') || errorMessage.includes('not found')) {
        throw new SuperColliderError(
          'SuperCollider (scsynth) not found. Please install SuperCollider from https://supercollider.github.io/',
          SC_NOT_FOUND,
          error instanceof Error ? error : undefined
        );
      }

      throw new SuperColliderError(
        `Failed to boot SuperCollider server: ${errorMessage}`,
        SC_CONNECTION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Disconnect from SuperCollider by quitting the server
   */
  async disconnect(): Promise<void> {
    if (this.connectionState === 'disconnected') {
      logger.debug('Already disconnected from SuperCollider');
      return;
    }

    try {
      if (this.scServer) {
        logger.info('Quitting SuperCollider server...');
        await this.scServer.quit();
        this.scServer = null;
      }

      this.setState('disconnected');

      // Reset all allocators on disconnect to prevent stale resource IDs
      this.resetAllocators();

      logger.info('SuperCollider server disconnected');
    } catch (error) {
      logger.error('Error during disconnect:', error);
      this.setState('error');

      // Still reset allocators even if disconnect had errors
      this.resetAllocators();

      throw new SuperColliderError(
        'Failed to disconnect from SuperCollider',
        SC_CONNECTION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get server status
   * Auto-connects if not already connected
   */
  async getStatus(): Promise<SuperColliderStatus> {
    // Auto-connect if needed
    if (this.connectionState !== 'connected') {
      await this.connect();
    }

    if (!this.scServer) {
      throw new SuperColliderError('Server not available', SC_CONNECTION_FAILED);
    }

    try {
      // Query server status via OSC using callAndResponse pattern
      const rawReply = await this.scServer.callAndResponse(msg.status());

      // Validate and type-check the response
      const statusReply = this.validateStatusReply(rawReply);

      // Parse status reply
      // SuperCollider /status.reply format:
      // [unused, ugenCount, synthCount, groupCount, synthDefCount, avgCPU, peakCPU, sampleRateNominal, sampleRateActual]
      const [
        ,
        ugenCount,
        synthCount,
        ,
        ,
        avgCPU,
        ,
        sampleRate,
      ] = statusReply;

      return {
        port: this.options.port!,
        status: 'running',
        ugenCount,
        synthCount,
        cpuUsage: avgCPU,
        sampleRate,
      };
    } catch (error) {
      logger.error('Failed to get server status:', error);
      throw new SuperColliderError(
        'Failed to query server status',
        SC_CONNECTION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get server sample rate
   * Convenience wrapper around getStatus() for common use case
   *
   * @returns Sample rate in Hz (e.g., 44100, 48000, 96000)
   * @throws {SuperColliderError} If server status query fails or sample rate unavailable
   */
  async getSampleRate(): Promise<number> {
    const status = await this.getStatus();
    if (status.sampleRate === undefined) {
      throw new SuperColliderError(
        'Sample rate not available from server status',
        SC_INVALID_RESPONSE
      );
    }
    return status.sampleRate;
  }

  /**
   * Send one-way OSC message to server (no response expected)
   * Auto-connects if not already connected
   *
   * @param oscMessage - OSC message array (e.g., ['/d_recv', data])
   */
  async sendOscMessage(oscMessage: unknown[]): Promise<void> {
    // Auto-connect if needed
    if (this.connectionState !== 'connected') {
      await this.connect();
    }

    if (!this.scServer) {
      throw new SuperColliderError('Server not available', SC_CONNECTION_FAILED);
    }

    try {
      logger.debug(`Sending OSC message: ${oscMessage[0]}`);
      await this.scServer.send.msg(oscMessage);
    } catch (error) {
      logger.error('Failed to send OSC message:', error);
      throw new SuperColliderError(
        'Failed to send OSC message to server',
        SC_CONNECTION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Synchronize with server
   * Waits for server to process all pending asynchronous commands
   * Useful for batch operations: send multiple commands, then sync once
   *
   * @returns Promise that resolves when server confirms synchronization
   */
  async syncServer(): Promise<void> {
    // Auto-connect if needed
    if (this.connectionState !== 'connected') {
      await this.connect();
    }

    if (!this.scServer) {
      throw new SuperColliderError('Server not available', SC_CONNECTION_FAILED);
    }

    try {
      const syncId = this.nextSyncId++;
      logger.debug(`Syncing server with ID: ${syncId}`);
      await this.scServer.callAndResponse(msg.sync(syncId));
      logger.debug(`Server synchronized (ID: ${syncId})`);
    } catch (error) {
      logger.error('Failed to sync with server:', error);
      throw new SuperColliderError(
        'Server synchronization failed',
        SC_CONNECTION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Send OSC message and wait for server synchronization
   * Uses /sync mechanism to ensure server has processed the message
   * Auto-connects if not already connected
   *
   * @param oscMessage - OSC message array (e.g., ['/d_recv', data])
   */
  async sendOscMessageWithSync(oscMessage: unknown[]): Promise<void> {
    // Reuse sendOscMessage for consistency (handles connection, validation, errors)
    await this.sendOscMessage(oscMessage);

    // Add synchronization mechanism
    await this.syncServer();
  }
}
