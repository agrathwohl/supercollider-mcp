/**
 * Logger utility for MCP server
 * CRITICAL: Must use console.error() only, never console.log()
 * Reason: MCP uses stdio transport, console.log() breaks protocol
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/**
 * Create a stderr-only logger for MCP compatibility
 * @param level - Minimum log level to output (default: 'info')
 * @returns Logger instance that writes to stderr only
 */
export function createLogger(level: LogLevel = 'info'): Logger {
  const minLevel = LOG_LEVELS[level];

  const log = (logLevel: LogLevel, message: string, ...args: unknown[]): void => {
    if (LOG_LEVELS[logLevel] > minLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelStr = logLevel.toUpperCase().padEnd(5);

    // Format error objects with stack traces
    const formattedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return {
          message: arg.message,
          stack: arg.stack,
          ...(arg as unknown as Record<string, unknown>),
        };
      }
      return arg;
    });

    // CRITICAL: Only use console.error, never console.log
    console.error(`${timestamp} [${levelStr}]`, message, ...formattedArgs);
  };

  return {
    error: (message: string, ...args: unknown[]) => log('error', message, ...args),
    warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
    info: (message: string, ...args: unknown[]) => log('info', message, ...args),
    debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
  };
}

/**
 * Default logger instance for convenience
 */
export const logger = createLogger();
