/**
 * Type declarations for supercolliderjs module
 * The package has incomplete TypeScript definitions, so we define the parts we use
 */

declare module 'supercolliderjs' {
  /**
   * Options for booting a SuperCollider server
   */
  export interface BootOptions {
    /** Path to scsynth executable (optional, auto-detected if not provided) */
    scsynth?: string;
    /** Port number as string */
    serverPort?: string;
    /** Enable debug logging */
    debug?: boolean;
    /** Echo scsynth output to console */
    echo?: boolean;
  }

  /**
   * SuperCollider Server instance returned by boot()
   */
  export interface Server {
    /** Send OSC message to server */
    sendMsg(msg: Array<string | number>): Promise<any[]>;
    /** Quit the server */
    quit(): Promise<void>;
  }

  /**
   * Server management API
   */
  export const server: {
    /**
     * Boot a SuperCollider server (scsynth process)
     * @param options Boot configuration options
     * @returns Promise resolving to Server instance
     */
    boot(options?: BootOptions): Promise<Server>;
  };
}
