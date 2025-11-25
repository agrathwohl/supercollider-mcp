/**
 * sclang integration for quark management and SynthDef compilation
 * Spawns sclang interpreter process and parses SuperCollider code output
 */

import { spawn, type ChildProcess } from 'child_process';
import type { QuarkInfo, SynthDefParameter } from './types.js';
import { SuperColliderError, SC_QUARK_ERROR, SC_COMPILATION_FAILED } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { getSclangPath } from '../utils/paths.js';

/**
 * Track active sclang processes for cleanup
 */
const activeSclangProcesses = new Set<ChildProcess>();

/**
 * Kill all tracked sclang processes
 * Called during shutdown to prevent orphaned processes
 * @returns Promise that resolves when all processes are killed
 */
export async function killAllSclangProcesses(): Promise<void> {
  const count = activeSclangProcesses.size;
  if (count === 0) {
    logger.debug('No active sclang processes to kill');
    return;
  }

  logger.info(`Killing ${count} active sclang processes`);

  const killPromises: Promise<void>[] = [];

  for (const proc of activeSclangProcesses) {
    killPromises.push(
      new Promise<void>((resolve) => {
        if (!proc.pid || proc.killed) {
          resolve();
          return;
        }

        // Wait for exit or timeout
        const exitHandler = () => {
          clearTimeout(timeout);
          resolve();
        };

        const timeout = setTimeout(() => {
          proc.removeListener('exit', exitHandler);
          logger.warn(`Process ${proc.pid} did not exit within 1 second`);
          resolve();
        }, 1000); // 1 second max wait per process

        proc.once('exit', exitHandler);

        try {
          process.kill(-proc.pid, 'SIGKILL'); // Kill process group
          logger.debug(`Sent SIGKILL to process group ${proc.pid}`);
        } catch (error) {
          logger.warn(`Failed to kill process group -${proc.pid}, trying direct kill`);
          try {
            proc.kill('SIGKILL');
          } catch {
            // Process already dead
          }
          clearTimeout(timeout);
          resolve();
        }
      })
    );
  }

  await Promise.all(killPromises);
  activeSclangProcesses.clear();
  logger.info('All sclang processes terminated');
}

/**
 * Execute SuperCollider code via sclang interpreter
 * @param code SuperCollider language code to execute
 * @param timeoutMs Timeout in milliseconds (default: 30000)
 * @returns stdout from sclang execution
 * @throws SuperColliderError on execution failure or timeout
 */
export async function executeSclang(
  code: string,
  timeoutMs: number = 30000
): Promise<string> {
  const fs = await import('fs/promises');
  const os = await import('os');
  const path = await import('path');
  const { randomBytes } = await import('crypto');

  let childProc: ChildProcess | undefined;
  let timeoutHandle: NodeJS.Timeout | undefined;
  let cleanupPromise: Promise<void> | undefined;
  let tmpFile: string | undefined;
  let signalHandler: (() => void) | undefined;

  const cleanup = async (proc: ChildProcess, killProcess = false): Promise<void> => {
    // Return existing cleanup promise if already in progress
    if (cleanupPromise) {
      return cleanupPromise;
    }

    cleanupPromise = (async () => {
      // Always clear timeout regardless of killProcess flag
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }

      activeSclangProcesses.delete(proc);

      if (killProcess && proc.pid && !proc.killed) {
        try {
          process.kill(-proc.pid, 'SIGKILL');
        } catch (error) {
          logger.debug(`Process ${proc.pid} kill failed, trying direct kill`);
          try {
            proc.kill('SIGKILL');
          } catch {
            // Process already terminated
          }
        }
      }

      // Clean up temporary file
      if (tmpFile) {
        const tmpFileToDelete = tmpFile;
        tmpFile = undefined; // Prevent double deletion
        try {
          await fs.unlink(tmpFileToDelete);
          logger.debug(`Cleaned up temp file: ${tmpFileToDelete}`);
        } catch {
          // Ignore cleanup errors
        }
      }

      // Remove signal handlers if registered
      if (signalHandler) {
        process.off('SIGTERM', signalHandler);
        process.off('SIGINT', signalHandler);
        signalHandler = undefined;
      }
    })();

    return cleanupPromise;
  };

  try {
    logger.debug(`Executing sclang code: ${code.slice(0, 100)}...`);

    const sclangPath = getSclangPath();

    // Write code to temporary file (sclang needs a file to execute with 0.exit)
    // Use crypto randomBytes for guaranteed uniqueness under high concurrency
    const tmpDir = os.tmpdir();
    const uniqueId = `${Date.now()}-${randomBytes(8).toString('hex')}`;
    tmpFile = path.join(tmpDir, `sclang-${uniqueId}.sc`);
    await fs.writeFile(tmpFile, code, 'utf-8');
    logger.debug(`Created temp file: ${tmpFile}`);

    // Spawn sclang with -D flag (disables default synth definitions for faster startup)
    // Execute the temporary file
    // detached: true creates new process group for proper cleanup
    childProc = spawn(sclangPath, ['-D', tmpFile], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Verify process spawned successfully before tracking
    if (!childProc || !childProc.pid) {
      // Clean up temp file immediately since childProc is invalid
      try {
        await fs.unlink(tmpFile);
      } catch {
        // Ignore cleanup errors
      }
      throw new SuperColliderError(
        'Failed to spawn sclang process (no PID assigned)',
        SC_COMPILATION_FAILED
      );
    }

    activeSclangProcesses.add(childProc);
    logger.debug(`Spawned sclang process ${childProc.pid}`);

    // Register signal handlers for graceful shutdown
    signalHandler = () => {
      if (childProc) {
        logger.warn('Received termination signal, cleaning up sclang process');
        cleanup(childProc, true).catch(() => {});
      }
    };
    process.once('SIGTERM', signalHandler);
    process.once('SIGINT', signalHandler);

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        if (childProc) {
          logger.warn(`sclang process ${childProc.pid} timed out`);
          cleanup(childProc, true); // Force kill on timeout
        }
        reject(new Error(`sclang execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Collect stdout/stderr
    const resultPromise = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      childProc!.stdout?.on('data', (data) => { stdout += data.toString(); });
      childProc!.stderr?.on('data', (data) => { stderr += data.toString(); });

      childProc!.on('error', (error) => {
        cleanup(childProc!, false);
        reject(error);
      });

      childProc!.on('exit', (code) => {
        cleanup(childProc!, false);
        if (code === 0 || code === null) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`sclang exited with code ${code}`));
        }
      });
    });

    const result = await Promise.race([resultPromise, timeoutPromise]);

    // Don't check stderr for "ERROR" - sclang prints warnings/non-fatal errors there
    // Only actual command failures (caught in catch block) should throw

    logger.debug(`sclang output: ${result.stdout.slice(0, 200)}...`);
    return result.stdout;
  } catch (error) {
    // Clean up on error (cleanup function is idempotent)
    if (childProc) {
      await cleanup(childProc, true);
    }

    if (error instanceof SuperColliderError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for timeout
    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      throw new SuperColliderError(
        `sclang execution timed out after ${timeoutMs}ms`,
        SC_COMPILATION_FAILED,
        error instanceof Error ? error : undefined
      );
    }

    // Check for sclang not found
    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      const sclangPath = getSclangPath();
      throw new SuperColliderError(
        `sclang interpreter not found at '${sclangPath}'. ` +
        'Please ensure SuperCollider is installed and in PATH, ' +
        'or set SCLANG_PATH environment variable to the sclang executable path.',
        SC_COMPILATION_FAILED,
        error instanceof Error ? error : undefined
      );
    }

    throw new SuperColliderError(
      `Failed to execute sclang: ${errorMessage}`,
      SC_COMPILATION_FAILED,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse quark list output from Quarks.installed
 * @param output stdout from Quarks.installed.do({ |q| q.name.postln; q.version.postln; ... })
 * @returns Array of QuarkInfo objects
 */
export function parseQuarkList(output: string): QuarkInfo[] {
  const quarks: QuarkInfo[] = [];
  const lines = output.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Parse output in groups of 4 lines: name, version, description, installed
  // Format from sclang:
  // -> quark_name
  // -> version_string
  // -> description_text
  // -> true/false
  for (let i = 0; i < lines.length; i += 4) {
    if (i + 3 >= lines.length) break;

    const name = lines[i].replace(/^->\s*/, '');
    const version = lines[i + 1].replace(/^->\s*/, '');
    const description = lines[i + 2].replace(/^->\s*/, '');
    const installedStr = lines[i + 3].replace(/^->\s*/, '').toLowerCase();

    quarks.push({
      name,
      version,
      description,
      installed: installedStr === 'true',
    });
  }

  return quarks;
}

/**
 * Get list of installed quarks
 * @returns Array of installed quark information
 */
export async function listInstalledQuarks(): Promise<QuarkInfo[]> {
  const code = `
    Quarks.installed.do({ |q|
      q.name.postln;
      q.version.asString.postln;
      (q.summary ? "No description").postln;
      true.postln;
    });
    0.exit;
  `;

  try {
    const output = await executeSclang(code);
    return parseQuarkList(output);
  } catch (error) {
    throw new SuperColliderError(
      'Failed to list installed quarks',
      SC_QUARK_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Install a quark by name
 * @param quarkName Name of the quark to install
 * @returns Success message
 */
export async function installQuark(quarkName: string): Promise<string> {
  const code = `
    Quarks.install("${quarkName}");
    "Quark '${quarkName}' installed successfully".postln;
    0.exit;
  `;

  try {
    const output = await executeSclang(code);

    if (output.includes('ERROR') || output.includes('failed')) {
      throw new SuperColliderError(
        `Failed to install quark '${quarkName}': ${output}`,
        SC_QUARK_ERROR
      );
    }

    return `Quark '${quarkName}' installed successfully`;
  } catch (error) {
    if (error instanceof SuperColliderError) {
      throw error;
    }

    throw new SuperColliderError(
      `Failed to install quark '${quarkName}'`,
      SC_QUARK_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Remove a quark by name
 * @param quarkName Name of the quark to remove
 * @returns Success message
 */
export async function removeQuark(quarkName: string): Promise<string> {
  const code = `
    Quarks.uninstall("${quarkName}");
    "Quark '${quarkName}' removed successfully".postln;
    0.exit;
  `;

  try {
    const output = await executeSclang(code);

    if (output.includes('ERROR') || output.includes('failed')) {
      throw new SuperColliderError(
        `Failed to remove quark '${quarkName}': ${output}`,
        SC_QUARK_ERROR
      );
    }

    return `Quark '${quarkName}' removed successfully`;
  } catch (error) {
    if (error instanceof SuperColliderError) {
      throw error;
    }

    throw new SuperColliderError(
      `Failed to remove quark '${quarkName}'`,
      SC_QUARK_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse SynthDef parameter information from SynthDescLib output
 * @param output stdout from SynthDescLib.global.at(\\defName).controls
 * @returns Array of SynthDefParameter objects
 */
export function parseSynthDefParameters(output: string): SynthDefParameter[] {
  const parameters: SynthDefParameter[] = [];
  const lines = output.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Parse output format: ControlName(paramName, index, defaultValue)
  // Example: ControlName(freq, 0, 440.0)
  const controlRegex = /ControlName\((\w+),\s*(\d+),\s*([\d.-]+)\)/g;

  for (const line of lines) {
    let match;
    while ((match = controlRegex.exec(line)) !== null) {
      parameters.push({
        name: match[1],
        index: parseInt(match[2], 10),
        defaultValue: parseFloat(match[3]),
      });
    }
  }

  return parameters;
}

/**
 * Get SynthDef parameter information
 * @param defName SynthDef name
 * @returns Array of parameter definitions
 */
export async function getSynthDefParameters(defName: string): Promise<SynthDefParameter[]> {
  const code = `
    var desc = SynthDescLib.global.at('\\${defName}');
    if (desc.isNil) {
      "ERROR: SynthDef '${defName}' not found".postln;
      1.exit;
    } {
      desc.controls.do({ |c|
        ("ControlName(" ++ c.name ++ ", " ++ c.index ++ ", " ++ c.defaultValue ++ ")").postln;
      });
      0.exit;
    };
  `;

  try {
    const output = await executeSclang(code);

    if (output.includes('ERROR: SynthDef')) {
      throw new SuperColliderError(
        `SynthDef '${defName}' not found`,
        SC_COMPILATION_FAILED
      );
    }

    return parseSynthDefParameters(output);
  } catch (error) {
    if (error instanceof SuperColliderError) {
      throw error;
    }

    throw new SuperColliderError(
      `Failed to get SynthDef '${defName}' parameters`,
      SC_COMPILATION_FAILED,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Compile SynthDef source code and return binary data
 * Uses sclang to compile and writeDefFile, then reads the binary
 *
 * @param synthDefSource SuperCollider SynthDef source code
 * @param defName Expected SynthDef name (for validation)
 * @returns Compiled SynthDef binary data as Uint8Array
 * @throws SuperColliderError on compilation failure
 */
export async function compileSynthDef(
  synthDefSource: string,
  defName: string
): Promise<Uint8Array> {
  const fs = await import('fs/promises');
  const os = await import('os');
  const path = await import('path');

  // Create temporary directory for .scsyndef file
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sc-synthdef-'));
  const synthDefPath = path.join(tmpDir, `${defName}.scsyndef`);

  const code = `
    (
      ${synthDefSource}
    ).writeDefFile("${tmpDir}");
    "SYNTHDEF_COMPILED".postln;
    0.exit;
  `;

  try {
    logger.debug(`Compiling SynthDef '${defName}' to: ${synthDefPath}`);
    const output = await executeSclang(code);

    if (!output.includes('SYNTHDEF_COMPILED')) {
      throw new SuperColliderError(
        `SynthDef compilation failed: ${output}`,
        SC_COMPILATION_FAILED
      );
    }

    // Read the compiled .scsyndef file
    const synthDefData = await fs.readFile(synthDefPath);

    // Clean up temporary directory
    await fs.rm(tmpDir, { recursive: true, force: true });

    logger.debug(`Successfully compiled SynthDef '${defName}', size: ${synthDefData.length} bytes`);
    return new Uint8Array(synthDefData);
  } catch (error) {
    // Clean up on error
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    if (error instanceof SuperColliderError) {
      throw error;
    }

    throw new SuperColliderError(
      `Failed to compile SynthDef '${defName}'`,
      SC_COMPILATION_FAILED,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Compile multiple SynthDefs in a single sclang session
 * More efficient than individual compilation for batch operations
 *
 * @param synthDefs Array of {name, source} objects
 * @returns Array of {name, success, data?, error?} results
 */
export async function compileSynthDefsBatch(
  synthDefs: Array<{ name: string; source: string }>
): Promise<Array<{ name: string; success: boolean; data?: Uint8Array; error?: string }>> {
  const fs = await import('fs/promises');
  const os = await import('os');
  const path = await import('path');

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sc-synthdefs-'));
  const results: Array<{ name: string; success: boolean; data?: Uint8Array; error?: string }> = [];

  // Build sclang code to compile all SynthDefs
  const synthDefCodes = synthDefs.map(({ source }, idx) =>
    `("Compiling SynthDef ${idx + 1}").postln; (${source}).writeDefFile("${tmpDir}");`
  ).join('\n');

  const code = `
    (
      ${synthDefCodes}
      "ALL_SYNTHDEFS_COMPILED".postln;
      0.exit;
    )
  `;

  try {
    logger.debug(`Batch compiling ${synthDefs.length} SynthDefs to: ${tmpDir}`);
    const output = await executeSclang(code, 60000); // Longer timeout for batch

    if (!output.includes('ALL_SYNTHDEFS_COMPILED')) {
      throw new SuperColliderError(
        `Batch SynthDef compilation failed: ${output}`,
        SC_COMPILATION_FAILED
      );
    }

    // Read each compiled .scsyndef file
    for (const { name } of synthDefs) {
      const synthDefPath = path.join(tmpDir, `${name}.scsyndef`);

      try {
        const synthDefData = await fs.readFile(synthDefPath);
        results.push({
          name,
          success: true,
          data: new Uint8Array(synthDefData),
        });
        logger.debug(`Successfully compiled SynthDef '${name}', size: ${synthDefData.length} bytes`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          name,
          success: false,
          error: `Failed to read compiled SynthDef: ${errorMessage}`,
        });
        logger.error(`Failed to read SynthDef '${name}':`, error);
      }
    }

    // Clean up temporary directory
    await fs.rm(tmpDir, { recursive: true, force: true });

    return results;
  } catch (error) {
    // Clean up on error
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Mark all as failed if sclang execution fails
    for (const { name } of synthDefs) {
      results.push({
        name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }
}
