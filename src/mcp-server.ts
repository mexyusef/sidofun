import readline from 'node:readline';
import { SidofunMcpServer, type JsonRpcRequest, type JsonRpcResponse } from './mcp/mcp-protocol-server.js';
import { createSidofunRuntime } from './runtime/sidofun-runtime.js';

function writeMessage(message: JsonRpcResponse): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function main(): Promise<void> {
  const runtime = createSidofunRuntime();
  const server = new SidofunMcpServer(runtime.core, runtime.sessionManagerService);
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
  });

  try {
    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }

      try {
        const request = JSON.parse(line) as JsonRpcRequest;
        const response = await server.handleRequest(request);
        if (response && request.id !== undefined) {
          writeMessage(response);
        }
      } catch (error: any) {
        writeMessage({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error',
            data: error?.message || String(error)
          }
        });
      }
    }
  } finally {
    await server.shutdown();
  }
}

export { main };
