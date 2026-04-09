/**
 * WebSocket REPL Test Client
 *
 * Interactive command-line client for testing the desktop-win WebSocket server.
 * Supports all WebSocket message types: action, batch, subscribe, query, stream, cmd.
 */

import WebSocket from 'ws';

// ==============================
// Configuration
// ==============================

const DEFAULT_WS_URL = 'ws://localhost:9995/ws';
const RECONNECT_DELAY = 3000;

interface ClientConfig {
  url: string;
  reconnect: boolean;
  debug: boolean;
}

// ==============================
// Message ID Generator
// ==============================

class MessageIdGenerator {
  private counter = 0;

  generate(): string {
    return `client_${Date.now()}_${this.counter++}`;
  }
}

// ==============================
// Response Tracker
// ==============================

class ResponseTracker {
  private pending = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  private readonly TIMEOUT = 30000;

  register(messageId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(messageId);
        reject(new Error(`Response timeout for message: ${messageId}`));
      }, this.TIMEOUT);

      this.pending.set(messageId, { resolve, reject, timeout });
    });
  }

  resolve(messageId: string, response: any): void {
    const pending = this.pending.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(response);
      this.pending.delete(messageId);
    }
  }

  reject(messageId: string, error: Error): void {
    const pending = this.pending.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pending.delete(messageId);
    }
  }

  clear(): void {
    for (const { timeout } of this.pending.values()) {
      clearTimeout(timeout);
    }
    this.pending.clear();
  }
}

// ==============================
// WebSocket Client
// ==============================

class DesktopWinClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private connected = false;
  private idGen = new MessageIdGenerator();
  private tracker = new ResponseTracker();
  private config: ClientConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers = new Map<string, (data: any) => void>();

  constructor(config: Partial<ClientConfig> = {}) {
    this.config = {
      url: config.url || DEFAULT_WS_URL,
      reconnect: config.reconnect ?? true,
      debug: config.debug ?? false
    };
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Connecting to', this.config.url);

      this.ws = new WebSocket(this.config.url);

      this.ws.on('open', () => {
        this.log('✅ Connected');
        this.connected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        this.log('🔌 Disconnected');
        this.connected = false;
        this.sessionId = null;

        if (this.config.reconnect) {
          this.log(`Reconnecting in ${RECONNECT_DELAY}ms...`);
          this.reconnectTimer = setTimeout(() => {
            this.connect().catch(err => this.error('Reconnect failed:', err));
          }, RECONNECT_DELAY);
        }
      });

      this.ws.on('error', (err: Error) => {
        this.error('WebSocket error:', err.message);
        reject(err);
      });
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.config.reconnect = false;
    this.tracker.clear();
    if (this.ws) {
      this.ws.close();
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  /**
   * Send a message and wait for response
   */
  async send(type: string, payload: any = {}): Promise<any> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected');
    }

    const id = this.idGen.generate();
    const message = { id, type, timestamp: new Date().toISOString(), payload };

    this.debug('Sending:', message);
    this.ws.send(JSON.stringify(message));

    return this.tracker.register(id);
  }

  /**
   * Execute an action
   */
  async action(actionName: string, params: Record<string, any> = {}): Promise<any> {
    return this.send('action', { action: actionName, params });
  }

  /**
   * Execute batch actions
   */
  async batch(actions: Array<{ action: string; params?: Record<string, any> }>): Promise<any> {
    return this.send('batch', { actions });
  }

  /**
   * Subscribe to events
   */
  async subscribe(events: string[]): Promise<any> {
    return this.send('subscribe', { events });
  }

  /**
   * Query state
   */
  async query(queryType: string): Promise<any> {
    return this.send('query', { query: queryType });
  }

  /**
   * Start/stop stream
   */
  async stream(command: 'start' | 'stop', streamType: string, interval?: number): Promise<any> {
    return this.send('stream', { command, stream: streamType, interval });
  }

  // ============================
  // CMD Operations
  // ============================

  /**
   * Spawn a new CMD window
   */
  async cmdSpawn(title?: string): Promise<any> {
    return this.send('cmd', { action: 'spawn', params: { title } });
  }

  /**
   * Attach to existing CMD window
   */
  async cmdAttach(titlePattern: string): Promise<any> {
    return this.send('cmd', { action: 'attach', params: { titlePattern } });
  }

  /**
   * Execute command in CMD
   */
  async cmdExec(sessionId: string, command: string, options: {
    wait?: boolean;
    timeout?: number;
    screenshot?: boolean;
  } = {}): Promise<any> {
    return this.send('cmd', {
      action: 'exec',
      params: { sessionId, command, options }
    });
  }

  /**
   * Type text into CMD
   */
  async cmdType(sessionId: string, text: string): Promise<any> {
    return this.send('cmd', { action: 'type', params: { sessionId, text } });
  }

  /**
   * Press key in CMD
   */
  async cmdPress(sessionId: string, key: string): Promise<any> {
    return this.send('cmd', { action: 'press', params: { sessionId, key } });
  }

  /**
   * Screenshot CMD window
   */
  async cmdScreenshot(sessionId: string): Promise<any> {
    return this.send('cmd', { action: 'screenshot', params: { sessionId } });
  }

  /**
   * Send Ctrl+C (break)
   */
  async cmdBreak(sessionId: string): Promise<any> {
    return this.send('cmd', { action: 'break', params: { sessionId } });
  }

  /**
   * Send Ctrl+Z (EOF)
   */
  async cmdEOF(sessionId: string): Promise<any> {
    return this.send('cmd', { action: 'eof', params: { sessionId } });
  }

  /**
   * Close CMD session
   */
  async cmdClose(sessionId: string): Promise<any> {
    return this.send('cmd', { action: 'close', params: { sessionId } });
  }

  /**
   * List all CMD sessions
   */
  async cmdList(): Promise<any> {
    return this.send('cmd', { action: 'list', params: {} });
  }

  /**
   * Get CMD session info
   */
  async cmdGetInfo(sessionId: string): Promise<any> {
    return this.send('cmd', { action: 'get_info', params: { sessionId } });
  }

  // ============================
  // Message Handler
  // ============================

  private handleMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      this.debug('Received:', message);

      switch (message.type) {
        case 'connected':
          this.sessionId = message.payload.sessionId;
          this.log('🎉 Session established:', this.sessionId);
          this.log('Capabilities:', message.payload.capabilities);
          break;

        case 'response':
        case 'batch_response':
          this.tracker.resolve(message.id, message.payload);
          break;

        case 'error':
          this.tracker.reject(message.id, new Error(`${message.payload.code}: ${message.payload.message}`));
          break;

        case 'event':
          const handler = this.eventHandlers.get(message.payload.event);
          if (handler) {
            handler(message.payload.data);
          } else {
            this.log('📡 Event:', message.payload.event, message.payload.data);
          }
          break;

        case 'heartbeat':
          // Heartbeats are logged only in debug mode
          this.debug('💓 Heartbeat');
          break;

        default:
          this.log('Unknown message type:', message.type);
      }
    } catch (err: any) {
      this.error('Failed to parse message:', err.message);
    }
  }

  /**
   * Register event handler
   */
  on(event: string, handler: (data: any) => void): void {
    this.eventHandlers.set(event, handler);
  }

  /**
   * Get connection state
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  // ============================
  // Logging
  // ============================

  private log(...args: any[]): void {
    console.log('[Client]', ...args);
  }

  private error(...args: any[]): void {
    console.error('[Client]', ...args);
  }

  private debug(...args: any[]): void {
    if (this.config.debug) {
      console.log('[Client Debug]', ...args);
    }
  }
}

// ==============================
// REPL Interface
// ============================

class REPL {
  private client: DesktopWinClient;
  private running = true;

  constructor(client: DesktopWinClient) {
    this.client = client;
  }

  async start(): Promise<void> {
    console.log('\n🚀 Desktop.Win WebSocket REPL');
    console.log('Type "help" for available commands\n');

    // Wait for connection
    await this.client.connect();

    this.showPrompt();

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => this.handleInput(data.toString().trim()));
  }

  private handleInput(input: string): void {
    if (!this.running) return;

    if (input === '') {
      this.showPrompt();
      return;
    }

    const [cmd, ...args] = input.split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;

      case 'quit':
      case 'exit':
        this.running = false;
        this.client.disconnect();
        process.exit(0);
        break;

      case 'status':
        this.showStatus();
        break;

      // Action commands
      case 'screenshot':
      case 'screenshot_raw':
      case 'screenshot_all':
      case 'screenshot_secondary':
      case 'screenshot_win32':
        const screenshotParams: any = {};
        for (const arg of args) {
          if (arg.startsWith('filename:')) {
            screenshotParams.filename = arg.substring(9);
          } else if (arg.startsWith('returnBase64:')) {
            screenshotParams.returnBase64 = arg.substring(13) === 'true';
          } else if (arg.startsWith('scale:')) {
            const scaleVal = arg.substring(6);
            // Parse as number if it's numeric, otherwise keep as string
            screenshotParams.scale = isNaN(Number(scaleVal)) ? scaleVal : Number(scaleVal);
          }
        }
        this.executeCommand(cmd, screenshotParams);
        break;

      case 'click':
        this.executeCommand('click', { x: parseInt(args[0]), y: parseInt(args[1]) });
        break;

      case 'move':
        this.executeCommand('move_mouse', { x: parseInt(args[0]), y: parseInt(args[1]) });
        break;

      case 'type':
        this.executeCommand('type', { text: args.join(' ') });
        break;

      case 'key':
        this.executeCommand('key_press', { key: args[0] });
        break;

      // Query commands
      case 'screen':
      case 'screen_size':
        this.executeQuery('screen_size');
        break;

      case 'mouse':
      case 'mouse_position':
        this.executeQuery('mouse_position');
        break;

      case 'active':
      case 'active_window':
        this.executeQuery('active_window');
        break;

      // Subscribe commands
      case 'sub':
      case 'subscribe':
        this.handleSubscribe(args);
        break;

      // Stream commands
      case 'stream':
        this.handleStream(args);
        break;

      // CMD commands
      case 'cmd':
        this.handleCMD(args);
        break;

      case 'spawn':
        this.client.cmdSpawn(args[0] || 'REPL').then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      case 'list':
        this.client.cmdList().then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      default:
        console.log('❓ Unknown command:', cmd);
        console.log('Type "help" for available commands');
    }

    this.showPrompt();
  }

  private async executeCommand(action: string, params: any = {}): Promise<void> {
    try {
      const result = await this.client.action(action, params);
      this.showResult(result);
    } catch (err: any) {
      this.showError(err);
    }
  }

  private async executeQuery(query: string): Promise<void> {
    try {
      const result = await this.client.query(query);
      this.showResult(result);
    } catch (err: any) {
      this.showError(err);
    }
  }

  private async handleSubscribe(args: string[]): Promise<void> {
    const events = args.length > 0 ? args : ['screenshot'];
    try {
      const result = await this.client.subscribe(events);
      this.showResult(result);
    } catch (err: any) {
      this.showError(err);
    }
  }

  private async handleStream(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log('Usage: stream <start|stop> <stream_type> [interval]');
      return;
    }
    const [command, streamType, interval] = args;
    try {
      const result = await this.client.stream(
        command as 'start' | 'stop',
        streamType,
        interval ? parseInt(interval) : undefined
      );
      this.showResult(result);
    } catch (err: any) {
      this.showError(err);
    }
  }

  private async handleCMD(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log('Usage: cmd <sessionId> <command> [args...]');
      return;
    }

    const [sessionId, cmd, ...cmdArgs] = args;

    switch (cmd) {
      case 'exec':
        await this.client.cmdExec(sessionId, cmdArgs.join(' ')).then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      case 'type':
        await this.client.cmdType(sessionId, cmdArgs.join(' ')).then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      case 'press':
        await this.client.cmdPress(sessionId, cmdArgs[0]).then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      case 'screenshot':
        await this.client.cmdScreenshot(sessionId).then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      case 'break':
        await this.client.cmdBreak(sessionId).then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      case 'close':
        await this.client.cmdClose(sessionId).then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      case 'info':
        await this.client.cmdGetInfo(sessionId).then(r => this.showResult(r)).catch(e => this.showError(e));
        break;

      default:
        console.log('❓ Unknown CMD command:', cmd);
        console.log('Available: exec, type, press, screenshot, break, close, info');
    }
  }

  private showResult(result: any): void {
    // Truncate large strings (like base64 data) for console display
    const truncated = JSON.stringify(result, (key, value) => {
      if (typeof value === 'string' && value.length > 100) {
        // Truncate long strings but show filepath fully
        if (key === 'filepath') return value;
        return `${value.substring(0, 100)}... (${value.length} chars total)`;
      }
      return value;
    }, 2);
    console.log('✅ Result:', truncated);
  }

  private showError(error: Error): void {
    console.log('❌ Error:', error.message);
  }

  private showStatus(): void {
    console.log('📊 Status:');
    console.log('  Connected:', this.client.isConnected());
    console.log('  Session ID:', this.client.getSessionId() || 'Not connected');
  }

  private showHelp(): void {
    console.log(`
📖 Available Commands:

🎮 Action Commands:
  screenshot [filename:<file>] [scale:<auto|1.0|1.25|1.5>]
                         Take screenshot with options (DPI-unaware)
  screenshot_raw          Take screenshot using libnut (fallback)
  screenshot_all          Take screenshot of all monitors
  screenshot_secondary    Take screenshot of secondary monitor
  screenshot_win32 [filename:<file>]
                         Take DPI-aware screenshot at full physical resolution
  click <x> <y>          Click at coordinates
  move <x> <y>           Move mouse to coordinates
  type <text>            Type text
  key <key>              Press a key

📊 Query Commands:
  screen, screen_size    Get screen size
  mouse, mouse_position  Get mouse position
  active, active_window  Get active window

📡 Subscribe Commands:
  subscribe [events...]   Subscribe to events (default: screenshot)

🌊 Stream Commands:
  stream <start|stop> <type> [interval]
                         Start/stop event stream

💻 CMD Commands:
  spawn [title]           Spawn new CMD window
  list                    List all CMD sessions
  cmd <sessionId> exec <command>
                         Execute command in CMD
  cmd <sessionId> type <text>
                         Type text into CMD
  cmd <sessionId> press <key>
                         Press key in CMD
  cmd <sessionId> screenshot
                         Screenshot CMD window
  cmd <sessionId> break   Send Ctrl+C
  cmd <sessionId> close   Close CMD session
  cmd <sessionId> info    Get session info

🔧 General Commands:
  status                  Show connection status
  help                    Show this help
  quit, exit             Exit the REPL
    `);
  }

  private showPrompt(): void {
    process.stdout.write('\n> ');
  }
}

// ==============================
// Main Entry Point
// ==============================

async function main() {
  const config: Partial<ClientConfig> = {
    url: process.env.WS_URL || DEFAULT_WS_URL,
    debug: process.env.DEBUG === '1'
  };

  const client = new DesktopWinClient(config);
  const repl = new REPL(client);

  repl.start().catch(err => {
    console.error('Failed to start REPL:', err);
    process.exit(1);
  });
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { DesktopWinClient, REPL, ClientConfig };
