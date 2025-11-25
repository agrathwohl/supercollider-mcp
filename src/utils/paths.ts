/**
 * SuperCollider binary path utilities
 * Resolves paths from environment variables with sensible defaults
 */

import { platform } from 'os';

/**
 * Get sclang interpreter path from environment or use default
 * Platform-aware: returns 'sclang.exe' on Windows, 'sclang' on Unix
 * @returns Resolved path to sclang executable
 */
export function getSclangPath(): string {
  const customPath = process.env.SCLANG_PATH;
  if (customPath) {
    return customPath;
  }

  // Platform-specific defaults
  return platform() === 'win32' ? 'sclang.exe' : 'sclang';
}

/**
 * Get scsynth server path from environment
 * Returns undefined if not set (supercolliderjs will auto-detect)
 * @returns Resolved path to scsynth executable or undefined for auto-detection
 */
export function getScsynthPath(): string | undefined {
  return process.env.SCSYNTH_PATH;
}

/**
 * Get SC IDE path from environment or use default
 * Platform-aware: returns 'scide.exe' on Windows, 'scide' on Unix
 * @returns Resolved path to scide executable
 */
export function getScidePath(): string {
  const customPath = process.env.SCIDE_PATH;
  if (customPath) {
    return customPath;
  }

  // Platform-specific defaults
  return platform() === 'win32' ? 'scide.exe' : 'scide';
}
