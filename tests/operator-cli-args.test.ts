import { describe, expect, test } from 'bun:test';
import { getOperatorHelpText, parseOperatorCommand } from '../src/operator-cli/args.js';

describe('operator cli args', () => {
  test('parses doctor and list commands', () => {
    expect(parseOperatorCommand(['doctor', '--json'])).toEqual({ kind: 'doctor', json: true });
    expect(parseOperatorCommand(['config', 'get'])).toEqual({ kind: 'config_get', key: undefined, json: false });
    expect(parseOperatorCommand(['config', 'get', 'OPENCLI_RS_PATH', '--json'])).toEqual({ kind: 'config_get', key: 'OPENCLI_RS_PATH', json: true });
    expect(parseOperatorCommand(['config', 'set', 'OPENCLI_RS_PATH', 'C:\\repo\\opencli-rs'])).toEqual({
      kind: 'config_set',
      key: 'OPENCLI_RS_PATH',
      value: 'C:\\repo\\opencli-rs',
      json: false
    });
    expect(parseOperatorCommand(['clipboard', 'read'])).toEqual({ kind: 'clipboard_read', json: false });
    expect(parseOperatorCommand(['clipboard', 'write', 'hello', 'world'])).toEqual({ kind: 'clipboard_write', text: 'hello world', json: false });
    expect(parseOperatorCommand(['session', 'create', '--client-kind', 'operator', '--name', 'demo'])).toEqual({
      kind: 'session_create',
      clientKind: 'operator',
      name: 'demo',
      json: false
    });
    expect(parseOperatorCommand(['session', 'list'])).toEqual({ kind: 'session_list', json: false });
    expect(parseOperatorCommand(['session', 'resources', '--type', 'terminal'])).toEqual({
      kind: 'session_resources',
      resourceType: 'terminal',
      sessionId: undefined,
      json: false
    });
    expect(parseOperatorCommand(['session', 'owners', 'browser_page', 'page_1'])).toEqual({
      kind: 'session_resource_owners',
      resourceType: 'browser_page',
      resourceId: 'page_1',
      json: false
    });
    expect(parseOperatorCommand(['session', 'claim', 'client_session_1', 'trace', 'trace_1', '--takeover'])).toEqual({
      kind: 'session_claim_resource',
      sessionId: 'client_session_1',
      resourceType: 'trace',
      resourceId: 'trace_1',
      takeover: true,
      json: false
    });
    expect(parseOperatorCommand(['trace', 'start', '--name', 'desktop-debug'])).toEqual({
      kind: 'trace_start',
      name: 'desktop-debug',
      ownerSessionId: undefined,
      json: false
    });
    expect(parseOperatorCommand(['trace', 'export', 'trace_1', '--file', 'trace.json'])).toEqual({
      kind: 'trace_export',
      traceId: 'trace_1',
      path: 'trace.json',
      json: false
    });
    expect(parseOperatorCommand(['trajectory', 'start', '--name', 'agent-run'])).toEqual({
      kind: 'trajectory_start',
      name: 'agent-run',
      ownerSessionId: undefined,
      json: false
    });
    expect(parseOperatorCommand(['trace', 'start', '--name', 'desktop-debug', '--owner-session', 'client_session_1'])).toEqual({
      kind: 'trace_start',
      name: 'desktop-debug',
      ownerSessionId: 'client_session_1',
      json: false
    });
    expect(parseOperatorCommand(['trajectory', 'start', '--name', 'agent-run', '--owner-session', 'client_session_1'])).toEqual({
      kind: 'trajectory_start',
      name: 'agent-run',
      ownerSessionId: 'client_session_1',
      json: false
    });
    expect(parseOperatorCommand(['trajectory', 'export', 'trajectory_1', '--file', 'trajectory.json'])).toEqual({
      kind: 'trajectory_export',
      trajectoryId: 'trajectory_1',
      path: 'trajectory.json',
      json: false
    });
    expect(parseOperatorCommand(['scope', 'create', '--title-query', 'Windows Terminal', '--name', 'terminal'])).toEqual({
      kind: 'desktop_scope_create',
      windowHandles: undefined,
      processIds: undefined,
      titleQuery: 'Windows Terminal',
      name: 'terminal',
      ownerSessionId: undefined,
      json: false
    });
    expect(parseOperatorCommand(['scope', 'list'])).toEqual({ kind: 'desktop_scope_list', json: false });
    expect(parseOperatorCommand(['shell', 'run', 'Get-Location', '--pwsh', '--cwd', 'C:\\hapus'])).toEqual({
      kind: 'shell_run',
      command: 'Get-Location',
      shell: 'pwsh',
      cwd: 'C:\\hapus',
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['terminal', 'spawn', 'cmd', 'MyTerminal'])).toEqual({
      kind: 'terminal_spawn',
      terminalKind: 'cmd',
      title: 'MyTerminal',
      cwd: undefined,
      ownerSessionId: undefined,
      json: false
    });
    expect(parseOperatorCommand(['terminal', 'spawn', 'pwsh', 'WorkShell', '--dir', 'C:\\hapus'])).toEqual({
      kind: 'terminal_spawn',
      terminalKind: 'pwsh',
      title: 'WorkShell',
      cwd: 'C:\\hapus',
      text: undefined,
      delayMs: undefined,
      ownerSessionId: undefined,
      json: false
    });
    expect(parseOperatorCommand(['terminal', 'spawn', 'cmd', 'WorkShell', '--dir', 'C:\\hapus', '--text', 'echo hello\\n', '--delay-ms', '1500'])).toEqual({
      kind: 'terminal_spawn',
      terminalKind: 'cmd',
      title: 'WorkShell',
      cwd: 'C:\\hapus',
      text: 'echo hello\\n',
      delayMs: 1500,
      ownerSessionId: undefined,
      json: false
    });
    expect(parseOperatorCommand(['terminal', 'list', '--kind', 'pwsh'])).toEqual({
      kind: 'terminal_list',
      terminalKind: 'pwsh',
      json: false
    });
    expect(parseOperatorCommand(['daemon', 'start'])).toEqual({ kind: 'daemon_start', json: false });
    expect(parseOperatorCommand(['daemon', 'status', '--json'])).toEqual({ kind: 'daemon_status', json: true });
    expect(parseOperatorCommand(['daemon', 'stop'])).toEqual({ kind: 'daemon_stop', json: false });
    expect(parseOperatorCommand(['browsers', 'list'])).toEqual({ kind: 'browsers_list', json: false });
    expect(parseOperatorCommand(['browser', 'profiles', 'chrome'])).toEqual({
      kind: 'browser_profiles',
      browserId: 'chrome',
      json: false
    });
    expect(parseOperatorCommand(['browser', 'launch', 'firefox', '--profile', 'default-release', '--url', 'https://gmail.com'])).toEqual({
      kind: 'browser_launch',
      browserId: 'firefox',
      profile: 'default-release',
      url: 'https://gmail.com',
      privateMode: false,
      headless: false,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'status'])).toEqual({ kind: 'browser_extension_status', json: false });
    expect(parseOperatorCommand(['browserext', 'capabilities', '--json'])).toEqual({ kind: 'browser_extension_capabilities', json: true });
    expect(parseOperatorCommand(['browserext', 'wait-provider', '--timeout-ms', '30000', '--interval-ms', '750'])).toEqual({
      kind: 'browser_extension_wait_provider',
      timeoutMs: 30000,
      intervalMs: 750,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'workspace', 'set', 'socials', 'C:\\hapus', '--site', 'x.com', '--site', 'chatgpt.com'])).toEqual({
      kind: 'browser_extension_workspace_set',
      name: 'socials',
      path: 'C:\\hapus',
      sites: ['x.com', 'chatgpt.com'],
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'session', 'create', '--workspace', 'socials', '--site', 'x.com', '--url', 'https://x.com/home', '--name', 'socials-home'])).toEqual({
      kind: 'browser_extension_session_create',
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'socials-home',
      privateMode: false,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'session', 'create', '--workspace', 'socials', '--site', 'x.com', '--url', 'https://x.com/home', '--name', 'socials-home', '--private'])).toEqual({
      kind: 'browser_extension_session_create',
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'socials-home',
      privateMode: true,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'session', 'wait-ready', 'browserext_1', '--timeout-ms', '30000', '--interval-ms', '750'])).toEqual({
      kind: 'browser_extension_session_wait_ready',
      sessionId: 'browserext_1',
      timeoutMs: 30000,
      intervalMs: 750,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'session', 'refresh', 'browserext_1'])).toEqual({
      kind: 'browser_extension_session_refresh',
      sessionId: 'browserext_1',
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'session', 'reconnect', 'browserext_1', '--timeout-ms', '30000', '--interval-ms', '750'])).toEqual({
      kind: 'browser_extension_session_reconnect',
      sessionId: 'browserext_1',
      timeoutMs: 30000,
      intervalMs: 750,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'tabs', 'browserext_1', '--json'])).toEqual({
      kind: 'browser_extension_tabs',
      sessionId: 'browserext_1',
      json: true
    });
    expect(parseOperatorCommand(['browserext', 'frames', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_frames',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'navigate', 'browserext_1', 'https://x.com/explore', '--timeout-ms', '9000'])).toEqual({
      kind: 'browser_extension_navigate',
      sessionId: 'browserext_1',
      targetUrl: 'https://x.com/explore',
      timeoutMs: 9000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'back', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_back',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'forward', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_forward',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'reload', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_reload',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'metadata', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_metadata',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'url-parts', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_url_parts',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'storage-list', 'browserext_1', '--scope', 'session', '--limit', '25', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_storage_list',
      sessionId: 'browserext_1',
      scope: 'session',
      limit: 25,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'storage-get', 'browserext_1', 'auth_token', '--scope', 'local', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_storage_get',
      sessionId: 'browserext_1',
      key: 'auth_token',
      scope: 'local',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'storage-set', 'browserext_1', 'auth_token', 'secret', '--scope', 'local', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_storage_set',
      sessionId: 'browserext_1',
      key: 'auth_token',
      value: 'secret',
      scope: 'local',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'storage-remove', 'browserext_1', 'auth_token', '--scope', 'local', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_storage_remove',
      sessionId: 'browserext_1',
      key: 'auth_token',
      scope: 'local',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'focus-tab', 'browserext_1', '12345'])).toEqual({
      kind: 'browser_extension_focus_tab',
      sessionId: 'browserext_1',
      tabId: 12345,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'snapshot', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_snapshot',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'dom-tree', 'browserext_1', '--selector', 'main', '--frame', 'iframe[name="checkout"]', '--max-depth', '3', '--max-children', '12', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_dom_tree',
      sessionId: 'browserext_1',
      selector: 'main',
      frameSelectors: ['iframe[name="checkout"]'],
      maxDepth: 3,
      maxChildren: 12,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'screenshot', 'browserext_1', '--file', 'browserext-shot.png', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_screenshot',
      sessionId: 'browserext_1',
      filename: 'browserext-shot.png',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'eval', 'browserext_1', 'document.title', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_evaluate',
      sessionId: 'browserext_1',
      expression: 'document.title',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'click', 'browserext_1', 'button.compose'])).toEqual({
      kind: 'browser_extension_click',
      sessionId: 'browserext_1',
      selector: 'button.compose',
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'type', 'browserext_1', 'textarea', 'hello'])).toEqual({
      kind: 'browser_extension_type',
      sessionId: 'browserext_1',
      selector: 'textarea',
      text: 'hello',
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'press', 'browserext_1', 'Enter', '--selector', 'textarea'])).toEqual({
      kind: 'browser_extension_press',
      sessionId: 'browserext_1',
      key: 'Enter',
      selector: 'textarea',
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'editor-read', 'browserext_1', '.ProseMirror', '--frame', 'iframe[name="editor"]'])).toEqual({
      kind: 'browser_extension_editor_read',
      sessionId: 'browserext_1',
      selector: '.ProseMirror',
      frameSelectors: ['iframe[name="editor"]'],
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'editor-fill', 'browserext_1', '.ProseMirror', 'hello world', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_editor_fill',
      sessionId: 'browserext_1',
      selector: '.ProseMirror',
      value: 'hello world',
      frameSelectors: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-fill', 'browserext_1', 'input[name="email"]', 'usef@example.com'])).toEqual({
      kind: 'browser_extension_form_fill',
      sessionId: 'browserext_1',
      selector: 'input[name="email"]',
      value: 'usef@example.com',
      frameSelectors: undefined,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-fill-human', 'browserext_1', 'input[name="email"]', 'usef@example.com', '--delay-ms', '80', '--jitter-ms', '15'])).toEqual({
      kind: 'browser_extension_form_fill_human',
      sessionId: 'browserext_1',
      selector: 'input[name="email"]',
      value: 'usef@example.com',
      frameSelectors: undefined,
      delayMs: 80,
      jitterMs: 15,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-fill-many', 'browserext_1', '--field', 'input[name="email"]=usef@example.com', '--field', 'input[name="password"]=secret', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_form_fill_many',
      sessionId: 'browserext_1',
      fields: [
        { selector: 'input[name="email"]', value: 'usef@example.com' },
        { selector: 'input[name="password"]', value: 'secret' }
      ],
      frameSelectors: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand([
      'browserext', 'form-workflow', 'browserext_1',
      '--field', 'Customer name=Usef Test',
      '--field', 'Email=usef@example.com',
      '--context-index', '0',
      '--frame', 'iframe[name="checkout"]',
      '--submit',
      '--wait-url-includes', '/done',
      '--delay-ms', '250',
      '--timeout-ms', '5000',
      '--interval-ms', '400'
    ])).toEqual({
      kind: 'browser_extension_form_workflow',
      sessionId: 'browserext_1',
      fields: [
        { query: 'Customer name', value: 'Usef Test' },
        { query: 'Email', value: 'usef@example.com' }
      ],
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: undefined,
      contextIndex: 0,
      contextQuery: undefined,
      exact: false,
      submit: true,
      submitSelector: undefined,
      delayMs: 250,
      waitUrlIncludes: '/done',
      waitText: undefined,
      waitSelector: undefined,
      waitNoSelector: undefined,
      timeoutMs: 5000,
      intervalMs: 400,
      json: false
    });
    expect(parseOperatorCommand([
      'browserext', 'query-workflow', 'browserext_1',
      '--fill', 'Email=usef@example.com',
      '--fill', 'Password=secret',
      '--radio', 'Plan=Pro',
      '--toggle', 'Remember me=on',
      '--click', 'Continue',
      '--form', '#login-form',
      '--exact',
      '--submit-query', 'Sign in',
      '--delay-ms', '250',
      '--timeout-ms', '5000',
      '--interval-ms', '400'
    ])).toEqual({
      kind: 'browser_extension_query_workflow',
      sessionId: 'browserext_1',
      fills: [
        { query: 'Email', value: 'usef@example.com' },
        { query: 'Password', value: 'secret' }
      ],
      clicks: ['Continue'],
      radios: [
        { query: 'Plan', value: 'Pro' }
      ],
      segmenteds: undefined,
      ranges: undefined,
      toggles: [
        { query: 'Remember me', desiredState: 'on' }
      ],
      frameSelectors: undefined,
      formSelector: '#login-form',
      contextQuery: undefined,
      exact: true,
      submit: false,
      submitSelector: undefined,
      submitQuery: 'Sign in',
      delayMs: 250,
      waitUrlIncludes: undefined,
      waitText: undefined,
      waitSelector: undefined,
      waitNoSelector: undefined,
      timeoutMs: 5000,
      intervalMs: 400,
      json: false
    });
    expect(parseOperatorCommand([
      'browserext', 'query-plan', 'browserext_1',
      '--fill', 'Email=usef@example.com',
      '--radio', 'Plan=Pro',
      '--segment', 'Theme=Dark',
      '--tab', 'Settings sections=Security',
      '--step-next', 'Checkout wizard',
      '--range', 'Priority slider=8',
      '--toggle', 'Remember me=on',
      '--click', 'Continue',
      '--submit-query', 'Sign in',
      '--exact',
      '--json'
    ])).toEqual({
      kind: 'browser_extension_query_plan',
      sessionId: 'browserext_1',
      fills: [
        { query: 'Email', value: 'usef@example.com' }
      ],
      clicks: ['Continue'],
      radios: [
        { query: 'Plan', value: 'Pro' }
      ],
      segmenteds: [
        { query: 'Theme', value: 'Dark' }
      ],
      tabs: [
        { query: 'Settings sections', value: 'Security' }
      ],
      steppers: [
        { query: 'Checkout wizard', direction: 'next' }
      ],
      ranges: [
        { query: 'Priority slider', value: '8' }
      ],
      toggles: [
        { query: 'Remember me', desiredState: 'on' }
      ],
      frameSelectors: undefined,
      formSelector: undefined,
      contextQuery: undefined,
      exact: true,
      submit: false,
      submitSelector: undefined,
      submitQuery: 'Sign in',
      json: true
    });
    expect(parseOperatorCommand([
      'browserext', 'query-workflow', 'browserext_1',
      '--segment', 'Theme=Dark',
      '--tab', 'Settings sections=Security',
      '--step-prev', 'Checkout wizard',
      '--range', 'Priority slider=8',
      '--submit-query', 'Save controls',
      '--require-text', 'Theme',
      '--require-no-selector', '.loading',
      '--settle-after-each', 'page',
      '--settle-quiet-ms', '1200',
      '--stable-reads', '3',
      '--wait-text', '"theme": "dark"',
      '--json'
    ])).toEqual({
      kind: 'browser_extension_query_workflow',
      sessionId: 'browserext_1',
      fills: [],
      clicks: [],
      radios: undefined,
      segmenteds: [
        { query: 'Theme', value: 'Dark' }
      ],
      tabs: [
        { query: 'Settings sections', value: 'Security' }
      ],
      steppers: [
        { query: 'Checkout wizard', direction: 'previous' }
      ],
      ranges: [
        { query: 'Priority slider', value: '8' }
      ],
      toggles: undefined,
      frameSelectors: undefined,
      formSelector: undefined,
      contextQuery: undefined,
      exact: false,
      submit: false,
      submitSelector: undefined,
      submitQuery: 'Save controls',
      delayMs: undefined,
      waitUrlIncludes: undefined,
      waitText: '"theme": "dark"',
      waitSelector: undefined,
      waitNoSelector: undefined,
      requireTexts: ['Theme'],
      requireNoTexts: undefined,
      requireSelectors: undefined,
      requireNoSelectors: ['.loading'],
      settleAfterEach: 'page',
      settleQuietMs: 1200,
      stableReads: 3,
      timeoutMs: undefined,
      intervalMs: undefined,
      json: true
    });
    expect(parseOperatorCommand([
      'browserext', 'query-plan', 'browserext_1',
      '--fill', 'Email=usef@example.com',
      '--context-query', 'login form',
      '--frame-query', 'checkout',
      '--json'
    ])).toEqual({
      kind: 'browser_extension_query_plan',
      sessionId: 'browserext_1',
      fills: [
        { query: 'Email', value: 'usef@example.com' }
      ],
      clicks: [],
      radios: undefined,
      segmenteds: undefined,
      tabs: undefined,
      steppers: undefined,
      ranges: undefined,
      toggles: undefined,
      frameSelectors: undefined,
      formSelector: undefined,
      contextQuery: 'login form',
      frameQuery: 'checkout',
      exact: false,
      submit: false,
      submitSelector: undefined,
      submitQuery: undefined,
      json: true
    });
    expect(parseOperatorCommand([
      'browserext', 'context-plan', 'browserext_1',
      '--context-query', 'login form',
      '--frame-query', 'auth',
      '--limit', '5',
      '--exact',
      '--json'
    ])).toEqual({
      kind: 'browser_extension_context_plan',
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      formSelector: undefined,
      contextIndex: undefined,
      contextQuery: 'login form',
      frameQuery: 'auth',
      exact: true,
      limit: 5,
      timeoutMs: undefined,
      json: true
    });
    expect(parseOperatorCommand([
      'browserext', 'workflow-plan', 'browserext_1',
      '--file', 'examples/browserext-fixtures/control-workflow.json',
      '--json'
    ])).toEqual({
      kind: 'browser_extension_workflow_plan',
      sessionId: 'browserext_1',
      filepath: 'examples/browserext-fixtures/control-workflow.json',
      json: true
    });
    expect(parseOperatorCommand([
      'browserext', 'workflow-diagnose', 'browserext_1',
      '--file', 'examples/browserext-fixtures/control-workflow.json',
      '--json'
    ])).toEqual({
      kind: 'browser_extension_workflow_diagnose',
      sessionId: 'browserext_1',
      filepath: 'examples/browserext-fixtures/control-workflow.json',
      json: true
    });
    expect(parseOperatorCommand([
      'browserext', 'workflow-run', 'browserext_1',
      '--file', 'examples/browserext-fixtures/control-workflow.json'
    ])).toEqual({
      kind: 'browser_extension_workflow_run',
      sessionId: 'browserext_1',
      filepath: 'examples/browserext-fixtures/control-workflow.json',
      json: false
    });
    expect(parseOperatorCommand([
      'browserext', 'context-state', 'browserext_1',
      '--context-query', 'login form',
      '--frame-query', 'auth',
      '--limit', '5',
      '--exact',
      '--json'
    ])).toEqual({
      kind: 'browser_extension_context_state',
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      formSelector: undefined,
      contextIndex: undefined,
      contextQuery: 'login form',
      frameQuery: 'auth',
      exact: true,
      limit: 5,
      timeoutMs: undefined,
      json: true
    });
    expect(parseOperatorCommand(['browserext', 'form-fields', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--limit', '10'])).toEqual({
      kind: 'browser_extension_form_fields',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 10,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-values', 'browserext_1', '--context-query', 'checkout form', '--frame-query', 'billing', '--limit', '10', '--exact'])).toEqual({
      kind: 'browser_extension_form_values',
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      formSelector: undefined,
      contextQuery: 'checkout form',
      frameQuery: 'billing',
      exact: true,
      limit: 10,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-contexts', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--limit', '10'])).toEqual({
      kind: 'browser_extension_form_contexts',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 10,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-radio-groups', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--limit', '10'])).toEqual({
      kind: 'browser_extension_form_radio_groups',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 10,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-find-field', 'browserext_1', 'Email', '--frame', 'iframe[name="checkout"]', '--exact'])).toEqual({
      kind: 'browser_extension_form_find_field',
      sessionId: 'browserext_1',
      query: 'Email',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-radio-select', 'browserext_1', 'Plan', 'Pro', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_radio_select',
      sessionId: 'browserext_1',
      query: 'Plan',
      value: 'Pro',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-segmented-options', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--limit', '10'])).toEqual({
      kind: 'browser_extension_form_segmented_options',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 10,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-segmented-select', 'browserext_1', 'Theme', 'Dark', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_segmented_select',
      sessionId: 'browserext_1',
      query: 'Theme',
      value: 'Dark',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-tablist-options', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--limit', '10'])).toEqual({
      kind: 'browser_extension_form_tablist_options',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 10,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-tablist-select', 'browserext_1', 'Settings sections', 'Security', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_tablist_select',
      sessionId: 'browserext_1',
      query: 'Settings sections',
      value: 'Security',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-stepper', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--limit', '10'])).toEqual({
      kind: 'browser_extension_form_stepper',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 10,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-step-next', 'browserext_1', 'Checkout wizard', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_stepper_move',
      sessionId: 'browserext_1',
      direction: 'next',
      query: 'Checkout wizard',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-date-set', 'browserext_1', 'Start date', '2026-04-10', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_date_set',
      sessionId: 'browserext_1',
      query: 'Start date',
      value: '2026-04-10',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-time-set', 'browserext_1', 'Start time', '09:30', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_time_set',
      sessionId: 'browserext_1',
      query: 'Start time',
      value: '09:30',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-datetime-set', 'browserext_1', 'Reminder datetime', '2026-04-10T08:45', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_datetime_set',
      sessionId: 'browserext_1',
      query: 'Reminder datetime',
      value: '2026-04-10T08:45',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-toggle', 'browserext_1', 'Remember me', '--state', 'on', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_toggle',
      sessionId: 'browserext_1',
      query: 'Remember me',
      desiredState: 'on',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-range-set', 'browserext_1', 'Priority slider', '8', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_range_set',
      sessionId: 'browserext_1',
      query: 'Priority slider',
      value: '8',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-options', 'browserext_1', 'select[name="country"]', '--frame', 'iframe[name="checkout"]'])).toEqual({
      kind: 'browser_extension_form_options',
      sessionId: 'browserext_1',
      selector: 'select[name="country"]',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: undefined,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-fill-label', 'browserext_1', 'Email', 'usef@example.com', '--frame', 'iframe[name="checkout"]'])).toEqual({
      kind: 'browser_extension_form_fill_label',
      sessionId: 'browserext_1',
      query: 'Email',
      value: 'usef@example.com',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: false,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-fill-query', 'browserext_1', 'Email', 'usef@example.com', '--frame', 'iframe[name="checkout"]', '--form', 'form.checkout', '--exact'])).toEqual({
      kind: 'browser_extension_form_fill_query',
      sessionId: 'browserext_1',
      query: 'Email',
      value: 'usef@example.com',
      frameSelectors: ['iframe[name="checkout"]'],
      formSelector: 'form.checkout',
      exact: true,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-select', 'browserext_1', 'select[name="country"]', 'Indonesia', '--by', 'text', '--frame', 'iframe[name="checkout"]'])).toEqual({
      kind: 'browser_extension_form_select',
      sessionId: 'browserext_1',
      selector: 'select[name="country"]',
      value: 'Indonesia',
      by: 'text',
      frameSelectors: ['iframe[name="checkout"]'],
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-upload', 'browserext_1', 'input[type="file"]', 'C:\\temp\\resume.pdf', '--name', 'resume.pdf', '--mime', 'application/pdf', '--frame', 'iframe[name="upload"]'])).toEqual({
      kind: 'browser_extension_form_upload',
      sessionId: 'browserext_1',
      selector: 'input[type="file"]',
      filepath: 'C:\\temp\\resume.pdf',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
      frameSelectors: ['iframe[name="upload"]'],
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-combobox-options', 'browserext_1', '[role="combobox"]', '--limit', '15'])).toEqual({
      kind: 'browser_extension_form_combobox_options',
      sessionId: 'browserext_1',
      selector: '[role="combobox"]',
      frameSelectors: undefined,
      limit: 15,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-combobox-select', 'browserext_1', '[role="combobox"]', 'Indonesia', '--match', 'exact', '--frame', 'iframe[name="picker"]'])).toEqual({
      kind: 'browser_extension_form_combobox_select',
      sessionId: 'browserext_1',
      selector: '[role="combobox"]',
      value: 'Indonesia',
      match: 'exact',
      frameSelectors: ['iframe[name="picker"]'],
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-submit', 'browserext_1', '--selector', 'button[type="submit"]', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_form_submit',
      sessionId: 'browserext_1',
      selector: 'button[type="submit"]',
      frameSelectors: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'form-submit-wait', 'browserext_1', '--wait-text', 'Thanks', '--wait-no-selector', '.loading', '--interval-ms', '300'])).toEqual({
      kind: 'browser_extension_form_submit_wait',
      sessionId: 'browserext_1',
      selector: undefined,
      frameSelectors: undefined,
      waitUrlIncludes: undefined,
      waitText: 'Thanks',
      waitSelector: undefined,
      waitNoSelector: '.loading',
      timeoutMs: undefined,
      intervalMs: 300,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'auth-login', 'browserext_1', '--email', 'usef@example.com', '--password', 'secret', '--delay-ms', '70', '--jitter-ms', '10', '--wait-url-includes', '/dashboard'])).toEqual({
      kind: 'browser_extension_auth_login',
      sessionId: 'browserext_1',
      email: 'usef@example.com',
      username: undefined,
      password: 'secret',
      frameSelectors: undefined,
      selector: undefined,
      humanLike: true,
      delayMs: 70,
      jitterMs: 10,
      skipSubmit: false,
      waitUrlIncludes: '/dashboard',
      waitText: undefined,
      waitSelector: undefined,
      waitNoSelector: undefined,
      timeoutMs: undefined,
      intervalMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'auth-signup', 'browserext_1', '--full-name', 'Usef Test', '--email', 'usef@example.com', '--password', 'secret', '--confirm-password', 'secret', '--skip-submit', '--plain-fill'])).toEqual({
      kind: 'browser_extension_auth_signup',
      sessionId: 'browserext_1',
      fullName: 'Usef Test',
      username: undefined,
      email: 'usef@example.com',
      password: 'secret',
      confirmPassword: 'secret',
      frameSelectors: undefined,
      selector: undefined,
      humanLike: false,
      delayMs: undefined,
      jitterMs: undefined,
      skipSubmit: true,
      waitUrlIncludes: undefined,
      waitText: undefined,
      waitSelector: undefined,
      waitNoSelector: undefined,
      timeoutMs: undefined,
      intervalMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'cookies', 'browserext_1', '--url', 'https://x.com'])).toEqual({
      kind: 'browser_extension_cookies',
      sessionId: 'browserext_1',
      targetUrl: 'https://x.com',
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'cookie-get', 'browserext_1', 'sid', '--url', 'https://x.com', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_cookie_get',
      sessionId: 'browserext_1',
      name: 'sid',
      targetUrl: 'https://x.com',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'cookie-set', 'browserext_1', 'sid', 'demo', '--url', 'https://x.com', '--domain', '.x.com', '--path', '/', '--secure', '--http-only', '--same-site', 'lax', '--expiration', '1893456000', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_cookie_set',
      sessionId: 'browserext_1',
      name: 'sid',
      value: 'demo',
      targetUrl: 'https://x.com',
      domain: '.x.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      expirationDate: 1893456000,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'cookie-remove', 'browserext_1', 'sid', '--url', 'https://x.com', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_cookie_remove',
      sessionId: 'browserext_1',
      name: 'sid',
      targetUrl: 'https://x.com',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-cookie', 'browserext_1', 'sid', '--url', 'https://x.com', '--includes', 'demo', '--exists', 'true', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_cookie',
      sessionId: 'browserext_1',
      name: 'sid',
      targetUrl: 'https://x.com',
      includes: 'demo',
      exists: true,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'downloads', 'browserext_1', 'report', '--state', 'complete', '--limit', '10', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_downloads',
      sessionId: 'browserext_1',
      query: 'report',
      state: 'complete',
      limit: 10,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'download-cancel', 'browserext_1', 'report', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_download_cancel',
      sessionId: 'browserext_1',
      query: 'report',
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'download-erase', 'browserext_1', 'report', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_download_erase',
      sessionId: 'browserext_1',
      query: 'report',
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-download', 'browserext_1', 'report', '--state', 'complete', '--limit', '10', '--exact', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_download',
      sessionId: 'browserext_1',
      query: 'report',
      state: 'complete',
      limit: 10,
      exact: true,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'dom-events', 'browserext_1', '--limit', '20', '--mutation-type', 'childList', '--text-includes', 'Hiring', '--timeout-ms', '3000'])).toEqual({
      kind: 'browser_extension_dom_events',
      sessionId: 'browserext_1',
      limit: 20,
      mutationType: 'childList',
      textIncludes: 'Hiring',
      timeoutMs: 3000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'clear-dom-events', 'browserext_1', '--timeout-ms', '3000'])).toEqual({
      kind: 'browser_extension_clear_dom_events',
      sessionId: 'browserext_1',
      timeoutMs: 3000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'ask-thread', 'browserext_1', 'Summarize this page', '--limit', '10', '--timeout-ms', '45000'])).toEqual({
      kind: 'browser_extension_chatgpt_ask_thread',
      sessionId: 'browserext_1',
      text: 'Summarize this page',
      limit: 10,
      timeoutMs: 45000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'continue', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_continue',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'read-message', 'browserext_1', '--role', 'assistant', '--offset', '1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_read_message',
      sessionId: 'browserext_1',
      role: 'assistant',
      offset: 1,
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'current-conversation', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_current_conversation',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'export-thread', 'browserext_1', '--format', 'markdown', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_export_thread',
      sessionId: 'browserext_1',
      format: 'markdown',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'ask-thread', 'browserext_1', 'Summarize this page', '--limit', '10', '--timeout-ms', '45000'])).toEqual({
      kind: 'browser_extension_deepseek_ask_thread',
      sessionId: 'browserext_1',
      text: 'Summarize this page',
      limit: 10,
      timeoutMs: 45000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'continue', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_continue',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'read-message', 'browserext_1', '--role', 'assistant', '--offset', '1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_read_message',
      sessionId: 'browserext_1',
      role: 'assistant',
      offset: 1,
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'current-conversation', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_current_conversation',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'export-thread', 'browserext_1', '--format', 'markdown', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_export_thread',
      sessionId: 'browserext_1',
      format: 'markdown',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'search', 'browserext_1', 'hiring -intern', '--mode', 'latest', '--limit', '5'])).toEqual({
      kind: 'browser_extension_x_search',
      sessionId: 'browserext_1',
      query: 'hiring -intern',
      mode: 'latest',
      limit: 5,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'notifications', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_notifications',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'search', 'hiring -intern', '--mode', 'latest', '--limit', '5'])).toEqual({
      kind: 'browser_extension_x_search',
      sessionId: '__auto_browserext_site_session__',
      query: 'hiring -intern',
      mode: 'latest',
      limit: 5,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'timeline', '--type', 'following', '--limit', '10'])).toEqual({
      kind: 'browser_extension_x_timeline',
      sessionId: '__auto_browserext_site_session__',
      timelineType: 'following',
      limit: 10,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'post', 'hello from sidofun', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_post',
      sessionId: '__auto_browserext_site_session__',
      text: 'hello from sidofun',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'messages', 'browserext_1', '--limit', '20', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_messages',
      sessionId: 'browserext_1',
      limit: 20,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'open-message-thread', 'browserext_1', 'https://x.com/messages/123', '--limit', '20', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_open_message_thread',
      sessionId: 'browserext_1',
      thread: 'https://x.com/messages/123',
      limit: 20,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'send-message', 'browserext_1', 'hello from sidofun', '--thread', 'https://x.com/messages/123', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_send_message',
      sessionId: 'browserext_1',
      text: 'hello from sidofun',
      thread: 'https://x.com/messages/123',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'read-thread', 'browserext_1', 'https://x.com/user/status/123', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_read_thread',
      sessionId: 'browserext_1',
      postUrl: 'https://x.com/user/status/123',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'open-post', 'browserext_1', 'https://x.com/user/status/123', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_open_post',
      sessionId: 'browserext_1',
      postUrl: 'https://x.com/user/status/123',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'profile', 'browserext_1', '@openai', '--limit', '3', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_profile',
      sessionId: 'browserext_1',
      handleOrUrl: '@openai',
      limit: 3,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'follow', 'browserext_1', '@openai', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_follow',
      sessionId: 'browserext_1',
      handleOrUrl: '@openai',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'reply', 'browserext_1', 'hello', '--post-url', 'https://x.com/user/status/123', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_reply',
      sessionId: 'browserext_1',
      text: 'hello',
      postUrl: 'https://x.com/user/status/123',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'like', 'browserext_1', '--post-url', 'https://x.com/user/status/123', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_like',
      sessionId: 'browserext_1',
      postUrl: 'https://x.com/user/status/123',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'x', 'repost', 'browserext_1', '--post-url', 'https://x.com/user/status/123', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_x_repost',
      sessionId: 'browserext_1',
      postUrl: 'https://x.com/user/status/123',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'read-latest', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_read_latest',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'sidebar-state', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_sidebar_state',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'toggle-sidebar', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_toggle_sidebar',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'models', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_models',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'select-model', 'browserext_1', 'GPT-4o', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_select_model',
      sessionId: 'browserext_1',
      query: 'GPT-4o',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'info', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_info',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'conversations', 'browserext_1', '--limit', '20', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_list_conversations',
      sessionId: 'browserext_1',
      limit: 20,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'open-conversation', 'browserext_1', '--title', 'Project', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_open_conversation',
      sessionId: 'browserext_1',
      titleQuery: 'Project',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'conversation-actions', 'browserext_1', '--title', 'Project', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_conversation_actions',
      sessionId: 'browserext_1',
      titleQuery: 'Project',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'conversation-action', 'browserext_1', 'rename', '--title', 'Project', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_conversation_action',
      sessionId: 'browserext_1',
      actionQuery: 'rename',
      titleQuery: 'Project',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'rename-conversation', 'browserext_1', 'Renamed chat', '--match-title', 'Project', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_rename_conversation',
      sessionId: 'browserext_1',
      title: 'Renamed chat',
      titleQuery: 'Project',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'stop', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_stop',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'response-controls', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_response_controls',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'previous-response', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_previous_response',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'next-response', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_next_response',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'list-response-versions', 'browserext_1', '--limit', '10', '--max-versions', '6', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_list_response_versions',
      sessionId: 'browserext_1',
      limit: 10,
      maxVersions: 6,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'select-response-version', 'browserext_1', '0', '--limit', '10', '--max-versions', '6', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_select_response_version',
      sessionId: 'browserext_1',
      count: 0,
      limit: 10,
      maxVersions: 6,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'regenerate', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_regenerate',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'read-thread', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_read_thread',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'send', 'browserext_1', 'Summarize this page', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_send',
      sessionId: 'browserext_1',
      text: 'Summarize this page',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'ask', 'browserext_1', 'What is on this page?', '--timeout-ms', '45000'])).toEqual({
      kind: 'browser_extension_chatgpt_ask',
      sessionId: 'browserext_1',
      text: 'What is on this page?',
      timeoutMs: 45000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'wait-response', 'browserext_1', '--baseline', 'Existing assistant reply', '--timeout-ms', '45000', '--interval-ms', '1000', '--stable-reads', '2'])).toEqual({
      kind: 'browser_extension_chatgpt_wait_response',
      sessionId: 'browserext_1',
      baselineText: 'Existing assistant reply',
      timeoutMs: 45000,
      intervalMs: 1000,
      stableReads: 2,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'wait-model', 'browserext_1', '--query', 'GPT-4o', '--timeout-ms', '30000', '--interval-ms', '1000', '--stable-reads', '2'])).toEqual({
      kind: 'browser_extension_chatgpt_wait_model',
      sessionId: 'browserext_1',
      query: 'GPT-4o',
      timeoutMs: 30000,
      intervalMs: 1000,
      stableReads: 2,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'prepare', 'browserext_1', '--sidebar-open', '--model', 'GPT-4o', '--new-chat', '--limit', '10', '--timeout-ms', '45000', '--interval-ms', '1000'])).toEqual({
      kind: 'browser_extension_chatgpt_prepare',
      sessionId: 'browserext_1',
      ensureSidebarOpen: true,
      model: 'GPT-4o',
      newChat: true,
      titleQuery: undefined,
      url: undefined,
      index: undefined,
      limit: 10,
      timeoutMs: 45000,
      intervalMs: 1000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'delete-conversation', 'browserext_1', '--title', 'Project', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_delete_conversation',
      sessionId: 'browserext_1',
      titleQuery: 'Project',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'read-latest', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_read_latest',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'sidebar-state', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_sidebar_state',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'toggle-sidebar', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_toggle_sidebar',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'models', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_models',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'select-model', 'browserext_1', 'DeepSeek R1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_select_model',
      sessionId: 'browserext_1',
      query: 'DeepSeek R1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'info', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_info',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'conversations', 'browserext_1', '--limit', '20', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_list_conversations',
      sessionId: 'browserext_1',
      limit: 20,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'open-conversation', 'browserext_1', '--title', 'Research', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_open_conversation',
      sessionId: 'browserext_1',
      titleQuery: 'Research',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'conversation-actions', 'browserext_1', '--title', 'Research', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_conversation_actions',
      sessionId: 'browserext_1',
      titleQuery: 'Research',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'conversation-action', 'browserext_1', 'rename', '--title', 'Research', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_conversation_action',
      sessionId: 'browserext_1',
      actionQuery: 'rename',
      titleQuery: 'Research',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'rename-conversation', 'browserext_1', 'Renamed thread', '--match-title', 'Research', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_rename_conversation',
      sessionId: 'browserext_1',
      title: 'Renamed thread',
      titleQuery: 'Research',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'stop', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_stop',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'response-controls', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_response_controls',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'previous-response', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_previous_response',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'next-response', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_next_response',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'list-response-versions', 'browserext_1', '--limit', '10', '--max-versions', '6', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_list_response_versions',
      sessionId: 'browserext_1',
      limit: 10,
      maxVersions: 6,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'select-response-version', 'browserext_1', '0', '--limit', '10', '--max-versions', '6', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_select_response_version',
      sessionId: 'browserext_1',
      count: 0,
      limit: 10,
      maxVersions: 6,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'regenerate', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_regenerate',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'read-thread', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_read_thread',
      sessionId: 'browserext_1',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'send', 'browserext_1', 'Summarize this page', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_send',
      sessionId: 'browserext_1',
      text: 'Summarize this page',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'ask', 'browserext_1', 'What is on this page?', '--timeout-ms', '45000'])).toEqual({
      kind: 'browser_extension_deepseek_ask',
      sessionId: 'browserext_1',
      text: 'What is on this page?',
      timeoutMs: 45000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'wait-response', 'browserext_1', '--baseline', 'Existing DeepSeek reply', '--timeout-ms', '45000', '--interval-ms', '1000', '--stable-reads', '2'])).toEqual({
      kind: 'browser_extension_deepseek_wait_response',
      sessionId: 'browserext_1',
      baselineText: 'Existing DeepSeek reply',
      timeoutMs: 45000,
      intervalMs: 1000,
      stableReads: 2,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'wait-model', 'browserext_1', '--query', 'DeepSeek R1', '--timeout-ms', '30000', '--interval-ms', '1000', '--stable-reads', '2'])).toEqual({
      kind: 'browser_extension_deepseek_wait_model',
      sessionId: 'browserext_1',
      query: 'DeepSeek R1',
      timeoutMs: 30000,
      intervalMs: 1000,
      stableReads: 2,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'prepare', 'browserext_1', '--sidebar-open', '--model', 'DeepSeek R1', '--new-chat', '--limit', '10', '--timeout-ms', '45000', '--interval-ms', '1000'])).toEqual({
      kind: 'browser_extension_deepseek_prepare',
      sessionId: 'browserext_1',
      ensureSidebarOpen: true,
      model: 'DeepSeek R1',
      newChat: true,
      titleQuery: undefined,
      url: undefined,
      index: undefined,
      limit: 10,
      timeoutMs: 45000,
      intervalMs: 1000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'archive-conversation', 'browserext_1', '--title', 'Research', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_archive_conversation',
      sessionId: 'browserext_1',
      titleQuery: 'Research',
      url: undefined,
      index: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'network-events', 'browserext_1', '--limit', '20', '--stage', 'response', '--url-includes', '/graphql', '--method', 'GET'])).toEqual({
      kind: 'browser_extension_network_events',
      sessionId: 'browserext_1',
      limit: 20,
      urlIncludes: '/graphql',
      stage: 'response',
      method: 'GET',
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'session-events', 'browserext_1', '--limit', '20', '--kind', 'snapshot', '--ok', 'true'])).toEqual({
      kind: 'browser_extension_session_events',
      sessionId: 'browserext_1',
      limit: 20,
      eventKind: 'snapshot',
      ok: true,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'clear-session-events', 'browserext_1'])).toEqual({
      kind: 'browser_extension_clear_session_events',
      sessionId: 'browserext_1',
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'session', 'nuke', '--site', 'x.com', '--stale', '--queue', 'all'])).toEqual({
      kind: 'browser_extension_session_nuke',
      site: 'x.com',
      staleOnly: true,
      connectedOnly: false,
      disconnectedOnly: false,
      queue: 'all',
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'queue', 'clear', '--session', 'browserext_1', '--status', 'in_progress'])).toEqual({
      kind: 'browser_extension_queue_clear',
      sessionId: 'browserext_1',
      site: undefined,
      status: 'in_progress',
      json: false
    });
    expect(parseOperatorCommand(['bex', 'sessions'])).toEqual({
      kind: 'browser_extension_session_list',
      json: false
    });
    expect(parseOperatorCommand(['bex', 'nuke-stale', '--queue', 'all'])).toEqual({
      kind: 'browser_extension_session_nuke',
      site: undefined,
      staleOnly: true,
      connectedOnly: false,
      disconnectedOnly: false,
      queue: 'all',
      json: false
    });
    expect(parseOperatorCommand(['bex', 'clear-in-progress', '--session', 'browserext_1'])).toEqual({
      kind: 'browser_extension_queue_clear',
      sessionId: 'browserext_1',
      site: undefined,
      status: 'in_progress',
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-text', 'browserext_1', 'Hiring', '--timeout-ms', '30000', '--interval-ms', '1000'])).toEqual({
      kind: 'browser_extension_wait_text',
      sessionId: 'browserext_1',
      text: 'Hiring',
      timeoutMs: 30000,
      intervalMs: 1000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-dom-quiet', 'browserext_1', '--quiet-ms', '2000', '--mutation-type', 'childList', '--text-includes', 'Saved', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_dom_quiet',
      sessionId: 'browserext_1',
      quietMs: 2000,
      timeoutMs: 30000,
      intervalMs: 500,
      mutationType: 'childList',
      textIncludes: 'Saved',
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-network-idle', 'browserext_1', '--quiet-ms', '2000', '--url-includes', '/api/', '--stage', 'response', '--method', 'POST', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_network_idle',
      sessionId: 'browserext_1',
      quietMs: 2000,
      timeoutMs: 30000,
      intervalMs: 500,
      urlIncludes: '/api/',
      stage: 'response',
      method: 'POST',
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-page-stable', 'browserext_1', '--quiet-ms', '2000', '--stable-reads', '3', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_page_stable',
      sessionId: 'browserext_1',
      quietMs: 2000,
      timeoutMs: 30000,
      intervalMs: 500,
      stableReads: 3,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-page-diff', 'browserext_1', '--against-file', 'baseline.json', '--selector', 'main', '--frame', 'iframe[name="checkout"]', '--url-changed', '--text-length-delta-at-least', '50', '--added-actionable', 'Submit', '--removed-actionable', 'Cancel', '--limit', '12', '--max-depth', '3', '--max-children', '9', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_page_diff',
      sessionId: 'browserext_1',
      againstFile: 'baseline.json',
      selector: 'main',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      maxDepth: 3,
      maxChildren: 9,
      urlChanged: true,
      titleChanged: undefined,
      textChanged: undefined,
      textLengthDeltaAtLeast: 50,
      addedActionableQuery: 'Submit',
      removedActionableQuery: 'Cancel',
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-no-blockers', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_no_blockers',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-banner', 'browserext_1', 'Saved', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_banner',
      sessionId: 'browserext_1',
      text: 'Saved',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-no-banner', 'browserext_1', 'Saved', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_no_banner',
      sessionId: 'browserext_1',
      text: 'Saved',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'page-recover', 'browserext_1', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--exact', '--limit', '12', '--continue-on-error', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_page_recover',
      sessionId: 'browserext_1',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: true,
      limit: 12,
      timeoutMs: 30000,
      intervalMs: 500,
      continueOnError: true,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'page-diff', 'browserext_1', '--against-file', 'baseline.json', '--selector', 'main', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--max-depth', '3', '--max-children', '9', '--timeout-ms', '30000'])).toEqual({
      kind: 'browser_extension_page_diff',
      sessionId: 'browserext_1',
      againstFile: 'baseline.json',
      selector: 'main',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      maxDepth: 3,
      maxChildren: 9,
      timeoutMs: 30000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'page-outcomes', 'browserext_1', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--timeout-ms', '30000'])).toEqual({
      kind: 'browser_extension_page_outcomes',
      sessionId: 'browserext_1',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      timeoutMs: 30000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'page-ready', 'browserext_1', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--exact', '--limit', '12', '--continue-on-error', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_page_ready',
      sessionId: 'browserext_1',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: true,
      limit: 12,
      timeoutMs: 30000,
      intervalMs: 500,
      continueOnError: true,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-no-collection-filters', 'browserext_1', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--exact', '--limit', '12', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_no_collection_filters',
      sessionId: 'browserext_1',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: true,
      limit: 12,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-page-outcome', 'browserext_1', 'success', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_page_outcome',
      sessionId: 'browserext_1',
      status: 'success',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-url', 'browserext_1', 'chatgpt.com/c/', '--timeout-ms', '30000', '--interval-ms', '1000'])).toEqual({
      kind: 'browser_extension_wait_url',
      sessionId: 'browserext_1',
      text: 'chatgpt.com/c/',
      timeoutMs: 30000,
      intervalMs: 1000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-filter-clear', 'browserext_1', 'Status', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_filter_clear',
      sessionId: 'browserext_1',
      query: 'Status',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-filter-token-clear', 'browserext_1', 'Status: Active', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_filter_token_clear',
      sessionId: 'browserext_1',
      query: 'Status: Active',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-clear-all-filters', 'browserext_1', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--exact', '--continue-on-error', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_clear_all_filters',
      sessionId: 'browserext_1',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: true,
      continueOnError: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-selector', 'browserext_1', 'textarea', '--timeout-ms', '30000', '--interval-ms', '1000'])).toEqual({
      kind: 'browser_extension_wait_selector',
      sessionId: 'browserext_1',
      selector: 'textarea',
      timeoutMs: 30000,
      intervalMs: 1000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-no-selector', 'browserext_1', '[data-testid=\"stop-button\"]', '--timeout-ms', '30000', '--interval-ms', '1000'])).toEqual({
      kind: 'browser_extension_wait_no_selector',
      sessionId: 'browserext_1',
      selector: '[data-testid=\"stop-button\"]',
      timeoutMs: 30000,
      intervalMs: 1000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'wait-message', 'browserext_1', '--role', 'assistant', '--text', 'Final answer', '--limit', '10', '--timeout-ms', '45000', '--interval-ms', '1000', '--stable-reads', '2'])).toEqual({
      kind: 'browser_extension_chatgpt_wait_message',
      sessionId: 'browserext_1',
      text: 'Final answer',
      role: 'assistant',
      limit: 10,
      timeoutMs: 45000,
      intervalMs: 1000,
      stableReads: 2,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'wait-message', 'browserext_1', '--role', 'assistant', '--text', 'Final answer', '--limit', '10', '--timeout-ms', '45000', '--interval-ms', '1000', '--stable-reads', '2'])).toEqual({
      kind: 'browser_extension_deepseek_wait_message',
      sessionId: 'browserext_1',
      text: 'Final answer',
      role: 'assistant',
      limit: 10,
      timeoutMs: 45000,
      intervalMs: 1000,
      stableReads: 2,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'clear-network-events', 'browserext_1', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_clear_network_events',
      sessionId: 'browserext_1',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['opencli', 'status'])).toEqual({ kind: 'opencli_status', json: false });
    expect(parseOperatorCommand(['opencli', 'doctor', '--workspace', 'socials', '--owner-session', 'client_session_1'])).toEqual({
      kind: 'opencli_doctor',
      cwd: undefined,
      workspace: 'socials',
      ownerSessionId: 'client_session_1',
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['opencli', 'sites', '--json'])).toEqual({ kind: 'opencli_sites', json: true });
    expect(parseOperatorCommand(['opencli', 'commands', 'twitter'])).toEqual({
      kind: 'opencli_commands',
      site: 'twitter',
      json: false
    });
    expect(parseOperatorCommand(['opencli', 'workspace', 'list'])).toEqual({ kind: 'opencli_workspace_list', json: false });
    expect(parseOperatorCommand(['opencli', 'workspace', 'set', 'socials', 'C:\\hapus'])).toEqual({
      kind: 'opencli_workspace_set',
      name: 'socials',
      path: 'C:\\hapus',
      json: false
    });
    expect(parseOperatorCommand(['opencli', 'workspace', 'bind', 'client_session_1', 'socials'])).toEqual({
      kind: 'opencli_workspace_bind_session',
      sessionId: 'client_session_1',
      workspace: 'socials',
      json: false
    });
    expect(parseOperatorCommand(['opencli', 'run', 'hackernews', 'top', '--limit', '3', '--cwd', 'C:\\hapus'])).toEqual({
      kind: 'opencli_run',
      site: 'hackernews',
      command: 'top',
      args: ['--limit', '3'],
      cwd: 'C:\\hapus',
      workspace: undefined,
      ownerSessionId: undefined,
      timeoutMs: undefined,
      keepBrowserOpen: false,
      waitAfterMs: undefined,
      maximizeBrowser: false,
      json: false
    });
    expect(parseOperatorCommand(['opencli', 'run', 'twitter', 'search', 'rust', '--keep-browser-open', '--maximize-browser', '--wait-ms', '5000'])).toEqual({
      kind: 'opencli_run',
      site: 'twitter',
      command: 'search',
      args: ['rust'],
      cwd: undefined,
      workspace: undefined,
      ownerSessionId: undefined,
      timeoutMs: undefined,
      keepBrowserOpen: true,
      waitAfterMs: 5000,
      maximizeBrowser: true,
      json: false
    });
    expect(parseOperatorCommand(['hf', 'status'])).toEqual({ kind: 'hf_papers_status', json: false });
    expect(parseOperatorCommand(['hf', 'doctor', '--backend', 'cli', '--timeout-ms', '5000'])).toEqual({
      kind: 'hf_papers_doctor',
      backend: 'cli',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['hf', 'papers', 'search', 'llm reasoning', '--limit', '3', '--backend', 'api', '--include-raw', '--json'])).toEqual({
      kind: 'hf_papers_search',
      query: 'llm reasoning',
      limit: 3,
      backend: 'api',
      token: undefined,
      includeRaw: true,
      timeoutMs: undefined,
      json: true
    });
    expect(parseOperatorCommand(['hf', 'papers', 'info', '2601.15621', '--backend', 'cli'])).toEqual({
      kind: 'hf_papers_info',
      paperId: '2601.15621',
      backend: 'cli',
      token: undefined,
      includeRaw: false,
      timeoutMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['hf', 'papers', 'read', '2601.15621', '--save', 'C:\\tmp\\paper.md', '--timeout-ms', '4000'])).toEqual({
      kind: 'hf_papers_read',
      paperId: '2601.15621',
      backend: undefined,
      token: undefined,
      savePath: 'C:\\tmp\\paper.md',
      timeoutMs: 4000,
      json: false
    });
    expect(parseOperatorCommand(['hf', 'papers', 'ls', '--sort', 'trending', '--limit', '5', '--json'])).toEqual({
      kind: 'hf_papers_list_daily',
      date: undefined,
      week: undefined,
      month: undefined,
      submitter: undefined,
      sort: 'trending',
      limit: 5,
      backend: undefined,
      token: undefined,
      includeRaw: false,
      timeoutMs: undefined,
      json: true
    });
    expect(parseOperatorCommand(['twitter', 'search', 'rust', 'lang', '--mode', 'latest', '--limit', '3', '--workspace', 'socials', '--maximize-browser'])).toEqual({
      kind: 'twitter_search',
      query: 'rust lang',
      mode: 'latest',
      limit: 3,
      cwd: undefined,
      workspace: 'socials',
      ownerSessionId: undefined,
      timeoutMs: undefined,
      keepBrowserOpen: false,
      waitAfterMs: undefined,
      maximizeBrowser: true,
      json: false
    });
    expect(parseOperatorCommand(['twitter', 'timeline', '--type', 'following', '--limit', '10'])).toEqual({
      kind: 'twitter_timeline',
      timelineType: 'following',
      limit: 10,
      cwd: undefined,
      timeoutMs: undefined,
      workspace: undefined,
      ownerSessionId: undefined,
      keepBrowserOpen: false,
      waitAfterMs: undefined,
      maximizeBrowser: false,
      json: false
    });
    expect(parseOperatorCommand(['twitter', 'bookmarks', '--limit', '5'])).toEqual({
      kind: 'twitter_bookmarks',
      limit: 5,
      cwd: undefined,
      timeoutMs: undefined,
      workspace: undefined,
      ownerSessionId: undefined,
      keepBrowserOpen: false,
      waitAfterMs: undefined,
      maximizeBrowser: false,
      json: false
    });
    expect(parseOperatorCommand(['twitter', 'post', 'hello', 'from', 'sidofun'])).toEqual({
      kind: 'twitter_post',
      text: 'hello from sidofun',
      cwd: undefined,
      timeoutMs: undefined,
      workspace: undefined,
      ownerSessionId: undefined,
      keepBrowserOpen: false,
      waitAfterMs: undefined,
      maximizeBrowser: false,
      json: false
    });
    expect(parseOperatorCommand(['coder', 'list'])).toEqual({ kind: 'local_coder_list', json: false });
    expect(parseOperatorCommand(['coder', 'status', 'codex', '--json'])).toEqual({
      kind: 'local_coder_status',
      appId: 'codex',
      json: true
    });
    expect(parseOperatorCommand(['coder', 'open', 'qwen', 'Create', 'hello.js', '--dir', 'C:\\hapus\\test-qwen-3', '--delay-ms', '1500'])).toEqual({
      kind: 'local_coder_open',
      appId: 'qwen',
      prompt: 'Create hello.js',
      workingDirectory: 'C:\\hapus\\test-qwen-3',
      inputDelayMs: 1500,
      json: false
    });
    expect(parseOperatorCommand(['coder', 'resize', 'qwen', '1200', '900'])).toEqual({
      kind: 'local_coder_resize',
      appId: 'qwen',
      width: 1200,
      height: 900,
      json: false
    });
    expect(parseOperatorCommand(['coder', 'run', 'codex', 'make', 'hello', '--dir', 'C:\\hapus\\test-codex', '--timeout-ms', '5000'])).toEqual({
      kind: 'local_coder_run',
      appId: 'codex',
      prompt: 'make hello',
      workingDirectory: 'C:\\hapus\\test-codex',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'spawn', 'MyTerminal'])).toEqual({
      kind: 'cmd_spawn',
      title: 'MyTerminal',
      cwd: undefined,
      text: undefined,
      delayMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'spawn', '--dir', 'C:\\hapus'])).toEqual({
      kind: 'cmd_spawn',
      title: undefined,
      cwd: 'C:\\hapus',
      text: undefined,
      delayMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'spawn', 'MyTerminal', '--dir', 'C:\\hapus', '--text', 'echo hello\\n', '--delay-ms', '1200'])).toEqual({
      kind: 'cmd_spawn',
      title: 'MyTerminal',
      cwd: 'C:\\hapus',
      text: 'echo hello\\n',
      delayMs: 1200,
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'tabs'])).toEqual({ kind: 'cmd_list', json: false });
    expect(parseOperatorCommand(['pwsh', 'list', '--json'])).toEqual({ kind: 'pwsh_list', json: true });
  });

  test('parses session detail and activation commands', () => {
    expect(parseOperatorCommand(['terminal', 'status', 'cmd', '1'])).toEqual({
      kind: 'terminal_status',
      terminalKind: 'cmd',
      sessionId: '1',
      json: false
    });
    expect(parseOperatorCommand(['terminal', 'type', 'pwsh', 'pwsh_1', 'Get-Location\\n'])).toEqual({
      kind: 'terminal_type',
      terminalKind: 'pwsh',
      sessionId: 'pwsh_1',
      text: 'Get-Location\\n',
      json: false
    });
    expect(parseOperatorCommand(['scope', 'click', 'desktop_scope_1', '10', '20', '--button', 'right'])).toEqual({
      kind: 'desktop_scope_click',
      scopeId: 'desktop_scope_1',
      x: 10,
      y: 20,
      button: 'right',
      json: false
    });
    expect(parseOperatorCommand(['trajectory', 'append-turn', 'trajectory_1', '--turn-id', 'turn_1', '--prompt', 'hi'])).toEqual({
      kind: 'trajectory_append_turn',
      trajectoryId: 'trajectory_1',
      turnId: 'turn_1',
      role: undefined,
      prompt: 'hi',
      response: undefined,
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'type', '1', 'echo hello\\n'])).toEqual({
      kind: 'cmd_type',
      sessionId: '1',
      text: 'echo hello\\n',
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'exec', '1', 'dir'])).toEqual({
      kind: 'cmd_exec',
      sessionId: '1',
      command: 'dir',
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'screenshot', '1', '--file', 'cmd.png'])).toEqual({
      kind: 'cmd_screenshot',
      sessionId: '1',
      filename: 'cmd.png',
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'status', '2'])).toEqual({ kind: 'cmd_status', sessionId: '2', json: false });
    expect(parseOperatorCommand(['cmd', 'activate', 'sidofun'])).toEqual({
      kind: 'cmd_activate',
      titleQuery: 'sidofun',
      json: false
    });
    expect(parseOperatorCommand(['cmd', 'close', '2'])).toEqual({
      kind: 'cmd_close',
      sessionId: '2',
      json: false
    });
    expect(parseOperatorCommand(['pwsh', 'spawn', 'MyPowerShell'])).toEqual({
      kind: 'pwsh_spawn',
      title: 'MyPowerShell',
      cwd: undefined,
      text: undefined,
      delayMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['pwsh', 'spawn', 'MyPowerShell', '--dir', 'C:\\hapus'])).toEqual({
      kind: 'pwsh_spawn',
      title: 'MyPowerShell',
      cwd: 'C:\\hapus',
      text: undefined,
      delayMs: undefined,
      json: false
    });
    expect(parseOperatorCommand(['pwsh', 'spawn', 'MyPowerShell', '--dir', 'C:\\hapus', '--text', 'Get-Location\\n', '--delay-ms', '900'])).toEqual({
      kind: 'pwsh_spawn',
      title: 'MyPowerShell',
      cwd: 'C:\\hapus',
      text: 'Get-Location\\n',
      delayMs: 900,
      json: false
    });
    expect(parseOperatorCommand(['pwsh', 'type', 'pwsh_1', 'Get-Location\\n', '--json'])).toEqual({
      kind: 'pwsh_type',
      sessionId: 'pwsh_1',
      text: 'Get-Location\\n',
      json: true
    });
    expect(parseOperatorCommand(['pwsh', 'focus', 'pwsh_1', '--json'])).toEqual({
      kind: 'pwsh_focus',
      sessionId: 'pwsh_1',
      json: true
    });
    expect(parseOperatorCommand(['pwsh', 'exec', 'pwsh_1', 'Get-Location'])).toEqual({
      kind: 'pwsh_exec',
      sessionId: 'pwsh_1',
      command: 'Get-Location',
      json: false
    });
    expect(parseOperatorCommand(['pwsh', 'screenshot', 'pwsh_1', '--file', 'pwsh.png'])).toEqual({
      kind: 'pwsh_screenshot',
      sessionId: 'pwsh_1',
      filename: 'pwsh.png',
      json: false
    });
    expect(parseOperatorCommand(['pwsh', 'close', 'pwsh_1'])).toEqual({
      kind: 'pwsh_close',
      sessionId: 'pwsh_1',
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'edit-message', 'browserext_1', 'Rewrite', 'this', '--role', 'user', '--offset', '0', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_edit_message',
      sessionId: 'browserext_1',
      text: 'Rewrite this',
      role: 'user',
      offset: 0,
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'chatgpt', 'rewrite-thread', 'browserext_1', 'Rewrite', 'this', '--role', 'user', '--offset', '0', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_chatgpt_rewrite_thread',
      sessionId: 'browserext_1',
      text: 'Rewrite this',
      role: 'user',
      offset: 0,
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'edit-message', 'browserext_1', 'Rewrite', 'this', '--role', 'user', '--offset', '0', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_edit_message',
      sessionId: 'browserext_1',
      text: 'Rewrite this',
      role: 'user',
      offset: 0,
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'deepseek', 'rewrite-thread', 'browserext_1', 'Rewrite', 'this', '--role', 'user', '--offset', '0', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_deepseek_rewrite_thread',
      sessionId: 'browserext_1',
      text: 'Rewrite this',
      role: 'user',
      offset: 0,
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'inspect', 'browserext_1', 'textarea', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_inspect',
      sessionId: 'browserext_1',
      selector: 'textarea',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'inspect-all', 'browserext_1', 'a[href]', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_inspect_all',
      sessionId: 'browserext_1',
      selector: 'a[href]',
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'actionables', 'browserext_1', '--selector', 'main', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_actionables',
      sessionId: 'browserext_1',
      selector: 'main',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'page-state', 'browserext_1', '--selector', 'main', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--max-depth', '4', '--max-children', '16', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_page_state',
      sessionId: 'browserext_1',
      selector: 'main',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      maxDepth: 4,
      maxChildren: 16,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'page-blockers', 'browserext_1', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_page_blockers',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-active-filters', 'browserext_1', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_active_filters',
      sessionId: 'browserext_1',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-sort-state', 'browserext_1', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_sort_state',
      sessionId: 'browserext_1',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-filter-tokens', 'browserext_1', '--collection', 'Users', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_filter_tokens',
      sessionId: 'browserext_1',
      collectionQuery: 'Users',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'next-actions', 'browserext_1', '--selector', 'main', '--frame', 'iframe[name="checkout"]', '--limit', '12', '--max-depth', '4', '--max-children', '16', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_next_actions',
      sessionId: 'browserext_1',
      selector: 'main',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 12,
      maxDepth: 4,
      maxChildren: 16,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'locate', 'browserext_1', 'Email', '--by', 'text', '--selector', 'main', '--frame', 'iframe[name="checkout"]', '--max-depth', '3', '--max-children', '12', '--limit', '5', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_locate',
      sessionId: 'browserext_1',
      query: 'Email',
      by: 'text',
      selector: 'main',
      frameSelectors: ['iframe[name="checkout"]'],
      maxDepth: 3,
      maxChildren: 12,
      limit: 5,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'click-query', 'browserext_1', 'Submit', '--by', 'text', '--selector', 'main', '--frame', 'iframe[name="checkout"]', '--max-depth', '3', '--max-children', '12', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_click_query',
      sessionId: 'browserext_1',
      query: 'Submit',
      by: 'text',
      selector: 'main',
      frameSelectors: ['iframe[name="checkout"]'],
      maxDepth: 3,
      maxChildren: 12,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'links', 'browserext_1', '--limit', '20', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_links',
      sessionId: 'browserext_1',
      limit: 20,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'markdown', 'browserext_1', '--selector', 'main', '--frame', 'iframe[name="embedded-workflow"]', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_markdown',
      sessionId: 'browserext_1',
      selector: 'main',
      frameSelectors: ['iframe[name="embedded-workflow"]'],
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'readability', 'browserext_1', '--selector', 'article', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_readability',
      sessionId: 'browserext_1',
      selector: 'article',
      frameSelectors: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'dialogs', 'browserext_1', '--frame', 'iframe[name="modal-frame"]', '--limit', '5', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_dialogs',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="modal-frame"]'],
      limit: 5,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'dialog-actions', 'browserext_1', 'Cookie banner', '--exact', '--frame', 'iframe[name="modal-frame"]', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_dialog_actions',
      sessionId: 'browserext_1',
      query: 'Cookie banner',
      exact: true,
      frameSelectors: ['iframe[name="modal-frame"]'],
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'dialog-close', 'browserext_1', 'Cookie banner', '--exact', '--frame', 'iframe[name="modal-frame"]', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_dialog_close',
      sessionId: 'browserext_1',
      query: 'Cookie banner',
      exact: true,
      frameSelectors: ['iframe[name="modal-frame"]'],
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'dialog-action', 'browserext_1', 'Accept', '--dialog', 'Cookie banner', '--exact', '--frame', 'iframe[name="modal-frame"]', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_dialog_action',
      sessionId: 'browserext_1',
      actionQuery: 'Accept',
      dialogQuery: 'Cookie banner',
      exact: true,
      frameSelectors: ['iframe[name="modal-frame"]'],
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'menus', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_menus',
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'menu-select', 'browserext_1', 'Dark', '--menu', 'Theme', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_menu_select',
      sessionId: 'browserext_1',
      optionQuery: 'Dark',
      menuQuery: 'Theme',
      exact: true,
      frameSelectors: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'disclosures', 'browserext_1', '--limit', '10', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_disclosures',
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      limit: 10,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'disclosure-toggle', 'browserext_1', 'Advanced settings', '--state', 'open', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_disclosure_toggle',
      sessionId: 'browserext_1',
      query: 'Advanced settings',
      desiredState: 'open',
      frameSelectors: undefined,
      exact: false,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-dialog', 'browserext_1', 'Cookie banner', '--frame', 'iframe[name=\"modal-frame\"]', '--limit', '5', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_dialog',
      sessionId: 'browserext_1',
      query: 'Cookie banner',
      frameSelectors: ['iframe[name="modal-frame"]'],
      limit: 5,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-no-dialog', 'browserext_1', 'Cookie banner', '--limit', '5', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_no_dialog',
      sessionId: 'browserext_1',
      query: 'Cookie banner',
      frameSelectors: undefined,
      limit: 5,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-menu', 'browserext_1', 'Theme', '--limit', '5', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_menu',
      sessionId: 'browserext_1',
      query: 'Theme',
      frameSelectors: undefined,
      limit: 5,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-no-menu', 'browserext_1', 'Theme', '--limit', '5', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_no_menu',
      sessionId: 'browserext_1',
      query: 'Theme',
      frameSelectors: undefined,
      limit: 5,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-disclosure', 'browserext_1', 'Advanced settings', '--state', 'open', '--limit', '5', '--timeout-ms', '30000', '--interval-ms', '500'])).toEqual({
      kind: 'browser_extension_wait_disclosure',
      sessionId: 'browserext_1',
      query: 'Advanced settings',
      state: 'open',
      frameSelectors: undefined,
      limit: 5,
      timeoutMs: 30000,
      intervalMs: 500,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collections', 'browserext_1', '--frame', 'iframe[name="results"]', '--limit', '8', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collections',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="results"]'],
      limit: 8,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-controls', 'browserext_1', '--collection', 'Search results', '--frame', 'iframe[name="results"]', '--limit', '8', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_controls',
      sessionId: 'browserext_1',
      collectionQuery: 'Search results',
      frameSelectors: ['iframe[name="results"]'],
      limit: 8,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-rows', 'browserext_1', '--collection', 'Search results', '--frame', 'iframe[name="results"]', '--limit', '8', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_rows',
      sessionId: 'browserext_1',
      collectionQuery: 'Search results',
      frameSelectors: ['iframe[name="results"]'],
      limit: 8,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-values-diff', 'browserext_1', 'Owner', '--against-file', 'baseline.json', '--row', 'Result Alpha', '--collection', 'Search results', '--frame', 'iframe[name="results"]', '--limit', '25', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_values_diff',
      sessionId: 'browserext_1',
      cellQuery: 'Owner',
      againstFile: 'baseline.json',
      rowQuery: 'Result Alpha',
      collectionQuery: 'Search results',
      frameSelectors: ['iframe[name="results"]'],
      limit: 25,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-stats-diff', 'browserext_1', '--against-file', 'baseline.json', '--cell', 'Status', '--collection', 'Search results', '--frame', 'iframe[name="results"]', '--limit', '25', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_stats_diff',
      sessionId: 'browserext_1',
      againstFile: 'baseline.json',
      cellQuery: 'Status',
      collectionQuery: 'Search results',
      frameSelectors: ['iframe[name="results"]'],
      limit: 25,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-row', 'browserext_1', 'Result Alpha', '--collection', 'Search results', '--limit', '25', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_row',
      sessionId: 'browserext_1',
      rowQuery: 'Result Alpha',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      limit: 25,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-cell', 'browserext_1', 'Result Alpha', 'Owner', '--collection', 'Search results', '--limit', '25', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_cell',
      sessionId: 'browserext_1',
      rowQuery: 'Result Alpha',
      cellQuery: 'Owner',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      limit: 25,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-collection-row', 'browserext_1', 'Result Alpha', '--collection', 'Search results', '--limit', '25', '--exact', '--timeout-ms', '5000', '--interval-ms', '250'])).toEqual({
      kind: 'browser_extension_wait_collection_row',
      sessionId: 'browserext_1',
      rowQuery: 'Result Alpha',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      limit: 25,
      exact: true,
      timeoutMs: 5000,
      intervalMs: 250,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-collection-count', 'browserext_1', '20', '--collection', 'Search results', '--limit', '30', '--exact', '--timeout-ms', '5000', '--interval-ms', '250'])).toEqual({
      kind: 'browser_extension_wait_collection_count',
      sessionId: 'browserext_1',
      count: 20,
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      limit: 30,
      exact: true,
      timeoutMs: 5000,
      intervalMs: 250,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'banners', 'browserext_1', '--frame', 'iframe[name="results"]', '--limit', '5', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_banners',
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="results"]'],
      limit: 5,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'banner-dismiss', 'browserext_1', 'Saved', '--frame', 'iframe[name="results"]', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_banner_dismiss',
      sessionId: 'browserext_1',
      query: 'Saved',
      frameSelectors: ['iframe[name="results"]'],
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'loading-states', 'browserext_1', '--limit', '5', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_loading_states',
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      limit: 5,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'empty-states', 'browserext_1', '--limit', '5', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_empty_states',
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      limit: 5,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-row-actions', 'browserext_1', 'Result Alpha', '--collection', 'Search results', '--frame', 'iframe[name="results"]', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_row_actions',
      sessionId: 'browserext_1',
      rowQuery: 'Result Alpha',
      collectionQuery: 'Search results',
      frameSelectors: ['iframe[name="results"]'],
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-selection-state', 'browserext_1', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_selection_state',
      sessionId: 'browserext_1',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-sort', 'browserext_1', 'Created', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_sort',
      sessionId: 'browserext_1',
      valueQuery: 'Created',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-filter', 'browserext_1', 'Search', 'alpha', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_filter',
      sessionId: 'browserext_1',
      query: 'Search',
      value: 'alpha',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-click', 'browserext_1', 'Result Alpha', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_click',
      sessionId: 'browserext_1',
      itemQuery: 'Result Alpha',
      collectionQuery: 'Search results',
      exact: true,
      frameSelectors: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-row-click', 'browserext_1', 'Result Alpha', '--action', 'Open', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_row_click',
      sessionId: 'browserext_1',
      rowQuery: 'Result Alpha',
      actionQuery: 'Open',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-row-select', 'browserext_1', 'Result Alpha', '--state', 'on', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_row_select',
      sessionId: 'browserext_1',
      rowQuery: 'Result Alpha',
      desiredState: 'on',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-select-all', 'browserext_1', '--state', 'off', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_select_all',
      sessionId: 'browserext_1',
      desiredState: 'off',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-row-details', 'browserext_1', 'Result Alpha', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_row_details',
      sessionId: 'browserext_1',
      rowQuery: 'Result Alpha',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-row-expand', 'browserext_1', 'Result Alpha', '--state', 'open', '--collection', 'Search results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_row_expand',
      sessionId: 'browserext_1',
      rowQuery: 'Result Alpha',
      desiredState: 'open',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-bulk-action', 'browserext_1', '--row', 'Result Alpha', '--row', 'Result Beta', '--action', 'Open', '--collection', 'Search results', '--exact', '--continue-on-error', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_bulk_action',
      sessionId: 'browserext_1',
      rowQueries: ['Result Alpha', 'Result Beta'],
      actionQuery: 'Open',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      continueOnError: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-export', 'browserext_1', '--collection', 'Search results', '--include-selection', '--include-details', '--format', 'markdown', '--file', 'out.md', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_export',
      sessionId: 'browserext_1',
      collectionQuery: 'Search results',
      frameSelectors: undefined,
      exact: true,
      includeSelection: true,
      includeDetails: true,
      format: 'markdown',
      filePath: 'out.md',
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'wait-collection-diff', 'browserext_1', '--against-file', 'baseline.json', '--collection', 'Search results', '--dedupe-by', 'cells', '--include-selection', '--include-details', '--added-at-least', '1', '--removed-at-least', '2', '--changed-at-least', '3', '--unchanged-at-least', '4', '--row-added', 'Result Gamma', '--row-removed', 'Result Alpha', '--row-changed', 'Result Beta', '--exact', '--timeout-ms', '5000', '--interval-ms', '250'])).toEqual({
      kind: 'browser_extension_wait_collection_diff',
      sessionId: 'browserext_1',
      collectionQuery: 'Search results',
      againstFile: 'baseline.json',
      frameSelectors: undefined,
      exact: true,
      dedupeBy: 'cells',
      includeSelection: true,
      includeDetails: true,
      addedAtLeast: 1,
      removedAtLeast: 2,
      changedAtLeast: 3,
      unchangedAtLeast: 4,
      rowAdded: 'Result Gamma',
      rowRemoved: 'Result Alpha',
      rowChanged: 'Result Beta',
      timeoutMs: 5000,
      intervalMs: 250,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'paginations', 'browserext_1', '--limit', '5', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_paginations',
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      limit: 5,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'pagination-click', 'browserext_1', 'Next', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_pagination_click',
      sessionId: 'browserext_1',
      query: 'Next',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'load-more', 'browserext_1', 'Load more results', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_load_more',
      sessionId: 'browserext_1',
      query: 'Load more results',
      frameSelectors: undefined,
      exact: true,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-harvest', 'browserext_1', '--collection', 'Search results', '--strategy', 'scroll', '--limit', '50', '--max-iterations', '8', '--stable-iterations', '3', '--settle-quiet-ms', '1200', '--exact', '--timeout-ms', '5000'])).toEqual({
      kind: 'browser_extension_collection_harvest',
      sessionId: 'browserext_1',
      collectionQuery: 'Search results',
      strategy: 'scroll',
      frameSelectors: undefined,
      exact: true,
      limit: 50,
      maxIterations: 8,
      stableIterations: 3,
      settleQuietMs: 1200,
      dedupeBy: undefined,
      scrollAmount: undefined,
      timeoutMs: 5000,
      json: false
    });
    expect(parseOperatorCommand(['browserext', 'collection-harvest', 'browserext_1', '--collection', 'Search results', '--strategy', 'scroll', '--dedupe-by', 'cells', '--scroll-amount', '0.75', '--json'])).toEqual({
      kind: 'browser_extension_collection_harvest',
      sessionId: 'browserext_1',
      collectionQuery: 'Search results',
      strategy: 'scroll',
      frameSelectors: undefined,
      exact: false,
      limit: undefined,
      maxIterations: undefined,
      stableIterations: undefined,
      settleQuietMs: undefined,
      dedupeBy: 'cells',
      scrollAmount: 0.75,
      timeoutMs: undefined,
      json: true
    });
  });

  test('returns help and rejects unknown commands', () => {
    expect(parseOperatorCommand([])).toEqual({ kind: 'help' });
    expect(getOperatorHelpText()).toContain('Sidofun Operator CLI');
    expect(getOperatorHelpText()).toContain('sidofun clipboard read');
    expect(getOperatorHelpText()).toContain('sidofun config get [key]');
    expect(getOperatorHelpText()).toContain('sidofun config set <key> <value>');
    expect(getOperatorHelpText()).toContain('sidofun session create');
    expect(getOperatorHelpText()).toContain('sidofun session resources');
    expect(getOperatorHelpText()).toContain('sidofun session owners');
    expect(getOperatorHelpText()).toContain('sidofun session claim');
    expect(getOperatorHelpText()).toContain('sidofun trace start');
    expect(getOperatorHelpText()).toContain('--owner-session <id>');
    expect(getOperatorHelpText()).toContain('sidofun trace export <trace-id>');
    expect(getOperatorHelpText()).toContain('sidofun trajectory append-turn');
    expect(getOperatorHelpText()).toContain('sidofun trajectory export <trajectory-id>');
    expect(getOperatorHelpText()).toContain('sidofun scope create');
    expect(getOperatorHelpText()).toContain('sidofun scope screenshot <scope-id>');
    expect(getOperatorHelpText()).toContain('sidofun shell run <command>');
    expect(getOperatorHelpText()).toContain('sidofun terminal spawn <cmd|pwsh>');
    expect(getOperatorHelpText()).toContain('--dir <path>');
    expect(getOperatorHelpText()).toContain('sidofun browser launch firefox --profile default-release --url https://gmail.com');
    expect(getOperatorHelpText()).toContain('sidofun browserext status');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-provider');
    expect(getOperatorHelpText()).toContain('sidofun browserext workspace set <name> <path>');
    expect(getOperatorHelpText()).toContain('sidofun browserext session create');
    expect(getOperatorHelpText()).toContain('sidofun browserext session refresh <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext session reconnect <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext session wait-ready <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext tabs <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext frames <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext back <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext forward <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext reload <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext inspect <session-id> <selector>');
    expect(getOperatorHelpText()).toContain('sidofun browserext inspect-all <session-id> <selector>');
    expect(getOperatorHelpText()).toContain('sidofun browserext locate <session-id> <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext click-query <session-id> <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext links <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext markdown <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext page-diff <session-id> --against-file <path>');
    expect(getOperatorHelpText()).toContain('sidofun browserext dialogs <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext dialog-actions <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-dialog <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-no-dialog <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-menu <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-no-menu <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-disclosure <session-id> <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-page-diff <session-id> --against-file <path>');
    expect(getOperatorHelpText()).toContain('sidofun browserext banners <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext banner-dismiss <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext loading-states <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext empty-states <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext dialog-close <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext dialog-action <session-id> [action-query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext menus <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext menu-select <session-id> <option-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext disclosures <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext disclosure-toggle <session-id> <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collections <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-controls <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-rows <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-values-diff <session-id> <cell-query> --against-file <path>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-stats-diff <session-id> --against-file <path>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-row <session-id> <row-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-cell <session-id> <row-query> <cell-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-collection-row <session-id> <row-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-collection-count <session-id> <count>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-row-actions <session-id> <row-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-selection-state <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-sort <session-id> <value-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-filter <session-id> <query> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-click <session-id> <item-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-row-click <session-id> <row-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-row-select <session-id> <row-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-select-all <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-row-details <session-id> <row-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-row-expand <session-id> <row-query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-bulk-action <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-export <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-collection-diff <session-id> --against-file <path>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-filter-tokens <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-filter-token-clear <session-id> <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext paginations <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext pagination-click <session-id> <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext load-more <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-harvest <session-id>');
    expect(getOperatorHelpText()).toContain('--dedupe-by <auto|selector|text|cells>');
    expect(getOperatorHelpText()).toContain('--scroll-amount <n>');
    expect(getOperatorHelpText()).toContain('sidofun browserext workflow-run [session-id] --file <path> [--session <id>] [--var "<name>=<value>"]... [--json]');
    expect(getOperatorHelpText()).toContain('sidofun browserext context-state <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext workflow-diagnose [session-id] --file <path> [--session <id>] [--var "<name>=<value>"]... [--json]');
    expect(getOperatorHelpText()).toContain('sidofun browserext workflow-validate --file <path> [--json]');
    expect(getOperatorHelpText()).toContain('sidofun browserext readability <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext navigate <session-id> <url>');
    expect(getOperatorHelpText()).toContain('sidofun browserext snapshot <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext scroll-page <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext dom-tree <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext screenshot <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext metadata <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext url-parts <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext storage-list <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext storage-get <session-id> <key>');
    expect(getOperatorHelpText()).toContain('sidofun browserext storage-set <session-id> <key> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext storage-remove <session-id> <key>');
    expect(getOperatorHelpText()).toContain('sidofun browserext eval <session-id> <expression>');
    expect(getOperatorHelpText()).toContain('sidofun browserext click <session-id> <selector>');
    expect(getOperatorHelpText()).toContain('sidofun browserext type <session-id> <selector> <text>');
    expect(getOperatorHelpText()).toContain('sidofun browserext press <session-id> <key>');
    expect(getOperatorHelpText()).toContain('sidofun browserext editor-read <session-id> <selector>');
    expect(getOperatorHelpText()).toContain('sidofun browserext editor-fill <session-id> <selector> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-fill <session-id> <selector> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-fill-human <session-id> <selector> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-fill-many <session-id> --field "<selector>=<value>"');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-workflow <session-id> --field "<query>=<value>"');
    expect(getOperatorHelpText()).toContain('sidofun browserext query-plan <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext query-workflow <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext context-plan <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext next-actions <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext page-blockers <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext page-outcomes <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext page-recover <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext page-ready <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-active-filters <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-sort-state <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-fields <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-contexts <session-id>');
    expect(getOperatorHelpText()).toContain('--frame-query <text>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-find-field <session-id> <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-segmented-options <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-segmented-select <session-id> <group-query> <option>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-options <session-id> <selector>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-fill-label <session-id> <query> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-fill-query <session-id> <query> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-range-set <session-id> <query> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-select <session-id> <selector> <option>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-upload <session-id> <selector> <file-path>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-combobox-options <session-id> <selector>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-combobox-select <session-id> <selector> <option>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-submit <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext form-submit-wait <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-no-blockers <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-banner <session-id> <text>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-no-banner <session-id> [text]');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-page-outcome <session-id> <loading|blocked|error|warning|success|empty|ready>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-no-collection-filters <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-filter-clear <session-id> <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext collection-clear-all-filters <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext auth-login <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext auth-signup <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext cookies <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext cookie-get <session-id> <name>');
    expect(getOperatorHelpText()).toContain('sidofun browserext cookie-set <session-id> <name> <value>');
    expect(getOperatorHelpText()).toContain('sidofun browserext cookie-remove <session-id> <name>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-cookie <session-id> <name>');
    expect(getOperatorHelpText()).toContain('sidofun browserext downloads <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext download-cancel <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext download-erase <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-download <session-id> [query]');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt ask <session-id> <prompt>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt ask-thread <session-id> <prompt>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt continue <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt response-controls <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt previous-response <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt next-response <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt list-response-versions <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt select-response-version <session-id> <index>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt read-message <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt current-conversation <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt export-thread <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek response-controls <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek previous-response <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek next-response <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek list-response-versions <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek select-response-version <session-id> <index>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek ask <session-id> <prompt>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek ask-thread <session-id> <prompt>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek continue <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek read-message <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek current-conversation <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek export-thread <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext x search [session-id] <query>');
    expect(getOperatorHelpText()).toContain('sidofun browserext x notifications [session-id]');
    expect(getOperatorHelpText()).toContain('sidofun browserext x read-thread [session-id] <post-url>');
    expect(getOperatorHelpText()).toContain('sidofun browserext x follow [session-id] <handle|url>');
    expect(getOperatorHelpText()).toContain('sidofun browserext network-events <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext dom-events <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext session-events <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext clear-session-events <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-url <session-id> <text>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-selector <session-id> <selector>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-no-selector <session-id> <selector>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-text <session-id> <text>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-dom-quiet <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-network-idle <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext wait-page-stable <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext chatgpt wait-message <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext deepseek wait-message <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext clear-network-events <session-id>');
    expect(getOperatorHelpText()).toContain('sidofun browserext clear-dom-events <session-id>');
    expect(getOperatorHelpText()).toContain('--require-text <text>');
    expect(getOperatorHelpText()).toContain('--require-no-selector <selector>');
    expect(getOperatorHelpText()).toContain('--settle-after-each <dom|network|page>');
    expect(getOperatorHelpText()).toContain('--url-includes');
    expect(getOperatorHelpText()).toContain('--stage');
    expect(getOperatorHelpText()).toContain('--method');
    expect(getOperatorHelpText()).toContain('--mutation-type');
    expect(getOperatorHelpText()).toContain('--text-includes');
    expect(getOperatorHelpText()).toContain('sidofun opencli status');
    expect(getOperatorHelpText()).toContain('sidofun opencli doctor');
    expect(getOperatorHelpText()).toContain('sidofun opencli workspace set <name> <path>');
    expect(getOperatorHelpText()).toContain('sidofun hf status');
    expect(getOperatorHelpText()).toContain('sidofun hf papers search');
    expect(getOperatorHelpText()).toContain('sidofun twitter search <query>');
    expect(getOperatorHelpText()).toContain('--workspace <name>');
    expect(getOperatorHelpText()).toContain('--keep-browser-open');
    expect(getOperatorHelpText()).toContain('--maximize-browser');
    expect(getOperatorHelpText()).toContain('--wait-ms <n>');
    expect(getOperatorHelpText()).toContain('sidofun coder list');
    expect(getOperatorHelpText()).toContain('sidofun coder open codex');
    expect(getOperatorHelpText()).toContain('sidofun coder open <codex|opencode|qwen> [prompt]');
    expect(getOperatorHelpText()).toContain('sidofun coder run <codex|opencode|qwen> <prompt>');
    expect(getOperatorHelpText()).toContain('--private');
    expect(getOperatorHelpText()).toContain(`sidofun cmd type 1 "echo hello
"`);
    expect(getOperatorHelpText()).toContain('sidofun cmd screenshot <session-id|index>');
    expect(getOperatorHelpText()).toContain('sidofun pwsh screenshot <session-id|index>');
    expect(getOperatorHelpText()).toContain('--text <text>');
    expect(getOperatorHelpText()).toContain('--delay-ms <n>');
    expect(getOperatorHelpText()).toContain('Typing Language:');
    expect(() => parseOperatorCommand(['unknown'])).toThrow('Unknown command: unknown');
  });
});
