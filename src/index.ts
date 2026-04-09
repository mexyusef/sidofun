import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { WebSocketServer } from './services/websocket/websocket-server.js';
import type { BrowserId } from './services/browser/types.js';
import type { WSSocketData } from './types/websocket.js';
import {
  BrowserIdEnum,
  BrowserLaunchSchema,
  BrowserWindowFocusSchema,
  DesktopActionSchema
} from './core/command-schemas.js';
import { DEFAULT_PORT, CORS_ORIGINS, NORMALIZED_SCREEN_CONFIG } from './config/constants.js';
import { createSidofunRuntime } from './runtime/sidofun-runtime.js';

const app = new Hono();

// Configuration
const PORT = DEFAULT_PORT;

// Middleware
app.use('*', cors({
  origin: (origin) => {
    if (!origin) {
      return '*';
    }
    if (origin.startsWith('chrome-extension://')) {
      return origin;
    }
    return CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]!;
  },
  credentials: true
}));

app.use('*', logger());

const runtime = createSidofunRuntime();
const {
  nutJs,
  trajectoryRecorder,
  platform,
  cmdService,
  cmdTerminalCore,
  browserService,
  sessionManagerService,
  core
} = runtime;

// Initialize WebSocket server with shared CMD service
const wsServer = new WebSocketServer(platform, nutJs, { cmdService, cmdTerminalCore, core, sessionManager: sessionManagerService });

function withOwnerSessionId(body: Record<string, unknown>, ownerSessionId?: string) {
  if (!ownerSessionId || body.ownerSessionId) {
    return body;
  }
  return {
    ...body,
    ownerSessionId
  };
}

function requestOwnerSessionId(c: any): string | undefined {
  return c.req.header('x-sidofun-session-id') || undefined;
}

function touchRequestSession(c: any): string | undefined {
  const sessionId = requestOwnerSessionId(c);
  if (!sessionId) {
    return undefined;
  }
  sessionManagerService.touchSession(sessionId);
  return sessionId;
}

function parseInteger(value: string | undefined, fallback?: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const ActionSchema = DesktopActionSchema;
const BrowserIdSchema = BrowserIdEnum;

// Health check
app.get('/health', (c) => {
  return c.json({
    success: true,
    ready: true,
    service: 'windows-nutjs',
    platform: 'win32',
    normalizedScreen: NORMALIZED_SCREEN_CONFIG || null,
    timestamp: new Date().toISOString()
  });
});

app.post('/sessions', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('session_create', {
      clientKind: body?.clientKind,
      name: body?.name
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/sessions', async (c) => {
  try {
    const result = await core.executeAutomationAction('session_list', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/sessions/resources', async (c) => {
  try {
    const result = await core.executeAutomationAction('session_resources', {
      resourceType: c.req.query('type') || undefined,
      sessionId: c.req.query('sessionId') || undefined
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/sessions/resources/:resourceType/:resourceId/owners', async (c) => {
  try {
    const result = await core.executeAutomationAction('session_resource_owners', {
      resourceType: c.req.param('resourceType'),
      resourceId: c.req.param('resourceId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/sessions/idle', async (c) => {
  try {
    const result = await core.executeAutomationAction('session_list_idle', {
      maxIdleMs: parseInteger(c.req.query('maxIdleMs'), 0),
      clientKind: c.req.query('clientKind') || undefined
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/sessions/reap-idle', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('session_reap_idle', {
      maxIdleMs: body?.maxIdleMs,
      clientKind: body?.clientKind,
      cleanupOwnedResources: body?.cleanupOwnedResources
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/sessions/:sessionId', async (c) => {
  try {
    const result = await core.executeAutomationAction('session_info', {
      sessionId: c.req.param('sessionId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.post('/sessions/:sessionId/touch', async (c) => {
  try {
    const result = await core.executeAutomationAction('session_touch', {
      sessionId: c.req.param('sessionId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.post('/sessions/:sessionId/resources/:resourceType/:resourceId/claim', async (c) => {
  try {
    touchRequestSession(c);
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('session_claim_resource', {
      sessionId: c.req.param('sessionId'),
      resourceType: c.req.param('resourceType'),
      resourceId: c.req.param('resourceId'),
      takeover: body?.takeover,
      metadata: body?.metadata
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.delete('/sessions/:sessionId', async (c) => {
  try {
    const cleanupOwnedResources = c.req.query('cleanupOwnedResources');
    const result = await core.executeAutomationAction('session_close', {
      sessionId: c.req.param('sessionId'),
      cleanupOwnedResources: cleanupOwnedResources === undefined
        ? undefined
        : cleanupOwnedResources !== 'false'
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.post('/traces', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('trace_start', withOwnerSessionId({
      name: body?.name,
      metadata: body?.metadata
    }, touchRequestSession(c)));
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/traces', async (c) => {
  try {
    const result = await core.executeAutomationAction('trace_list', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/traces/:traceId', async (c) => {
  try {
    const result = await core.executeAutomationAction('trace_info', {
      traceId: c.req.param('traceId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.post('/traces/:traceId/export', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('trace_export', {
      traceId: c.req.param('traceId'),
      path: body?.path
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.delete('/traces/:traceId', async (c) => {
  try {
    const result = await core.executeAutomationAction('trace_stop', {
      traceId: c.req.param('traceId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.post('/trajectories', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('trajectory_start', withOwnerSessionId({
      name: body?.name,
      metadata: body?.metadata
    }, touchRequestSession(c)));
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/trajectories', async (c) => {
  try {
    const result = await core.executeAutomationAction('trajectory_list', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/trajectories/:trajectoryId', async (c) => {
  try {
    const result = await core.executeAutomationAction('trajectory_info', {
      trajectoryId: c.req.param('trajectoryId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.post('/trajectories/:trajectoryId/turns', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('trajectory_append_turn', {
      trajectoryId: c.req.param('trajectoryId'),
      turnId: body.turnId,
      role: body.role,
      prompt: body.prompt,
      response: body.response,
      actions: body.actions,
      screenshots: body.screenshots,
      metadata: body.metadata
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/trajectories/:trajectoryId/export', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('trajectory_export', {
      trajectoryId: c.req.param('trajectoryId'),
      path: body?.path
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.delete('/trajectories/:trajectoryId', async (c) => {
  try {
    const result = await core.executeAutomationAction('trajectory_stop', {
      trajectoryId: c.req.param('trajectoryId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

// Main action execution endpoint
app.post('/execute', async (c) => {
  let action = null;
  try {
    const body = await c.req.json();
    action = ActionSchema.parse(withOwnerSessionId(body, touchRequestSession(c)));

    console.log(`🪟 [WINDOWS] Executing: ${action.type}`, action);

    const result = await core.executeAutomationAction(action.type, action);

    console.log(`✅ [WINDOWS] Completed: ${action.type}`);
    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const actionType = action?.type || 'unknown';
    console.error(`❌ [WINDOWS] Error in ${actionType}:`, error);
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Screen size endpoint
app.get('/screen-size', async (c) => {
  try {
    const size = await core.executeAutomationAction('screen_size', {});
    return c.json({
      success: true,
      result: size,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Mouse position endpoint
app.get('/mouse-position', async (c) => {
  try {
    const position = await core.executeAutomationAction('mouse_position', {});
    return c.json({
      success: true,
      result: position,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Screenshot endpoint
app.post('/screenshot', async (c) => {
  try {
    const body = await c.req.json();
    const { format = 'png' } = body;

    const screenshot = await core.executeAutomationAction('screenshot', { format });

    return c.json({
      success: true,
      result: screenshot,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// ==================== Browser Extension Provider Endpoints ====================

app.get('/browser-extension/status', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_status', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/browser-extension/capabilities', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_capabilities', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/browser-extension/sites', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_sites', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.post('/browser-extension/wait-provider', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_wait_provider', {
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-extension/workspaces', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_workspace_list', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/browser-extension/workspaces/:name', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_workspace_get', { name: c.req.param('name') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.put('/browser-extension/workspaces/:name', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_workspace_set', {
      name: c.req.param('name'),
      path: body?.path,
      sites: body?.sites
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.delete('/browser-extension/workspaces/:name', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_workspace_clear', { name: c.req.param('name') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_session_create', {
      workspace: body?.workspace,
      site: body?.site,
      targetUrl: body?.targetUrl,
      name: body?.name,
      privateMode: body?.privateMode
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-extension/sessions', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_session_list', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/browser-extension/sessions/:sessionId', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_session_info', { sessionId: c.req.param('sessionId') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.post('/browser-extension/sessions/:sessionId/refresh', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_session_refresh', { sessionId: c.req.param('sessionId') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.post('/browser-extension/sessions/:sessionId/reconnect', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_session_reconnect', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/wait-ready', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_session_wait_ready', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.delete('/browser-extension/sessions/:sessionId', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_session_close', { sessionId: c.req.param('sessionId') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-extension/sessions/:sessionId/tabs', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_tabs', { sessionId: c.req.param('sessionId') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/navigate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_navigate', {
      sessionId: c.req.param('sessionId'),
      targetUrl: body?.url,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/focus-tab', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_focus_tab', {
      sessionId: c.req.param('sessionId'),
      tabId: body?.tabId,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/snapshot', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_snapshot', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/screenshot', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_screenshot', {
      sessionId: c.req.param('sessionId'),
      filename: body?.filename,
      returnBase64: body?.returnBase64,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/inspect', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_inspect', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/inspect-all', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_inspect_all', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      count: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/links', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_links', {
      sessionId: c.req.param('sessionId'),
      count: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/evaluate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_evaluate', {
      sessionId: c.req.param('sessionId'),
      expression: body?.expression,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/click', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_click', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/type', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_type', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      text: body?.text,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/press', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_press', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      key: body?.key,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/form-fill', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_form_fill', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      text: body?.value,
      value: body?.value,
      frameSelectors: body?.frameSelectors,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/form-fill-many', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_form_fill_many', {
      sessionId: c.req.param('sessionId'),
      fields: body?.fields,
      frameSelectors: body?.frameSelectors,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-extension/sessions/:sessionId/form-fields', async (c) => {
  try {
    const frameSelectors = c.req.queries('frame') ?? undefined;
    const result = await core.executeAutomationAction('browser_extension_form_fields', {
      sessionId: c.req.param('sessionId'),
      frameSelectors,
      limit: parseInteger(c.req.query('limit')),
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-extension/sessions/:sessionId/form-find-field', async (c) => {
  try {
    const frameSelectors = c.req.queries('frame') ?? undefined;
    const result = await core.executeAutomationAction('browser_extension_form_find_field', {
      sessionId: c.req.param('sessionId'),
      query: c.req.query('query'),
      frameSelectors,
      exact: c.req.query('exact') === 'true',
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-extension/sessions/:sessionId/form-options', async (c) => {
  try {
    const frameSelectors = c.req.queries('frame') ?? undefined;
    const result = await core.executeAutomationAction('browser_extension_form_options', {
      sessionId: c.req.param('sessionId'),
      selector: c.req.query('selector'),
      frameSelectors,
      limit: parseInteger(c.req.query('limit')),
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/form-fill-label', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_form_fill_label', {
      sessionId: c.req.param('sessionId'),
      query: body?.query,
      value: body?.value,
      frameSelectors: body?.frameSelectors,
      exact: body?.exact,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/form-select', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_form_select', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      value: body?.value,
      by: body?.by,
      frameSelectors: body?.frameSelectors,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/form-submit', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_form_submit', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      frameSelectors: body?.frameSelectors,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/form-submit-wait', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_form_submit_wait', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      frameSelectors: body?.frameSelectors,
      waitUrlIncludes: body?.waitUrlIncludes,
      waitText: body?.waitText,
      waitSelector: body?.waitSelector,
      waitNoSelector: body?.waitNoSelector,
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-extension/sessions/:sessionId/cookies', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_cookies', {
      sessionId: c.req.param('sessionId'),
      targetUrl: c.req.query('url') || undefined,
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/search', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_search', {
      sessionId: c.req.param('sessionId'),
      query: body?.query,
      mode: body?.mode,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/timeline', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_timeline', {
      sessionId: c.req.param('sessionId'),
      timelineType: body?.timelineType,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/bookmarks', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_bookmarks', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/notifications', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_notifications', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/messages', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_messages', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/open-message-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_open_message_thread', {
      sessionId: c.req.param('sessionId'),
      targetUrl: body?.thread,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/send-message', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_send_message', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      targetUrl: body?.thread,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/read-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_read_thread', {
      sessionId: c.req.param('sessionId'),
      targetUrl: body?.postUrl,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/post', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_post', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/open-post', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_open_post', {
      sessionId: c.req.param('sessionId'),
      targetUrl: body?.postUrl,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/profile', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_profile', {
      sessionId: c.req.param('sessionId'),
      targetUrl: body?.handleOrUrl,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/follow', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_follow', {
      sessionId: c.req.param('sessionId'),
      targetUrl: body?.handleOrUrl,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/reply', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_reply', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      targetUrl: body?.postUrl,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/like', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_like', {
      sessionId: c.req.param('sessionId'),
      targetUrl: body?.postUrl,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/x/repost', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_x_repost', {
      sessionId: c.req.param('sessionId'),
      targetUrl: body?.postUrl,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/read-latest', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_read_latest', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/new-chat', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_new_chat', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/sidebar-state', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_sidebar_state', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/toggle-sidebar', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_toggle_sidebar', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/models', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_models', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/select-model', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_select_model', {
      sessionId: c.req.param('sessionId'),
      text: body?.query,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/info', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_info', {
      sessionId: c.req.param('sessionId'),
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/conversations', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_list_conversations', {
      sessionId,
      limit: body.limit,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/open-conversation', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_open_conversation', {
      sessionId,
      targetUrl: body.titleQuery,
      url: body.url,
      count: body.index,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/conversation-actions', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_conversation_actions', {
      sessionId,
      targetUrl: body.titleQuery,
      url: body.url,
      count: body.index,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/conversation-action', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_conversation_action', {
      sessionId,
      text: body.actionQuery,
      targetUrl: body.titleQuery,
      url: body.url,
      count: body.index,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/rename-conversation', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_rename_conversation', {
      sessionId,
      text: body.title,
      selector: body.titleQuery,
      url: body.url,
      count: body.index,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/stop', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_stop', {
      sessionId,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/continue', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_continue', {
      sessionId,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/response-controls', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_response_controls', {
      sessionId,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/previous-response', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_previous_response', {
      sessionId,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/next-response', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_next_response', {
      sessionId,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/list-response-versions', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_list_response_versions', {
      sessionId,
      limit: body?.limit,
      maxVersions: body?.maxVersions,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/select-response-version', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_select_response_version', {
      sessionId,
      count: body?.index,
      limit: body?.limit,
      maxVersions: body?.maxVersions,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/regenerate', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_regenerate', {
      sessionId,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/edit-message', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_edit_message', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      count: body?.index,
      role: body?.role,
      offset: body?.offset,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/read-message', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_read_message', {
      sessionId: c.req.param('sessionId'),
      count: body?.index,
      role: body?.role,
      offset: body?.offset,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/read-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_read_thread', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/current-conversation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_current_conversation', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/export-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_export_thread', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs,
      format: body?.format
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/send', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_send', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/ask', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_ask', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/ask-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_ask_thread', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/rewrite-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_rewrite_thread', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      count: body?.index,
      role: body?.role,
      offset: body?.offset,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/wait-idle', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_chatgpt_wait_idle', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/wait-response', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_wait_response', {
      sessionId: c.req.param('sessionId'),
      text: typeof body.baselineText === 'string' ? body.baselineText : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/wait-message', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const role = body.role;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_wait_message', {
      sessionId: c.req.param('sessionId'),
      text: typeof body.text === 'string' ? body.text : undefined,
      role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/wait-sidebar', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_wait_sidebar', {
      sessionId: c.req.param('sessionId'),
      ok: typeof body.open === 'boolean' ? body.open : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/wait-model', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_wait_model', {
      sessionId: c.req.param('sessionId'),
      text: typeof body.query === 'string' ? body.query : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/wait-conversation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_wait_conversation', {
      sessionId: c.req.param('sessionId'),
      targetUrl: typeof body.titleQuery === 'string' ? body.titleQuery : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      ok: typeof body.active === 'boolean' ? body.active : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/prepare', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_prepare', {
      sessionId: c.req.param('sessionId'),
      waitForReady: body.ensureSidebarOpen === true,
      text: typeof body.model === 'string' ? body.model : undefined,
      createNewSession: body.newChat === true,
      targetUrl: typeof body.titleQuery === 'string' ? body.titleQuery : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      count: typeof body.index === 'number' ? body.index : undefined,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/delete-conversation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_delete_conversation', {
      sessionId: c.req.param('sessionId'),
      targetUrl: typeof body.titleQuery === 'string' ? body.titleQuery : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      count: typeof body.index === 'number' ? body.index : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/chatgpt/archive-conversation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_chatgpt_archive_conversation', {
      sessionId: c.req.param('sessionId'),
      targetUrl: typeof body.titleQuery === 'string' ? body.titleQuery : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      count: typeof body.index === 'number' ? body.index : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/read-latest', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_read_latest', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/new-chat', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_new_chat', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/sidebar-state', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_sidebar_state', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/toggle-sidebar', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_toggle_sidebar', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/models', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_models', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/select-model', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_select_model', {
      sessionId: c.req.param('sessionId'),
      text: body?.query,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/info', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_deepseek_info', {
      sessionId: c.req.param('sessionId'),
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/conversations', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_list_conversations', {
      sessionId,
      limit: body.limit,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/open-conversation', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_open_conversation', {
      sessionId,
      targetUrl: body.titleQuery,
      url: body.url,
      count: body.index,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/conversation-actions', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_conversation_actions', {
      sessionId,
      targetUrl: body.titleQuery,
      url: body.url,
      count: body.index,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/conversation-action', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_conversation_action', {
      sessionId,
      text: body.actionQuery,
      targetUrl: body.titleQuery,
      url: body.url,
      count: body.index,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/rename-conversation', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_rename_conversation', {
      sessionId,
      text: body.title,
      selector: body.titleQuery,
      url: body.url,
      count: body.index,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/stop', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_stop', {
      sessionId,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/continue', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_continue', {
      sessionId,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/response-controls', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_response_controls', {
      sessionId,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/previous-response', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_previous_response', {
      sessionId,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/next-response', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_next_response', {
      sessionId,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/list-response-versions', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_list_response_versions', {
      sessionId,
      limit: body?.limit,
      maxVersions: body?.maxVersions,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/select-response-version', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_select_response_version', {
      sessionId,
      count: body?.index,
      limit: body?.limit,
      maxVersions: body?.maxVersions,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/regenerate', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_regenerate', {
      sessionId,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/edit-message', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_edit_message', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      count: body?.index,
      role: body?.role,
      offset: body?.offset,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/read-message', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_read_message', {
      sessionId: c.req.param('sessionId'),
      count: body?.index,
      role: body?.role,
      offset: body?.offset,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/read-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_read_thread', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/current-conversation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_current_conversation', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/export-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_export_thread', {
      sessionId: c.req.param('sessionId'),
      limit: body?.limit,
      timeoutMs: body?.timeoutMs,
      format: body?.format
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/send', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_send', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/ask', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_ask', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/ask-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_ask_thread', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/rewrite-thread', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_rewrite_thread', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      count: body?.index,
      role: body?.role,
      offset: body?.offset,
      limit: body?.limit,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/wait-idle', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_deepseek_wait_idle', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/wait-response', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_deepseek_wait_response', {
      sessionId: c.req.param('sessionId'),
      text: typeof body.baselineText === 'string' ? body.baselineText : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/wait-message', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const role = body.role;
    const result = await core.executeAutomationAction('browser_extension_deepseek_wait_message', {
      sessionId: c.req.param('sessionId'),
      text: typeof body.text === 'string' ? body.text : undefined,
      role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/wait-sidebar', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_deepseek_wait_sidebar', {
      sessionId: c.req.param('sessionId'),
      ok: typeof body.open === 'boolean' ? body.open : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/wait-model', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_deepseek_wait_model', {
      sessionId: c.req.param('sessionId'),
      text: typeof body.query === 'string' ? body.query : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/wait-conversation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_deepseek_wait_conversation', {
      sessionId: c.req.param('sessionId'),
      targetUrl: typeof body.titleQuery === 'string' ? body.titleQuery : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      ok: typeof body.active === 'boolean' ? body.active : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
      count: typeof body.stableReads === 'number' ? body.stableReads : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/prepare', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_deepseek_prepare', {
      sessionId: c.req.param('sessionId'),
      waitForReady: body.ensureSidebarOpen === true,
      text: typeof body.model === 'string' ? body.model : undefined,
      createNewSession: body.newChat === true,
      targetUrl: typeof body.titleQuery === 'string' ? body.titleQuery : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      count: typeof body.index === 'number' ? body.index : undefined,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/delete-conversation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_deepseek_delete_conversation', {
      sessionId: c.req.param('sessionId'),
      targetUrl: typeof body.titleQuery === 'string' ? body.titleQuery : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      count: typeof body.index === 'number' ? body.index : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/sessions/:sessionId/deepseek/archive-conversation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const result = await core.executeAutomationAction('browser_extension_deepseek_archive_conversation', {
      sessionId: c.req.param('sessionId'),
      targetUrl: typeof body.titleQuery === 'string' ? body.titleQuery : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      count: typeof body.index === 'number' ? body.index : undefined,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined
    });
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.get('/browser-extension/sessions/:sessionId/network-events', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_network_events', {
      sessionId: c.req.param('sessionId'),
      count: parseInteger(c.req.query('limit')),
      targetUrl: c.req.query('urlIncludes') || undefined,
      status: c.req.query('stage') || undefined,
      text: c.req.query('method') || undefined
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-extension/sessions/:sessionId/dom-events', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const limit = c.req.query('limit');
    const mutationType = c.req.query('mutationType');
    const textIncludes = c.req.query('textIncludes');
    const timeoutMs = c.req.query('timeoutMs');
    const result = await core.executeAutomationAction('browser_extension_dom_events', {
      sessionId,
      count: limit ? Number.parseInt(limit, 10) : undefined,
      mutationType: mutationType === 'childList' || mutationType === 'attributes' || mutationType === 'characterData' ? mutationType : undefined,
      textIncludes: textIncludes ?? undefined,
      timeoutMs: timeoutMs ? Number.parseInt(timeoutMs, 10) : undefined
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.get('/browser-extension/sessions/:sessionId/session-events', async (c) => {
  try {
    const okRaw = c.req.query('ok');
    const result = await core.executeAutomationAction('browser_extension_session_events', {
      sessionId: c.req.param('sessionId'),
      count: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
      kind: c.req.query('kind') ?? undefined,
      ok: okRaw === 'true' ? true : okRaw === 'false' ? false : undefined
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/clear-session-events', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_extension_clear_session_events', {
      sessionId: c.req.param('sessionId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/wait-text', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_wait_text', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/wait-url', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_wait_url', {
      sessionId: c.req.param('sessionId'),
      text: body?.text,
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/wait-selector', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_wait_selector', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/wait-no-selector', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_wait_no_selector', {
      sessionId: c.req.param('sessionId'),
      selector: body?.selector,
      timeoutMs: body?.timeoutMs,
      intervalMs: body?.intervalMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/clear-network-events', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_clear_network_events', {
      sessionId: c.req.param('sessionId'),
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/sessions/:sessionId/clear-dom-events', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_clear_dom_events', {
      sessionId,
      timeoutMs: body.timeoutMs
    });
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post('/browser-extension/provider/register', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_extension_provider_register', {
      extensionId: body?.extensionId,
      protocolVersion: body?.protocolVersion,
      buildId: body?.buildId,
      browserName: body?.browserName,
      browserVersion: body?.browserVersion,
      userAgent: body?.userAgent
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/provider/heartbeat', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_extension_provider_heartbeat', {
      extensionId: body?.extensionId,
      protocolVersion: body?.protocolVersion,
      buildId: body?.buildId,
      sessions: body?.sessions
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/provider/state', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_extension_provider_state_upsert', {
      extensionId: body?.extensionId,
      protocolVersion: body?.protocolVersion,
      buildId: body?.buildId,
      session: body?.session
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/provider/events', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_extension_provider_events_upsert', {
      extensionId: body?.extensionId,
      protocolVersion: body?.protocolVersion,
      buildId: body?.buildId,
      sessionId: body?.sessionId,
      networkEvents: body?.networkEvents,
      domEvents: body?.domEvents,
      events: body?.events
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/provider/poll', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('browser_extension_provider_poll', {
      extensionId: body?.extensionId,
      limit: body?.limit,
      waitMs: body?.waitMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-extension/provider/command-result', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_extension_provider_command_result', {
      extensionId: body?.extensionId,
      sessionId: body?.sessionId,
      commandId: body?.commandId,
      ok: body?.ok,
      result: body?.result,
      error: body?.error
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

// ==================== HF Papers Endpoints ====================

app.get('/hf/status', async (c) => {
  try {
    const result = await core.executeAutomationAction('hf_papers_status', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/hf/doctor', async (c) => {
  try {
    const backend = c.req.query('backend');
    const result = await core.executeAutomationAction('hf_papers_doctor', {
      backend: backend === 'api' || backend === 'cli' || backend === 'auto' ? backend : undefined,
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/hf/papers/search', async (c) => {
  try {
    const backend = c.req.query('backend');
    const result = await core.executeAutomationAction('hf_papers_search', {
      query: c.req.query('q') || '',
      limit: parseInteger(c.req.query('limit')),
      backend: backend === 'api' || backend === 'cli' || backend === 'auto' ? backend : undefined,
      token: c.req.query('token') || undefined,
      includeRaw: c.req.query('includeRaw') === 'true',
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/hf/papers/daily', async (c) => {
  try {
    const backend = c.req.query('backend');
    const sort = c.req.query('sort');
    const result = await core.executeAutomationAction('hf_papers_list_daily', {
      date: c.req.query('date') || undefined,
      week: c.req.query('week') || undefined,
      month: c.req.query('month') || undefined,
      submitter: c.req.query('submitter') || undefined,
      sort: sort === 'publishedAt' || sort === 'trending' ? sort : undefined,
      limit: parseInteger(c.req.query('limit')),
      backend: backend === 'api' || backend === 'cli' || backend === 'auto' ? backend : undefined,
      token: c.req.query('token') || undefined,
      includeRaw: c.req.query('includeRaw') === 'true',
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/hf/papers/:paperId', async (c) => {
  try {
    const backend = c.req.query('backend');
    const result = await core.executeAutomationAction('hf_papers_info', {
      paperId: c.req.param('paperId'),
      backend: backend === 'api' || backend === 'cli' || backend === 'auto' ? backend : undefined,
      token: c.req.query('token') || undefined,
      includeRaw: c.req.query('includeRaw') === 'true',
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/hf/papers/:paperId/read', async (c) => {
  try {
    const backend = c.req.query('backend');
    const result = await core.executeAutomationAction('hf_papers_read', {
      paperId: c.req.param('paperId'),
      backend: backend === 'api' || backend === 'cli' || backend === 'auto' ? backend : undefined,
      token: c.req.query('token') || undefined,
      savePath: c.req.query('savePath') || undefined,
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

// ==================== OpenCLI-RS Provider Endpoints ====================

app.get('/opencli/status', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_status', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/opencli/doctor', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_doctor', {
      cwd: c.req.query('cwd') || undefined,
      workspace: c.req.query('workspace') || undefined,
      ownerSessionId: c.req.query('ownerSessionId') || undefined,
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/opencli/sites', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_sites', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/opencli/sites/:site/commands', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_commands', { site: c.req.param('site') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/opencli/run', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await core.executeAutomationAction('opencli_run', withOwnerSessionId({
      site: body?.site,
      command: body?.command,
      args: body?.args,
      cwd: body?.cwd,
      workspace: body?.workspace,
      timeoutMs: body?.timeoutMs,
      format: body?.format
    }, touchRequestSession(c)));
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/opencli/workspaces', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_workspace_list', {});
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/opencli/workspaces/:name', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_workspace_get', { name: c.req.param('name') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.put('/opencli/workspaces/:name', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('opencli_workspace_set', {
      name: c.req.param('name'),
      path: body?.path
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.delete('/opencli/workspaces/:name', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_workspace_clear', { name: c.req.param('name') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.put('/opencli/workspaces/session/:sessionId', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('opencli_workspace_bind_session', {
      sessionId: c.req.param('sessionId'),
      workspace: body?.workspace
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/opencli/workspaces/session/:sessionId', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_workspace_session', { sessionId: c.req.param('sessionId') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 404);
  }
});

app.delete('/opencli/workspaces/session/:sessionId', async (c) => {
  try {
    const result = await core.executeAutomationAction('opencli_workspace_unbind_session', { sessionId: c.req.param('sessionId') });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/twitter/search', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('twitter_search', withOwnerSessionId({
      query: body?.query,
      limit: body?.limit,
      cwd: body?.cwd,
      workspace: body?.workspace,
      timeoutMs: body?.timeoutMs
    }, touchRequestSession(c)));
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/twitter/timeline', async (c) => {
  try {
    const result = await core.executeAutomationAction('twitter_timeline', withOwnerSessionId({
      timelineType: c.req.query('type') || undefined,
      limit: parseInteger(c.req.query('limit')),
      cwd: c.req.query('cwd') || undefined,
      workspace: c.req.query('workspace') || undefined,
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    }, touchRequestSession(c)));
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/twitter/bookmarks', async (c) => {
  try {
    const result = await core.executeAutomationAction('twitter_bookmarks', withOwnerSessionId({
      limit: parseInteger(c.req.query('limit')),
      cwd: c.req.query('cwd') || undefined,
      workspace: c.req.query('workspace') || undefined,
      timeoutMs: parseInteger(c.req.query('timeoutMs'))
    }, touchRequestSession(c)));
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/twitter/post', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('twitter_post', withOwnerSessionId({
      text: body?.text,
      cwd: body?.cwd,
      workspace: body?.workspace,
      timeoutMs: body?.timeoutMs
    }, touchRequestSession(c)));
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

// ==================== Browser REST API Endpoints ====================

app.get('/browsers', (c) => {
  return c.json({
    success: true,
    result: browserService.listBrowsers(),
    timestamp: new Date().toISOString()
  });
});

app.get('/browsers/:browser', async (c) => {
  try {
    const browserId = BrowserIdSchema.parse(c.req.param('browser')) as BrowserId;
    return c.json({
      success: true,
      result: await core.executeAutomationAction('browser_info', { browser: browserId }),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

app.get('/browsers/:browser/profiles', async (c) => {
  try {
    const browserId = BrowserIdSchema.parse(c.req.param('browser')) as BrowserId;
    return c.json({
      success: true,
      result: await core.executeAutomationAction('browser_profiles', { browser: browserId }),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

app.post('/browsers/:browser/launch-plan', async (c) => {
  try {
    const browserId = BrowserIdSchema.parse(c.req.param('browser')) as BrowserId;
    const body = BrowserLaunchSchema.parse(await c.req.json());
    const result = await core.executeAutomationAction('browser_launch_plan', {
      browser: browserId,
      profile: body.profile,
      profilePath: body.profilePath,
      url: body.url,
      privateMode: body.privateMode,
      headless: body.headless,
      args: body.args,
      detached: body.detached
    });

    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

app.post('/browsers/:browser/launch', async (c) => {
  try {
    const browserId = BrowserIdSchema.parse(c.req.param('browser')) as BrowserId;
    const body = BrowserLaunchSchema.parse(await c.req.json());
    const result = await core.executeAutomationAction('browser_launch', {
      browser: browserId,
      profile: body.profile,
      profilePath: body.profilePath,
      url: body.url,
      privateMode: body.privateMode,
      headless: body.headless,
      args: body.args,
      detached: body.detached
    });

    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

app.get('/browsers/:browser/windows', async (c) => {
  try {
    const browserId = BrowserIdSchema.parse(c.req.param('browser')) as BrowserId;
    return c.json({
      success: true,
      result: await core.executeAutomationAction('browser_windows', { browser: browserId }),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

app.post('/browsers/:browser/focus', async (c) => {
  try {
    const browserId = BrowserIdSchema.parse(c.req.param('browser')) as BrowserId;
    const body = BrowserWindowFocusSchema.parse(await c.req.json());
    const result = await core.executeAutomationAction('browser_focus_window', {
      browser: browserId,
      handle: body.handle,
      titleIncludes: body.titleIncludes
    });

    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

app.get('/browser-runtimes', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_runtime_list', {});
    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

app.post('/browser-runtimes', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_runtime_create', withOwnerSessionId(body, touchRequestSession(c)));
    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

app.get('/browser-runtimes/:runtimeId', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_runtime_info', {
      runtimeId: c.req.param('runtimeId')
    });
    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 404);
  }
});

app.delete('/browser-runtimes/:runtimeId', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_runtime_close', {
      runtimeId: c.req.param('runtimeId')
    });
    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

app.get('/browser-runtimes/:runtimeId/pages', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_page_list', {
      runtimeId: c.req.param('runtimeId')
    });
    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

app.post('/browser-runtimes/:runtimeId/pages', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_open', withOwnerSessionId({
      runtimeId: c.req.param('runtimeId'),
      url: body?.url
    }, touchRequestSession(c)));
    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 400);
  }
});

app.get('/browser-pages/:pageId', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_page_info', {
      pageId: c.req.param('pageId')
    });
    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 404);
  }
});

app.post('/browser-pages/:pageId/navigate', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_navigate', {
      pageId: c.req.param('pageId'),
      url: body?.url
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-pages/:pageId/click', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_click', {
      pageId: c.req.param('pageId'),
      selector: body?.selector
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-pages/:pageId/fill', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_fill', {
      pageId: c.req.param('pageId'),
      selector: body?.selector,
      value: body?.value
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-pages/:pageId/press', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_press', {
      pageId: c.req.param('pageId'),
      selector: body?.selector,
      key: body?.key
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-pages/:pageId/wait-for', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_wait_for', {
      pageId: c.req.param('pageId'),
      waitFor: body?.waitFor,
      query: body?.query,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.post('/browser-pages/:pageId/evaluate', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_evaluate', {
      pageId: c.req.param('pageId'),
      expression: body?.expression
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.get('/browser-pages/:pageId/content', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_page_content', {
      pageId: c.req.param('pageId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.post('/browser-pages/:pageId/screenshot', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_screenshot', {
      pageId: c.req.param('pageId'),
      path: body?.path,
      fullPage: body?.fullPage
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.post('/browser-pages/:pageId/pdf', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_pdf', {
      pageId: c.req.param('pageId'),
      path: body?.path
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.post('/browser-pages/:pageId/download-url', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_download_url', {
      pageId: c.req.param('pageId'),
      url: body?.url,
      path: body?.path
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/browser-pages/:pageId/network-events', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_page_network_events', {
      pageId: c.req.param('pageId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/browser-pages/:pageId/events', async (c) => {
  try {
    const sinceId = c.req.query('sinceId');
    const result = await core.executeAutomationAction('browser_page_events', {
      pageId: c.req.param('pageId'),
      sinceId
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.get('/browser-pages/:pageId/console-events', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_page_console_events', {
      pageId: c.req.param('pageId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.delete('/browser-pages/:pageId/events', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_page_clear_events', {
      pageId: c.req.param('pageId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

app.post('/browser-pages/:pageId/wait-for-network', async (c) => {
  try {
    const body = await c.req.json();
    const result = await core.executeAutomationAction('browser_page_wait_for_network', {
      pageId: c.req.param('pageId'),
      urlIncludes: body?.urlIncludes,
      kind: body?.kind,
      status: body?.status,
      timeoutMs: body?.timeoutMs
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 400);
  }
});

app.delete('/browser-pages/:pageId', async (c) => {
  try {
    const result = await core.executeAutomationAction('browser_page_close', {
      pageId: c.req.param('pageId')
    });
    return c.json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unknown error', timestamp: new Date().toISOString() }, 500);
  }
});

// ==================== CMD REST API Endpoints ====================

/**
 * Spawn a new CMD window
 * POST /cmd/spawn
 * Body: { title?: string }
 */
app.post('/cmd/spawn', async (c) => {
  try {
    const body = await c.req.json();
    const { title } = body;

    const ownerSessionId = touchRequestSession(c);
    const result = await core.executeCMDAction('cmd_spawn', {
      title,
      ownerSessionId
    });

    return c.json({
      success: true,
      sessionId: result.sessionId,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * List all active CMD sessions
 * GET /cmd/list
 */
app.get('/cmd/list', async (c) => {
  try {
    const result = await cmdTerminalCore.listSessions();

    return c.json({
      success: true,
      sessions: result.sessions,
      count: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * Get CMD session info
 * GET /cmd/:sessionId/info
 */
app.get('/cmd/:sessionId/info', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const info = await cmdTerminalCore.getSessionInfo(sessionId);

    return c.json({
      success: true,
      session: info,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 404);
  }
});

/**
 * Execute command in CMD session
 * POST /cmd/:sessionId/exec
 * Body: { command: string, wait?: boolean, timeout?: number, screenshot?: boolean }
 */
app.post('/cmd/:sessionId/exec', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    const { command, wait, timeout, screenshot } = body;

    const result = await cmdTerminalCore.exec(sessionId, command, {
      wait,
      timeout,
      screenshot
    });

    return c.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * Type text into CMD session with escape sequence support
 * POST /cmd/:sessionId/type
 * Body: { text: string }
 * Supports: \n (enter), \t (tab), \dN (delay N ms), \M (maximize), \m (minimize), \r (restore), \f (focus)
 * Note: Use sessionId or numeric index (1-based) for session alias
 */
app.post('/cmd/:sessionId/type', async (c) => {
  try {
    const body = await c.req.json();
    const { text } = body;
    const result = await cmdTerminalCore.typeEscaped(c.req.param('sessionId'), text);

    return c.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * Press key in CMD session
 * POST /cmd/:sessionId/press
 * Body: { key: string }
 */
app.post('/cmd/:sessionId/press', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    const { key } = body;

    const result = await cmdTerminalCore.press(sessionId, key);

    return c.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * Screenshot CMD session window
 * POST /cmd/:sessionId/screenshot
 * Body: { filename?: string, returnBase64?: boolean }
 */
app.post('/cmd/:sessionId/screenshot', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    const { filename, returnBase64 } = body;

    const screenshot = await cmdTerminalCore.screenshot(sessionId, { filename, returnBase64 });

    return c.json({
      success: true,
      filepath: screenshot.filepath,
      data: screenshot.data,
      width: screenshot.width,
      height: screenshot.height,
      format: screenshot.format,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * Send Ctrl+C to CMD session
 * POST /cmd/:sessionId/break
 */
app.post('/cmd/:sessionId/break', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    const result = await cmdTerminalCore.sendBreak(sessionId);

    return c.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * Close CMD session
 * DELETE /cmd/:sessionId
 */
app.delete('/cmd/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    const result = await cmdTerminalCore.close(sessionId);

    return c.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// ==================== Terminal Shortcuts ====================

function createCMDShortcutHandler(shortcut: Parameters<typeof cmdTerminalCore.executeShortcut>[1]) {
  return async (c: any) => {
    try {
      const result = await cmdTerminalCore.executeShortcut(c.req.param('sessionId'), shortcut);
      return c.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }, 500);
    }
  };
}

/**
 * Create new tab in Windows Terminal (Ctrl+Shift+T)
 * POST /cmd/:sessionId/new-tab
 */
app.post('/cmd/:sessionId/new-tab', createCMDShortcutHandler('new_tab'));

/**
 * Switch to next tab (Ctrl+Tab)
 * POST /cmd/:sessionId/next-tab
 */
app.post('/cmd/:sessionId/next-tab', createCMDShortcutHandler('next_tab'));

/**
 * Switch to previous tab (Ctrl+Shift+Tab)
 * POST /cmd/:sessionId/prev-tab
 */
app.post('/cmd/:sessionId/prev-tab', createCMDShortcutHandler('prev_tab'));

/**
 * Split window vertically (Shift+Alt+-)
 * POST /cmd/:sessionId/split-vertical
 */
app.post('/cmd/:sessionId/split-vertical', createCMDShortcutHandler('split_vertical'));

/**
 * Split window horizontally (Shift+Alt++)
 * POST /cmd/:sessionId/split-horizontal
 */
app.post('/cmd/:sessionId/split-horizontal', createCMDShortcutHandler('split_horizontal'));

/**
 * Navigate to upper pane (Alt+Up)
 * POST /cmd/:sessionId/pane-up
 */
app.post('/cmd/:sessionId/pane-up', createCMDShortcutHandler('pane_up'));

/**
 * Navigate to lower pane (Alt+Down)
 * POST /cmd/:sessionId/pane-down
 */
app.post('/cmd/:sessionId/pane-down', createCMDShortcutHandler('pane_down'));

/**
 * Navigate to left pane (Alt+Left)
 * POST /cmd/:sessionId/pane-left
 */
app.post('/cmd/:sessionId/pane-left', createCMDShortcutHandler('pane_left'));

/**
 * Navigate to right pane (Alt+Right)
 * POST /cmd/:sessionId/pane-right
 */
app.post('/cmd/:sessionId/pane-right', createCMDShortcutHandler('pane_right'));

// ==================== End of CMD REST API ====================

// Start server with both REST API and WebSocket support
const server = Bun.serve<WSSocketData>({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // WebSocket upgrade path
    if (url.pathname === '/ws') {
      const requestedSessionId = url.searchParams.get('sessionId') || undefined;
      const upgraded = server.upgrade(req, {
        data: {
          sessionId: requestedSessionId
        }
      });
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 500 });
      }
      return new Response(); // Return empty response for upgrade
    }

    // REST API - forward to Hono
    return app.fetch(req);
  },

  websocket: {
    open(ws) {
      wsServer.handleOpen(ws, ws.data?.sessionId);
    },
    message(ws, message) {
      wsServer.handleMessage(ws, message);
    },
    close(ws) {
      wsServer.handleClose(ws);
    }
  }
});

// Log server info
console.log(`🪟 Sidofun Desktop Windows Server starting on port ${PORT}...`);
console.log(`🔧 Platform: Windows with native libnut-core`);
if (NORMALIZED_SCREEN_CONFIG) {
  console.log(`📐 Coordinate normalization: ${NORMALIZED_SCREEN_CONFIG.width}x${NORMALIZED_SCREEN_CONFIG.height}`);
}
if (trajectoryRecorder) {
  console.log(`🧭 Trajectory logging: ${trajectoryRecorder.outputPath}`);
}
console.log(`🚀 Health: http://localhost:${PORT}/health`);
console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  wsServer.shutdown();
  server.stop();
  process.exit(0);
});
