import { z } from 'zod';
import type { SidofunCore } from '../core/sidofun-core.js';
import { browserIdValues } from '../core/command-schemas.js';

export const MCP_PROTOCOL_VERSION = '2025-11-25';
export const SUPPORTED_PROTOCOL_VERSIONS = [MCP_PROTOCOL_VERSION, '2025-06-18', '2025-03-26', '2024-11-05'] as const;

const desktopToolActions = [
  'click',
  'move_mouse',
  'drag_mouse',
  'scroll',
  'type',
  'key_press',
  'key_toggle',
  'screenshot',
  'screenshot_win32',
  'screen_size',
  'mouse_position',
  'active_window',
  'get_window_rect',
  'move_window',
  'resize_window',
  'focus_window',
  'maximize_window',
  'minimize_window',
  'restore_window',
  'launch_application',
  'set_mouse_delay',
  'set_keyboard_delay',
  'type_delayed',
  'highlight',
  'trace_start',
  'trajectory_start',
  'opencli_status',
  'opencli_doctor',
  'opencli_sites',
  'opencli_commands',
  'opencli_run',
  'opencli_workspace_list',
  'opencli_workspace_get',
  'opencli_workspace_set',
  'opencli_workspace_clear',
  'opencli_workspace_bind_session',
  'opencli_workspace_unbind_session',
  'opencli_workspace_session',
  'twitter_search',
  'twitter_timeline',
  'twitter_bookmarks',
  'twitter_post',
  'local_coder_list',
  'local_coder_status',
  'local_coder_open',
  'local_coder_focus',
  'local_coder_close',
  'local_coder_maximize',
  'local_coder_minimize',
  'local_coder_restore',
  'local_coder_move',
  'local_coder_resize',
  'local_coder_run'
] as const;

const browserToolActions = [
  'browser_list',
  'browser_info',
  'browser_profiles',
  'browser_launch_plan',
  'browser_launch',
  'browser_windows',
  'browser_focus_window',
  'browser_runtime_create',
  'browser_runtime_list',
  'browser_runtime_info',
  'browser_runtime_close',
  'browser_page_list',
  'browser_page_open',
  'browser_page_info',
  'browser_page_navigate',
  'browser_page_click',
  'browser_page_fill',
  'browser_page_press',
  'browser_page_wait_for',
  'browser_page_evaluate',
  'browser_page_content',
  'browser_page_screenshot',
  'browser_page_pdf',
  'browser_page_download_url',
  'browser_page_network_events',
  'browser_page_events',
  'browser_page_console_events',
  'browser_page_clear_events',
  'browser_page_wait_for_network',
  'browser_page_close'
] as const;

const terminalToolActions = [
  'spawn',
  'attach',
  'list',
  'info',
  'exec',
  'type',
  'press',
  'screenshot',
  'break',
  'eof',
  'close',
  'key_toggle',
  'new_tab',
  'next_tab',
  'prev_tab',
  'split_vertical',
  'split_horizontal',
  'pane_up',
  'pane_down',
  'pane_left',
  'pane_right'
] as const;

const InitializeParamsSchema = z.object({
  protocolVersion: z.string(),
  capabilities: z.record(z.string(), z.unknown()).optional(),
  clientInfo: z.object({
    name: z.string(),
    version: z.string().optional()
  }).optional()
});

const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional().default({})
});

export type JsonRpcId = string | number;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class SidofunMcpServer {
  private initialized = false;
  private mcpSessionId?: string;
  private mcpSessionName?: string;
  private idleTimeoutMs?: number;
  private idleTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly core: Pick<SidofunCore, 'executeAutomationAction' | 'executeCMDAction'>,
    private readonly sessionManager?: {
      createSession: (options?: { clientKind?: 'mcp'; name?: string }) => { id: string };
      touchSession: (sessionId: string) => unknown;
      closeSession: (sessionId: string, options?: { cleanupOwnedResources?: boolean }) => Promise<unknown>;
    },
    options?: { idleTimeoutMs?: number }
  ) {
    this.idleTimeoutMs = options?.idleTimeoutMs;
  }

  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse | undefined> {
    if (request.jsonrpc !== '2.0') {
      return this.error(request.id ?? null, -32600, 'Invalid Request', 'jsonrpc must be 2.0');
    }

    if (!request.method) {
      return this.error(request.id ?? null, -32600, 'Invalid Request', 'method is required');
    }

    if (request.method === 'notifications/initialized') {
      this.touchMcpSession();
      this.initialized = true;
      return undefined;
    }

    if (request.method !== 'initialize' && !this.initialized) {
      return this.error(request.id ?? null, -32002, 'Server not initialized');
    }

    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        case 'ping':
          this.touchMcpSession();
          return this.result(request.id ?? null, {});
        case 'tools/list':
          this.touchMcpSession();
          return this.result(request.id ?? null, {
            tools: this.listTools()
          });
        case 'tools/call':
          this.touchMcpSession();
          return await this.handleToolCall(request);
        default:
          return this.error(request.id ?? null, -32601, `Method not found: ${request.method}`);
      }
    } catch (error: any) {
      return this.error(request.id ?? null, -32603, error?.message || 'Internal error');
    }
  }

  private handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
    const params = InitializeParamsSchema.parse(request.params ?? {});
    if (!SUPPORTED_PROTOCOL_VERSIONS.includes(params.protocolVersion as typeof SUPPORTED_PROTOCOL_VERSIONS[number])) {
      return this.error(
        request.id ?? null,
        -32602,
        `Unsupported protocol version: ${params.protocolVersion}`,
        { supported: [...SUPPORTED_PROTOCOL_VERSIONS] }
      );
    }

    this.initialized = true;
    this.mcpSessionName = params.clientInfo?.name || 'mcp-client';
    this.ensureMcpSession();

    return this.result(request.id ?? null, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {
          listChanged: false
        }
      },
      serverInfo: {
        name: 'sidofun',
        version: '1.0.0'
      },
      sessionInfo: this.mcpSessionId ? { sessionId: this.mcpSessionId } : undefined
    });
  }

  private async handleToolCall(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = ToolCallSchema.parse(request.params ?? {});
    const args = params.arguments;
    const toolParams = (args.params ?? {}) as Record<string, unknown>;

    switch (params.name) {
      case 'sidofun_desktop': {
        const action = z.enum(desktopToolActions).parse(args.action);
        const ownedParams = this.injectOwnerSession(action, toolParams);
        return this.toolResult(request.id ?? null, await this.core.executeAutomationAction(action, ownedParams));
      }
      case 'sidofun_browser': {
        const action = z.enum(browserToolActions).parse(args.action);
        const ownedParams = this.injectOwnerSession(action, toolParams);
        return this.toolResult(request.id ?? null, await this.core.executeAutomationAction(action, ownedParams));
      }
      case 'sidofun_terminal': {
        const action = z.enum(terminalToolActions).parse(args.action);
        const ownedParams = this.injectOwnerSession(`cmd_${action}`, toolParams);
        return this.toolResult(request.id ?? null, await this.core.executeCMDAction(`cmd_${action}`, ownedParams));
      }
      default:
        return this.error(request.id ?? null, -32602, `Unknown tool: ${params.name}`);
    }
  }

  async shutdown(): Promise<void> {
    this.clearIdleTimer();
    if (this.sessionManager && this.mcpSessionId) {
      await this.sessionManager.closeSession(this.mcpSessionId, { cleanupOwnedResources: true });
      this.mcpSessionId = undefined;
    }
  }

  private ensureMcpSession(): void {
    if (!this.sessionManager || this.mcpSessionId) {
      this.resetIdleTimer();
      return;
    }

    const session = this.sessionManager.createSession({
      clientKind: 'mcp',
      name: this.mcpSessionName || 'mcp-client'
    });
    this.mcpSessionId = session.id;
    this.resetIdleTimer();
  }

  private touchMcpSession(): void {
    if (!this.sessionManager) {
      return;
    }
    this.ensureMcpSession();
    if (this.mcpSessionId) {
      this.sessionManager.touchSession(this.mcpSessionId);
      this.resetIdleTimer();
    }
  }

  private resetIdleTimer(): void {
    if (!this.idleTimeoutMs || this.idleTimeoutMs <= 0 || !this.sessionManager || !this.mcpSessionId) {
      return;
    }

    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      const sessionId = this.mcpSessionId;
      this.mcpSessionId = undefined;
      if (!sessionId) {
        return;
      }
      void this.sessionManager!.closeSession(sessionId, { cleanupOwnedResources: true });
    }, this.idleTimeoutMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  private injectOwnerSession(action: string, params: Record<string, unknown>): Record<string, unknown> {
    if (!this.mcpSessionId) {
      return params;
    }

    const ownerAwareActions = new Set([
      'browser_runtime_create',
      'browser_page_open',
      'desktop_scope_create',
      'trace_start',
      'trajectory_start',
      'terminal_spawn',
      'cmd_spawn'
    ]);

    if (!ownerAwareActions.has(action)) {
      return params;
    }

    return {
      ...params,
      ownerSessionId: this.mcpSessionId
    };
  }

  private listTools(): Array<Record<string, unknown>> {
    return [
      {
        name: 'sidofun_desktop',
        description: 'Run desktop, screen, mouse, keyboard, and window automation actions on the local machine.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [...desktopToolActions]
            },
            params: {
              type: 'object',
              additionalProperties: true
            }
          },
          required: ['action']
        }
      },
      {
        name: 'sidofun_browser',
        description: 'Run browser discovery, launch, runtime, and page automation actions.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [...browserToolActions]
            },
            params: {
              type: 'object',
              additionalProperties: true,
              properties: {
                browser: {
                  type: 'string',
                  enum: [...browserIdValues]
                }
              }
            }
          },
          required: ['action']
        }
      },
      {
        name: 'sidofun_terminal',
        description: 'Run shared terminal automation actions for CMD and Windows Terminal sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [...terminalToolActions]
            },
            params: {
              type: 'object',
              additionalProperties: true
            }
          },
          required: ['action']
        }
      }
    ];
  }

  private toolResult(id: JsonRpcId | null, result: unknown): JsonRpcResponse {
    return this.result(id, {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ],
      structuredContent: result,
      isError: false
    });
  }

  private result(id: JsonRpcId | null, result: unknown): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  private error(id: JsonRpcId | null, code: number, message: string, data?: unknown): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
  }
}
