/**
 * Resource ID allocators for SuperCollider nodes, buffers, and buses
 * Provides collision-free ID management with automatic recycling and cleanup
 */

import type { ResourceAllocatorInterface } from './types.js';

/**
 * Node ID allocator for synths and groups
 * Allocates unique node IDs starting from 1000 to avoid conflicts with system nodes
 */
export class NodeAllocator implements ResourceAllocatorInterface {
  private nextId: number;
  private readonly startId: number = 1000;
  private readonly maxId: number;
  private freeIds: Set<number>;
  private allocated: Set<number>;

  /**
   * @param maxNodes - Maximum number of nodes (default: 1024)
   */
  constructor(maxNodes: number = 1024) {
    this.nextId = this.startId;
    this.maxId = this.startId + maxNodes - 1;
    this.freeIds = new Set<number>();
    this.allocated = new Set<number>();
  }

  /**
   * Allocate a new unique node ID
   * @returns Node ID or null if exhausted
   */
  alloc(): number | null {
    // First try to reuse a freed ID
    if (this.freeIds.size > 0) {
      const id = this.freeIds.values().next().value as number;
      this.freeIds.delete(id);
      this.allocated.add(id);
      return id;
    }

    // Check if we've reached the limit
    if (this.nextId > this.maxId) {
      return null;
    }

    // Allocate new ID
    const id = this.nextId++;
    this.allocated.add(id);
    return id;
  }

  /**
   * Free a node ID for reuse
   * @param id Node ID to free
   */
  free(id: number): void {
    if (this.allocated.has(id)) {
      this.allocated.delete(id);
      this.freeIds.add(id);
    }
  }

  /**
   * Check if a node ID is currently allocated
   * @param id Node ID to check
   * @returns true if allocated, false otherwise
   */
  isAllocated(id: number): boolean {
    return this.allocated.has(id);
  }

  /**
   * Reset allocator to initial state
   * Clears all allocations and free lists
   */
  reset(): void {
    this.nextId = this.startId;
    this.freeIds.clear();
    this.allocated.clear();
  }

  /**
   * Get count of currently allocated node IDs
   * @returns Number of active allocations
   */
  getAllocatedCount(): number {
    return this.allocated.size;
  }

  /**
   * Get all currently allocated node IDs
   * @returns Array of allocated node IDs
   */
  getAllocatedIds(): number[] {
    return Array.from(this.allocated);
  }
}

/**
 * Buffer ID allocator
 * Allocates unique buffer IDs starting from 0
 */
export class BufferAllocator implements ResourceAllocatorInterface {
  private nextId: number = 0;
  private readonly maxBuffers: number;
  private freeIds: Set<number>;
  private allocated: Set<number>;

  /**
   * @param maxBuffers - Maximum number of buffers (default: 1024)
   */
  constructor(maxBuffers: number = 1024) {
    this.maxBuffers = maxBuffers;
    this.freeIds = new Set<number>();
    this.allocated = new Set<number>();
  }

  /**
   * Allocate a new unique buffer ID
   * @returns Buffer ID or null if exhausted
   */
  alloc(): number | null {
    // First try to reuse a freed ID
    if (this.freeIds.size > 0) {
      const id = this.freeIds.values().next().value as number;
      this.freeIds.delete(id);
      this.allocated.add(id);
      return id;
    }

    // Check if we've reached the limit
    if (this.nextId >= this.maxBuffers) {
      return null;
    }

    // Allocate new ID
    const id = this.nextId++;
    this.allocated.add(id);
    return id;
  }

  /**
   * Free a buffer ID for reuse
   * @param id Buffer ID to free
   */
  free(id: number): void {
    if (this.allocated.has(id)) {
      this.allocated.delete(id);
      this.freeIds.add(id);
    }
  }

  /**
   * Check if a buffer ID is currently allocated
   * @param id Buffer ID to check
   * @returns true if allocated, false otherwise
   */
  isAllocated(id: number): boolean {
    return this.allocated.has(id);
  }

  /**
   * Reset allocator to initial state
   * Clears all allocations and free lists
   */
  reset(): void {
    this.nextId = 0;
    this.freeIds.clear();
    this.allocated.clear();
  }

  /**
   * Get count of currently allocated buffer IDs
   * @returns Number of active allocations
   */
  getAllocatedCount(): number {
    return this.allocated.size;
  }

  /**
   * Get all currently allocated buffer IDs
   * @returns Array of allocated buffer IDs
   */
  getAllocatedIds(): number[] {
    return Array.from(this.allocated);
  }
}

/**
 * Audio bus allocator
 * Allocates audio bus IDs for routing audio between synths
 */
export class AudioBusAllocator implements ResourceAllocatorInterface {
  private nextId: number;
  private readonly startId: number;
  private readonly maxId: number;
  private freeIds: Set<number>;
  private allocated: Set<number>;

  /**
   * @param numOutputBusChannels - Number of hardware output channels (default: 8)
   * @param numAudioBusChannels - Number of audio bus channels (default: 128)
   */
  constructor(numOutputBusChannels: number = 8, numAudioBusChannels: number = 128) {
    // Audio buses start after hardware output buses
    this.startId = numOutputBusChannels;
    this.nextId = this.startId;
    this.maxId = numOutputBusChannels + numAudioBusChannels - 1;
    this.freeIds = new Set<number>();
    this.allocated = new Set<number>();
  }

  /**
   * Allocate a new unique audio bus ID
   * @returns Audio bus ID or null if exhausted
   */
  alloc(): number | null {
    // First try to reuse a freed ID
    if (this.freeIds.size > 0) {
      const id = this.freeIds.values().next().value as number;
      this.freeIds.delete(id);
      this.allocated.add(id);
      return id;
    }

    // Check if we've reached the limit
    if (this.nextId > this.maxId) {
      return null;
    }

    // Allocate new ID
    const id = this.nextId++;
    this.allocated.add(id);
    return id;
  }

  /**
   * Free an audio bus ID for reuse
   * @param id Audio bus ID to free
   */
  free(id: number): void {
    if (this.allocated.has(id)) {
      this.allocated.delete(id);
      this.freeIds.add(id);
    }
  }

  /**
   * Check if an audio bus ID is currently allocated
   * @param id Audio bus ID to check
   * @returns true if allocated, false otherwise
   */
  isAllocated(id: number): boolean {
    return this.allocated.has(id);
  }

  /**
   * Reset allocator to initial state
   * Clears all allocations and free lists
   */
  reset(): void {
    this.nextId = this.startId;
    this.freeIds.clear();
    this.allocated.clear();
  }

  /**
   * Get count of currently allocated audio bus IDs
   * @returns Number of active allocations
   */
  getAllocatedCount(): number {
    return this.allocated.size;
  }

  /**
   * Get all currently allocated audio bus IDs
   * @returns Array of allocated audio bus IDs
   */
  getAllocatedIds(): number[] {
    return Array.from(this.allocated);
  }
}

/**
 * Control bus allocator
 * Allocates control bus IDs for modulation and control rate signals
 */
export class ControlBusAllocator implements ResourceAllocatorInterface {
  private nextId: number = 0;
  private readonly maxBuses: number;
  private freeIds: Set<number>;
  private allocated: Set<number>;

  /**
   * @param numControlBusChannels - Number of control bus channels (default: 16384)
   */
  constructor(numControlBusChannels: number = 16384) {
    this.maxBuses = numControlBusChannels;
    this.freeIds = new Set<number>();
    this.allocated = new Set<number>();
  }

  /**
   * Allocate a new unique control bus ID
   * @returns Control bus ID or null if exhausted
   */
  alloc(): number | null {
    // First try to reuse a freed ID
    if (this.freeIds.size > 0) {
      const id = this.freeIds.values().next().value as number;
      this.freeIds.delete(id);
      this.allocated.add(id);
      return id;
    }

    // Check if we've reached the limit
    if (this.nextId >= this.maxBuses) {
      return null;
    }

    // Allocate new ID
    const id = this.nextId++;
    this.allocated.add(id);
    return id;
  }

  /**
   * Free a control bus ID for reuse
   * @param id Control bus ID to free
   */
  free(id: number): void {
    if (this.allocated.has(id)) {
      this.allocated.delete(id);
      this.freeIds.add(id);
    }
  }

  /**
   * Check if a control bus ID is currently allocated
   * @param id Control bus ID to check
   * @returns true if allocated, false otherwise
   */
  isAllocated(id: number): boolean {
    return this.allocated.has(id);
  }

  /**
   * Reset allocator to initial state
   * Clears all allocations and free lists
   */
  reset(): void {
    this.nextId = 0;
    this.freeIds.clear();
    this.allocated.clear();
  }

  /**
   * Get count of currently allocated control bus IDs
   * @returns Number of active allocations
   */
  getAllocatedCount(): number {
    return this.allocated.size;
  }

  /**
   * Get all currently allocated control bus IDs
   * @returns Array of allocated control bus IDs
   */
  getAllocatedIds(): number[] {
    return Array.from(this.allocated);
  }
}
