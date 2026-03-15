/**
 * Tier 1 — MCP Server Tests
 *
 * Tests src/mcp/server.ts:
 * - MCPServer class instantiation
 * - JSON-RPC 2.0 dispatch routing
 * - Resource, tool, prompt registration
 * - Error responses for invalid/missing methods
 * - createMCPServer factory
 * - startServer function
 *
 * @author James Okonkwo, QA Lead — ArchitectAI
 */

import { describe, it, expect, vi } from 'vitest';
import { MCPServer, createMCPServer, startServer } from '../../src/mcp/server';

// Helper to make a minimal JSON-RPC request
function rpcRequest(
  method: string,
  params?: Record<string, unknown>,
  id: string | number = 1,
) {
  return { jsonrpc: '2.0' as const, id, method, params };
}

// ─── MCPServer constructor ──────────────────────────────────────────────────

describe('MCPServer constructor', () => {
  it('creates an instance with default config', () => {
    const server = new MCPServer();
    expect(server).toBeInstanceOf(MCPServer);
  });

  it('uses default name "architect-ai-mcp"', () => {
    const server = new MCPServer();
    expect(server.getServerInfo().name).toBe('architect-ai-mcp');
  });

  it('uses default version "0.1.0"', () => {
    const server = new MCPServer();
    expect(server.getServerInfo().version).toBe('0.1.0');
  });

  it('accepts custom name', () => {
    const server = new MCPServer({ name: 'custom-server' });
    expect(server.getServerInfo().name).toBe('custom-server');
  });

  it('accepts custom version', () => {
    const server = new MCPServer({ version: '2.0.0' });
    expect(server.getServerInfo().version).toBe('2.0.0');
  });

  it('starts with zero registered primitives', () => {
    const server = new MCPServer();
    const counts = server.getRegisteredCounts();
    expect(counts.resources).toBe(0);
    expect(counts.tools).toBe(0);
    expect(counts.prompts).toBe(0);
  });
});

// ─── Registration ───────────────────────────────────────────────────────────

describe('MCPServer registration', () => {
  it('registerResource increments resource count', () => {
    const server = new MCPServer();
    server.registerResource({
      uri: 'test://resource/1',
      name: 'Test Resource',
      description: 'A test resource',
      mimeType: 'application/json',
    });
    expect(server.getRegisteredCounts().resources).toBe(1);
  });

  it('registerTool increments tool count', () => {
    const server = new MCPServer();
    server.registerTool(
      { name: 'test_tool', description: 'A test tool', inputSchema: { type: 'object' } },
      async () => 'result',
    );
    expect(server.getRegisteredCounts().tools).toBe(1);
  });

  it('registerPrompt increments prompt count', () => {
    const server = new MCPServer();
    server.registerPrompt(
      {
        name: 'test_prompt',
        description: 'A test prompt',
        arguments: [{ name: 'arg1', description: 'test', required: true }],
      },
      async () => [{ role: 'user', content: 'hello' }],
    );
    expect(server.getRegisteredCounts().prompts).toBe(1);
  });

  it('can register multiple resources', () => {
    const server = new MCPServer();
    for (let i = 0; i < 5; i++) {
      server.registerResource({
        uri: `test://resource/${i}`,
        name: `Resource ${i}`,
        description: `Resource ${i}`,
        mimeType: 'application/json',
      });
    }
    expect(server.getRegisteredCounts().resources).toBe(5);
  });
});

// ─── JSON-RPC dispatch: initialize ──────────────────────────────────────────

describe('handleRequest — initialize', () => {
  it('returns protocol version', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(rpcRequest('initialize'));
    expect(res.result).toBeDefined();
    const result = res.result as Record<string, unknown>;
    expect(result['protocolVersion']).toBe('2024-11-05');
  });

  it('returns server info', async () => {
    const server = new MCPServer({ name: 'test-server', version: '1.0.0' });
    const res = await server.handleRequest(rpcRequest('initialize'));
    const result = res.result as Record<string, unknown>;
    const info = result['serverInfo'] as Record<string, string>;
    expect(info['name']).toBe('test-server');
    expect(info['version']).toBe('1.0.0');
  });

  it('returns capabilities with resources, tools, prompts', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(rpcRequest('initialize'));
    const result = res.result as Record<string, unknown>;
    const caps = result['capabilities'] as Record<string, unknown>;
    expect(caps).toHaveProperty('resources');
    expect(caps).toHaveProperty('tools');
    expect(caps).toHaveProperty('prompts');
  });

  it('preserves request id in response', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(rpcRequest('initialize', undefined, 42));
    expect(res.id).toBe(42);
    expect(res.jsonrpc).toBe('2.0');
  });
});

// ─── JSON-RPC dispatch: resources ───────────────────────────────────────────

describe('handleRequest — resources/list', () => {
  it('returns empty resources list when none registered', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(rpcRequest('resources/list'));
    const result = res.result as { resources: unknown[] };
    expect(result.resources).toEqual([]);
  });

  it('returns registered resources', async () => {
    const server = new MCPServer();
    server.registerResource({
      uri: 'test://r1',
      name: 'R1',
      description: 'Resource 1',
      mimeType: 'text/plain',
    });
    const res = await server.handleRequest(rpcRequest('resources/list'));
    const result = res.result as { resources: { uri: string }[] };
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].uri).toBe('test://r1');
  });
});

describe('handleRequest — resources/read', () => {
  it('returns resource content for valid URI', async () => {
    const server = new MCPServer();
    server.registerResource({
      uri: 'test://r1',
      name: 'R1',
      description: 'Resource 1',
      mimeType: 'application/json',
    });
    const res = await server.handleRequest(
      rpcRequest('resources/read', { uri: 'test://r1' }),
    );
    expect(res.error).toBeUndefined();
    expect(res.result).toBeDefined();
  });

  it('returns error for unknown URI', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(
      rpcRequest('resources/read', { uri: 'test://missing' }),
    );
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32602);
  });
});

// ─── JSON-RPC dispatch: tools ───────────────────────────────────────────────

describe('handleRequest — tools/list', () => {
  it('returns empty tools list when none registered', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(rpcRequest('tools/list'));
    const result = res.result as { tools: unknown[] };
    expect(result.tools).toEqual([]);
  });

  it('returns registered tools', async () => {
    const server = new MCPServer();
    server.registerTool(
      { name: 'my_tool', description: 'Test', inputSchema: {} },
      async () => 'ok',
    );
    const res = await server.handleRequest(rpcRequest('tools/list'));
    const result = res.result as { tools: { name: string }[] };
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('my_tool');
  });
});

describe('handleRequest — tools/call', () => {
  it('executes tool handler and returns result', async () => {
    const server = new MCPServer();
    server.registerTool(
      { name: 'echo', description: 'Echo tool', inputSchema: {} },
      async (params) => ({ echo: params }),
    );
    const res = await server.handleRequest(
      rpcRequest('tools/call', { name: 'echo', arguments: { msg: 'hello' } }),
    );
    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.echo.msg).toBe('hello');
  });

  it('returns error for unknown tool', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(
      rpcRequest('tools/call', { name: 'nonexistent' }),
    );
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32602);
    expect(res.error!.message).toContain('Unknown tool');
  });

  it('handles tool handler that throws an error', async () => {
    const server = new MCPServer();
    server.registerTool(
      { name: 'fail_tool', description: 'Fails', inputSchema: {} },
      async () => { throw new Error('Tool broke'); },
    );
    const res = await server.handleRequest(
      rpcRequest('tools/call', { name: 'fail_tool' }),
    );
    // Error should be in result.isError, not top-level error
    const result = res.result as { content: unknown[]; isError: boolean };
    expect(result.isError).toBe(true);
  });

  it('returns string result directly as text', async () => {
    const server = new MCPServer();
    server.registerTool(
      { name: 'str_tool', description: 'String tool', inputSchema: {} },
      async () => 'plain string result',
    );
    const res = await server.handleRequest(
      rpcRequest('tools/call', { name: 'str_tool' }),
    );
    const result = res.result as { content: { text: string }[] };
    expect(result.content[0].text).toBe('plain string result');
  });
});

// ─── JSON-RPC dispatch: prompts ─────────────────────────────────────────────

describe('handleRequest — prompts/list', () => {
  it('returns empty prompts list when none registered', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(rpcRequest('prompts/list'));
    const result = res.result as { prompts: unknown[] };
    expect(result.prompts).toEqual([]);
  });
});

describe('handleRequest — prompts/get', () => {
  it('expands a registered prompt', async () => {
    const server = new MCPServer();
    server.registerPrompt(
      {
        name: 'greeting',
        description: 'Greet someone',
        arguments: [{ name: 'name', description: 'User name', required: true }],
      },
      async (args) => [{ role: 'user', content: `Hello ${args['name']}` }],
    );
    const res = await server.handleRequest(
      rpcRequest('prompts/get', { name: 'greeting', arguments: { name: 'Alice' } }),
    );
    const result = res.result as { messages: { role: string; content: string }[] };
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Hello Alice');
  });

  it('returns error for unknown prompt', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(
      rpcRequest('prompts/get', { name: 'nonexistent' }),
    );
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32602);
  });
});

// ─── Unknown method ─────────────────────────────────────────────────────────

describe('handleRequest — unknown method', () => {
  it('returns method not found error (-32601)', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(rpcRequest('unknown/method'));
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32601);
    expect(res.error!.message).toContain('Method not found');
  });

  it('preserves request id for error response', async () => {
    const server = new MCPServer();
    const res = await server.handleRequest(rpcRequest('bad', undefined, 'abc'));
    expect(res.id).toBe('abc');
  });
});

// ─── createMCPServer factory ────────────────────────────────────────────────

describe('createMCPServer', () => {
  it('returns an MCPServer instance', () => {
    const server = createMCPServer();
    expect(server).toBeInstanceOf(MCPServer);
  });

  it('registers 5 resources (one per domain)', () => {
    const server = createMCPServer();
    expect(server.getRegisteredCounts().resources).toBe(5);
  });

  it('registers 3 tools', () => {
    const server = createMCPServer();
    expect(server.getRegisteredCounts().tools).toBe(3);
  });

  it('registers 3 prompts', () => {
    const server = createMCPServer();
    expect(server.getRegisteredCounts().prompts).toBe(3);
  });

  it('accepts custom config', () => {
    const server = createMCPServer({ name: 'custom', version: '9.9.9' });
    const info = server.getServerInfo();
    expect(info.name).toBe('custom');
    expect(info.version).toBe('9.9.9');
  });

  it('tools are callable via handleRequest', async () => {
    const server = createMCPServer();
    const res = await server.handleRequest(rpcRequest('tools/list'));
    const result = res.result as { tools: { name: string }[] };
    expect(result.tools.length).toBe(3);
    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain('question_bank_query');
    expect(toolNames).toContain('progress_tracker');
    expect(toolNames).toContain('codebase_search');
  });

  it('prompts are listable via handleRequest', async () => {
    const server = createMCPServer();
    const res = await server.handleRequest(rpcRequest('prompts/list'));
    const result = res.result as { prompts: { name: string }[] };
    const names = result.prompts.map((p) => p.name);
    expect(names).toContain('study_session');
    expect(names).toContain('quiz_mode');
    expect(names).toContain('readiness_assessment');
  });

  it('study_session prompt can be expanded', async () => {
    const server = createMCPServer();
    const res = await server.handleRequest(
      rpcRequest('prompts/get', { name: 'study_session', arguments: { domain: '3' } }),
    );
    expect(res.error).toBeUndefined();
    const result = res.result as { messages: { content: string }[] };
    expect(result.messages[0].content).toContain('Domain 3');
  });
});

// ─── startServer ────────────────────────────────────────────────────────────

describe('startServer', () => {
  it('returns a configured MCPServer', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const server = await startServer({ name: 'test-start' });
    expect(server).toBeInstanceOf(MCPServer);
    expect(server.getRegisteredCounts().tools).toBe(3);
    spy.mockRestore();
  });

  it('logs startup message', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await startServer();
    expect(spy).toHaveBeenCalled();
    const logMsg = spy.mock.calls[0]?.[0] as string;
    expect(logMsg).toContain('[MCP]');
    spy.mockRestore();
  });
});
