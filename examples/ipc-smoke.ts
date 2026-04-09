import { spawn } from 'node:child_process';

interface IPCResponse {
  id: string | number;
  success: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

class IPCClient {
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: IPCResponse) => void; reject: (error: Error) => void }>();

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
        const message = JSON.parse(line) as IPCResponse;
        const id = Number(message.id);
        const pending = this.pending.get(id);
        if (pending) {
          this.pending.delete(id);
          pending.resolve(message);
        }
      }
    });
  }

  request(action: string, params: Record<string, unknown> = {}): Promise<IPCResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(`${JSON.stringify({ id, action, params })}\n`);
    });
  }
}

async function main(): Promise<void> {
  const proc = spawn('bun', ['run', 'src/cli-ipc.ts'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'inherit'],
    env: process.env
  });

  const client = new IPCClient(proc);

  try {
    const screen = await client.request('screen_size');
    console.log('screen_size:', screen.result);

    const mouse = await client.request('mouse_position');
    console.log('mouse_position:', mouse.result);

    const browsers = await client.request('browser_list');
    console.log('browser_list:', browsers.result);

    const runtimes = await client.request('browser_runtime_list');
    console.log('browser_runtime_list:', runtimes.result);

    console.log('IPC smoke completed');
  } finally {
    proc.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(`IPC smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
