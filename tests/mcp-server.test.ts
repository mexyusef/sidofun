import { describe, expect, test } from 'bun:test';
import { SidofunMcpServer } from '../src/mcp/mcp-protocol-server.js';
import { setTimeout as delay } from 'node:timers/promises';

describe('SidofunMcpServer', () => {
  test('negotiates initialize and lists tools', async () => {
    const sessionManager = {
      createSession: () => ({ id: 'mcp_session_1' }),
      touchSession: () => undefined,
      closeSession: async () => ({ closed: true })
    };
    const server = new SidofunMcpServer({
      executeAutomationAction: async () => ({}),
      executeCMDAction: async () => ({})
    } as any, sessionManager as any);

    const initResponse = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        clientInfo: { name: 'test-client' }
      }
    });

    expect(initResponse?.error).toBeUndefined();
    expect((initResponse?.result as any).protocolVersion).toBe('2025-11-25');
    expect((initResponse?.result as any).sessionInfo).toEqual({ sessionId: 'mcp_session_1' });

    const toolsResponse = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    expect((toolsResponse?.result as any).tools.map((tool: any) => tool.name)).toEqual([
      'sidofun_desktop',
      'sidofun_browser',
      'sidofun_terminal'
    ]);
  });

  test('routes tool calls through the shared core', async () => {
    const calls: Array<{ kind: string; action: string; params: Record<string, unknown> }> = [];
    const sessionManager = {
      createSession: () => ({ id: 'mcp_session_1' }),
      touchSession: () => undefined,
      closeSession: async () => ({ closed: true })
    };
    const server = new SidofunMcpServer({
      executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
        calls.push({ kind: 'automation', action, params });
        return { ok: true, action, params };
      },
      executeCMDAction: async (action: string, params: Record<string, unknown>) => {
        calls.push({ kind: 'cmd', action, params });
        return { ok: true, action, params };
      }
    } as any, sessionManager as any);

    await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        clientInfo: { name: 'test-client' }
      }
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'sidofun_terminal',
        arguments: {
          action: 'spawn',
          params: { title: 'demo' }
        }
      }
    });

    expect(calls).toEqual([
      {
        kind: 'cmd',
        action: 'cmd_spawn',
        params: { title: 'demo', ownerSessionId: 'mcp_session_1' }
      }
    ]);
    expect((response?.result as any).structuredContent).toEqual({
      ok: true,
      action: 'cmd_spawn',
      params: { title: 'demo', ownerSessionId: 'mcp_session_1' }
    });
  });

  test('injects MCP owner session for browser page creation', async () => {
    const calls: Array<{ kind: string; action: string; params: Record<string, unknown> }> = [];
    const sessionManager = {
      createSession: () => ({ id: 'mcp_session_1' }),
      touchSession: () => undefined,
      closeSession: async () => ({ closed: true })
    };
    const server = new SidofunMcpServer({
      executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
        calls.push({ kind: 'automation', action, params });
        return { ok: true, action, params };
      },
      executeCMDAction: async () => ({})
    } as any, sessionManager as any);

    await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        clientInfo: { name: 'test-client' }
      }
    });

    await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'sidofun_browser',
        arguments: {
          action: 'browser_page_open',
          params: { runtimeId: 'runtime_1', url: 'https://example.com' }
        }
      }
    });

    expect(calls).toEqual([
      {
        kind: 'automation',
        action: 'browser_page_open',
        params: {
          runtimeId: 'runtime_1',
          url: 'https://example.com',
          ownerSessionId: 'mcp_session_1'
        }
      }
    ]);
  });

  test('injects MCP owner session for trace start', async () => {
    const calls: Array<{ kind: string; action: string; params: Record<string, unknown> }> = [];
    const sessionManager = {
      createSession: () => ({ id: 'mcp_session_1' }),
      touchSession: () => undefined,
      closeSession: async () => ({ closed: true })
    };
    const server = new SidofunMcpServer({
      executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
        calls.push({ kind: 'automation', action, params });
        return { ok: true, action, params };
      },
      executeCMDAction: async () => ({})
    } as any, sessionManager as any);

    await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        clientInfo: { name: 'test-client' }
      }
    });

    await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'sidofun_desktop',
        arguments: {
          action: 'trace_start',
          params: { name: 'demo-trace' }
        }
      }
    });

    expect(calls).toEqual([
      {
        kind: 'automation',
        action: 'trace_start',
        params: {
          name: 'demo-trace',
          ownerSessionId: 'mcp_session_1'
        }
      }
    ]);
  });

  test('rejects unsupported protocol versions', async () => {
    const server = new SidofunMcpServer({
      executeAutomationAction: async () => ({}),
      executeCMDAction: async () => ({})
    } as any);

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2099-01-01',
        clientInfo: { name: 'test-client' }
      }
    });

    expect(response?.error?.code).toBe(-32602);
  });

  test('cleans up owned MCP session on shutdown', async () => {
    const calls: Array<{ action: string; sessionId?: string }> = [];
    const sessionManager = {
      createSession: () => ({ id: 'mcp_session_1' }),
      touchSession: () => undefined,
      closeSession: async (sessionId: string) => {
        calls.push({ action: 'close', sessionId });
        return { closed: true };
      }
    };
    const server = new SidofunMcpServer({
      executeAutomationAction: async () => ({}),
      executeCMDAction: async () => ({})
    } as any, sessionManager as any);

    await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        clientInfo: { name: 'test-client' }
      }
    });

    await server.shutdown();
    expect(calls).toEqual([{ action: 'close', sessionId: 'mcp_session_1' }]);
  });

  test('reaps idle MCP session and recreates on later activity', async () => {
    const calls: Array<{ action: string; sessionId?: string }> = [];
    const toolCalls: Array<Record<string, unknown>> = [];
    let created = 0;
    const sessionManager = {
      createSession: () => ({ id: `mcp_session_${++created}` }),
      touchSession: () => undefined,
      closeSession: async (sessionId: string) => {
        calls.push({ action: 'close', sessionId });
        return { closed: true };
      }
    };
    const server = new SidofunMcpServer({
      executeAutomationAction: async () => ({ ok: true }),
      executeCMDAction: async (_action: string, params: Record<string, unknown>) => {
        toolCalls.push(params);
        return { ok: true };
      }
    } as any, sessionManager as any, { idleTimeoutMs: 10 });

    const init = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        clientInfo: { name: 'test-client' }
      }
    });
    expect((init?.result as any).sessionInfo).toEqual({ sessionId: 'mcp_session_1' });

    await delay(25);

    const tools = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'sidofun_terminal',
        arguments: {
          action: 'spawn',
          params: { title: 'demo' }
        }
      }
    });

    expect((tools?.result as any).structuredContent.ok).toBe(true);
    expect(calls).toEqual([{ action: 'close', sessionId: 'mcp_session_1' }]);
    expect(toolCalls).toEqual([{ title: 'demo', ownerSessionId: 'mcp_session_2' }]);
  });
});
