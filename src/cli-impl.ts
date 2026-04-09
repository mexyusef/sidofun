/**
 * Sidofun Desktop CLI - IPC Implementation
 *
 * Provides stdin/stdout IPC interface for Python client integration.
 * Reads JSON request lines from stdin, executes actions, writes JSON responses to stdout.
 *
 * Note: console.log redirection happens in cli-ipc.ts BEFORE importing this file
 */

import { PowerShellSessionService } from './services/powershell/powershell-session-service.js';
import { createPowerShellHandlers } from './services/powershell/powershell-handlers.js';
import { ERROR_CODE, mapErrorToCode } from './config/index.js';
import { SidofunCore } from './core/sidofun-core.js';
import type { SidofunRuntime } from './runtime/sidofun-runtime.js';
import { createSidofunRuntime } from './runtime/sidofun-runtime.js';
import { z } from 'zod';

// ==================== Types ====================

interface IPCRequest {
  id: string | number;
  action: string;
  params?: Record<string, any>;
}

interface IPCResponse {
  id: string | number;
  success: boolean;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

const IPCRequestSchema = z.object({
  id: z.union([z.string(), z.number()]),
  action: z.string().min(1),
  params: z.record(z.string(), z.any()).optional().default({})
});

// ==================== Error Codes ====================
// Use shared error codes from config
const ErrorCode = ERROR_CODE;

// ==================== CLI Server ====================

class CLIServer {
  private runtime: SidofunRuntime;
  private psService: PowerShellSessionService;
  private psHandlers: ReturnType<typeof createPowerShellHandlers>;
  private core: SidofunCore;

  constructor() {
    this.runtime = createSidofunRuntime();
    this.psService = new PowerShellSessionService(this.runtime.nutJs);
    this.psHandlers = createPowerShellHandlers(this.psService);
    this.core = this.runtime.core;
  }

  /**
   * Send a response to stdout
   */
  private sendResponse(id: string | number, success: boolean, data: { result?: any; error?: any }): void {
    const response: IPCResponse = {
      id,
      success,
      ...data
    };
    // Use global jsonLog function (original console.log) to output JSON to stdout
    (globalThis as any).jsonLog(JSON.stringify(response));
  }

  /**
   * Send an error response
   */
  private sendError(id: string | number, code: string, message: string, details?: any): void {
    this.sendResponse(id, false, {
      error: { code, message, details }
    });
  }

  /**
   * Process a single request
   */
  async processRequest(request: IPCRequest): Promise<void> {
    const { id, action, params = {} } = request;

    try {
      let result: any;

      // Route to appropriate handler
      if (action.startsWith('pwsh_')) {
        result = await this.psHandlers.handlePowerShellAction(action, params);
      } else if (action.startsWith('cmd_')) {
        result = await this.core.executeCMDAction(action, params);
      } else {
        result = await this.core.executeAutomationAction(action, params);
      }

      this.sendResponse(id, true, { result });
    } catch (error: any) {
      const code = this.mapErrorToCode(error.message);
      this.sendError(id, code, error.message, error.details);
    }
  }

  /**
   * Map error message to error code
   */
  private mapErrorToCode(message: string): string {
    return mapErrorToCode(message);
  }

  /**
   * Start the CLI server
   */
  async start(): Promise<void> {
    // Send ready message (optional handshake)
    console.error('🚀 Sidofun Desktop CLI IPC server ready');
    console.error('📡 Listening for JSON requests on stdin...');

    // Read from stdin line by line
    for await (const line of console) {
      try {
        const request = IPCRequestSchema.parse(JSON.parse(line)) as IPCRequest;
        await this.processRequest(request);
      } catch (error: any) {
        // Send parse error response
        const response: IPCResponse = {
          id: 0,
          success: false,
          error: {
            code: error?.name === 'ZodError' ? ErrorCode.INVALID_PARAMS : ErrorCode.PARSE_ERROR,
            message: error?.name === 'ZodError' ? 'Invalid IPC request payload' : 'Failed to parse request as JSON',
            details: error instanceof Error ? error.message : String(error)
          }
        };
        (globalThis as any).jsonLog(JSON.stringify(response));
      }
    }
  }

  /**
   * Shutdown the CLI server
   */
  shutdown(): void {
    console.error('🛑 Shutting down CLI IPC server...');
    // Close all CMD sessions
    const sessions = this.runtime.cmdService.listSessions();
    for (const session of sessions) {
      try {
        this.runtime.cmdService.close(session.id);
      } catch {
        // Ignore errors during shutdown
      }
    }
    this.runtime.browserAutomationService.shutdown();
    void this.runtime.browserPlaywrightService.shutdown();
  }
}

// ==================== Main ====================

async function main() {
  const server = new CLIServer();

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.shutdown();
    process.exit(0);
  });

  // Start the server
  await server.start();
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { CLIServer };
