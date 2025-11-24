/**
 * Custom error class for SuperCollider-specific errors
 */
export class SuperColliderError extends Error {
  /**
   * @param message - Human-readable error message
   * @param code - Machine-readable error code (e.g., SC_NOT_FOUND)
   * @param originalError - Optional underlying error that caused this error
   */
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SuperColliderError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SuperColliderError);
    }
  }
}

/**
 * Error code constants for common SuperCollider errors
 */

/** SuperCollider server not found or not running */
export const SC_NOT_FOUND = 'SC_NOT_FOUND';

/** Connection attempt timed out */
export const SC_TIMEOUT = 'SC_TIMEOUT';

/** Failed to establish connection to SuperCollider */
export const SC_CONNECTION_FAILED = 'SC_CONNECTION_FAILED';

/** Received invalid or unexpected response from SuperCollider */
export const SC_INVALID_RESPONSE = 'SC_INVALID_RESPONSE';

/** Resource exhausted (nodes, buffers, or buses) */
export const SC_RESOURCE_EXHAUSTED = 'SC_RESOURCE_EXHAUSTED';

/** SynthDef compilation failed (syntax error or sclang error) */
export const SC_COMPILATION_FAILED = 'SC_COMPILATION_FAILED';

/** Quark operation failed (install, remove, update, or list) */
export const SC_QUARK_ERROR = 'SC_QUARK_ERROR';

/** Buffer operation failed (allocation, loading, or recording) */
export const SC_BUFFER_ERROR = 'SC_BUFFER_ERROR';
