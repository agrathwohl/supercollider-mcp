/**
 * SuperCollider server discovery service
 * Scans common ports to find running SuperCollider instances
 */

import { createConnection, Socket } from 'net';
import type { SuperColliderStatus } from './types.js';
import { logger } from '../utils/logger.js';

/**
 * Default SuperCollider ports to scan
 * 57110 - scsynth (audio server)
 * 57120 - sclang (language interpreter)
 */
const DEFAULT_PORTS = [57110, 57120];

/**
 * Get ports to scan from environment variable or use defaults
 * Environment variable SC_PORTS can be comma-separated list: "57110,57120,57130"
 */
function getPortsFromEnvironment(): number[] {
  const envPorts = process.env.SC_PORTS;
  if (envPorts) {
    try {
      const ports = envPorts.split(',').map(p => parseInt(p.trim(), 10));
      const validPorts = ports.filter(p => !isNaN(p) && p >= 0 && p <= 65535);
      if (validPorts.length > 0) {
        logger.info(`Using ports from SC_PORTS environment variable: ${validPorts.join(', ')}`);
        return validPorts;
      }
    } catch (error) {
      logger.warn(`Failed to parse SC_PORTS environment variable: ${envPorts}`);
    }
  }
  return DEFAULT_PORTS;
}

/**
 * Discovery options
 */
export interface DiscoveryOptions {
  /** Timeout in milliseconds for each port check (default: 5000) */
  timeout?: number;
  /** Host to check (default: 'localhost') */
  host?: string;
}

/**
 * Attempt to connect to a port to check if SuperCollider is listening
 */
async function checkPort(port: number, options: DiscoveryOptions = {}): Promise<boolean> {
  const { timeout = 5000, host = 'localhost' } = options;

  // Validate port range
  if (port < 0 || port > 65535) {
    logger.warn(`Invalid port ${port}, must be between 0 and 65535`);
    return false;
  }

  return new Promise((resolve) => {
    let resolved = false;

    const socket: Socket = createConnection({ port, host });

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeout);

    socket.on('connect', () => {
      logger.debug(`Port ${port} is open`);
      clearTimeout(timer);
      cleanup();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      cleanup();
      resolve(false);
    });
  });
}

/**
 * Discover SuperCollider servers on the specified ports
 *
 * @param ports - Array of ports to scan (default: from SC_PORTS env or [57110, 57120])
 * @param options - Discovery options
 * @returns SuperColliderStatus if found, null otherwise
 */
export async function discoverSuperCollider(
  ports?: number[],
  options: DiscoveryOptions = {}
): Promise<SuperColliderStatus | null> {
  // Use provided ports, or get from environment, or use defaults
  const portsToScan = ports ?? getPortsFromEnvironment();

  logger.info(`Scanning for SuperCollider on ports: ${portsToScan.join(', ')}`);

  // Scan ports sequentially
  for (const port of portsToScan) {
    const isOpen = await checkPort(port, options);

    if (isOpen) {
      logger.info(`Found SuperCollider on port ${port}`);
      return {
        port,
        status: 'running',
      };
    }
  }

  logger.warn('No SuperCollider instances found');
  return null;
}
