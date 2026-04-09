import { spawn } from 'node:child_process';

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

class MCPClient {
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: JsonRpcResponse) => void; reject: (error: Error) => void }>();

  constructor(private readonly proc: ReturnType<typeof spawn>) {
    let buffer = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }
        const message = JSON.parse(line) as JsonRpcResponse;
        if (message.id == null) {
          continue;
        }
        const id = Number(message.id);
        const pending = this.pending.get(id);
        if (pending) {
          this.pending.delete(id);
          pending.resolve(message);
        }
      }
    });
  }

  request(method: string, params?: unknown): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }
}

async function main(): Promise<void> {
  const proc = spawn('bun', ['run', 'src/mcp-stdio.ts'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'inherit'],
    env: process.env
  });

  const client = new MCPClient(proc);

  try {
    const initialize = await client.request('initialize', {
      protocolVersion: '2025-11-25',
      clientInfo: { name: 'sidofun-smoke' }
    });
    console.log('initialize:', initialize.result);

    proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);

    const tools = await client.request('tools/list');
    console.log('tools/list:', tools.result?.tools?.map((tool: any) => tool.name));

    const desktop = await client.request('tools/call', {
      name: 'sidofun_desktop',
      arguments: {
        action: 'screen_size',
        params: {}
      }
    });
    console.log('screen_size:', desktop.result?.structuredContent);

    const browser = await client.request('tools/call', {
      name: 'sidofun_browser',
      arguments: {
        action: 'browser_list',
        params: {}
      }
    });
    console.log('browser_list:', browser.result?.structuredContent);

    console.log('MCP smoke completed');
  } finally {
    proc.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(`MCP smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
