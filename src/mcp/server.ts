/**
 * @module mcp/server
 * @description MCP (Model Context Protocol) server entry point for ArchitectAI.
 *
 * @exam Domain 2.4 — MCP Protocol / Built-in Tool Integration
 *
 * MCP is an open protocol that standardises how applications expose context,
 * tools, and prompts to LLMs. This server exposes ArchitectAI's study
 * capabilities as MCP primitives:
 *
 *   - RESOURCES: Question banks as structured data the model can read
 *   - TOOLS: quiz, explain, assess as callable operations
 *   - PROMPTS: Pre-built prompt templates for study workflows
 *
 * The server follows the MCP specification with JSON-RPC 2.0 transport.
 * It can be connected to any MCP-compatible client (Claude Desktop, etc.).
 *
 * ARCHITECTURE NOTE: This is a manual implementation of the MCP server
 * protocol. For production use, consider @modelcontextprotocol/sdk.
 * We implement manually here to demonstrate the protocol internals
 * as an exam learning aid.
 *
 * @author Sofia Andersson, Tool Systems Engineer — ArchitectAI
 */

import { z } from "zod";
import {
  questionBankTool,
  progressTrackerTool,
  codebaseSearchTool,
  toAnthropicToolDefinition,
} from "../tools/definitions.js";

// ---------------------------------------------------------------------------
// MCP Protocol Types
// ---------------------------------------------------------------------------

/**
 * JSON-RPC 2.0 request envelope used by MCP.
 *
 * @exam Domain 2.4 — MCP uses JSON-RPC 2.0 as its transport format.
 */
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 response envelope.
 */
interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * An MCP Resource — a piece of structured data the model can read.
 *
 * @exam Domain 2.4 — Resources are read-only data exposed to the model.
 * They differ from tools (which perform actions) and prompts (which are templates).
 */
interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * An MCP Tool — a callable operation the model can invoke.
 */
interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * An MCP Prompt — a reusable prompt template with parameters.
 *
 * @exam Domain 2.4 — Prompts are parameterised templates that the client
 * can fill in and send to the model. They standardise common interactions.
 */
interface MCPPrompt {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// MCP Server Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for creating an MCP server instance.
 */
export interface MCPServerConfig {
  /** Server name exposed in the MCP handshake. */
  name?: string;
  /** Server version. */
  version?: string;
  /** Port for HTTP transport (if applicable). */
  port?: number;
}

// ---------------------------------------------------------------------------
// MCP Server Implementation
// ---------------------------------------------------------------------------

/**
 * The ArchitectAI MCP server.
 *
 * Exposes study resources, tools, and prompts via the MCP protocol.
 * This implementation handles JSON-RPC 2.0 messages directly.
 *
 * @exam Domain 2.4 — A complete MCP server registers resources, tools,
 * and prompts, then handles method calls from MCP clients.
 */
export class MCPServer {
  private readonly serverName: string;
  private readonly serverVersion: string;
  private readonly resources: Map<string, MCPResource> = new Map();
  private readonly tools: Map<string, MCPTool> = new Map();
  private readonly prompts: Map<string, MCPPrompt> = new Map();
  private readonly toolHandlers: Map<
    string,
    (params: Record<string, unknown>) => Promise<unknown>
  > = new Map();
  private readonly promptHandlers: Map<
    string,
    (args: Record<string, string>) => Promise<{ role: string; content: string }[]>
  > = new Map();

  constructor(config: MCPServerConfig = {}) {
    this.serverName = config.name ?? "architect-ai-mcp";
    this.serverVersion = config.version ?? "0.1.0";
  }

  // -------------------------------------------------------------------------
  // Registration methods
  // -------------------------------------------------------------------------

  /**
   * Register an MCP resource (read-only data).
   *
   * @exam Domain 2.4 — Resources expose structured data to the model.
   * Question banks are a natural fit: the model reads questions but
   * doesn't modify them.
   */
  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
  }

  /**
   * Register an MCP tool (callable operation) with its handler.
   *
   * @exam Domain 2.4 — Tools are the MCP equivalent of Anthropic's
   * tool_use/tool_result pattern. The server defines the schema;
   * the client calls the tool; the server executes and returns results.
   */
  registerTool(
    tool: MCPTool,
    handler: (params: Record<string, unknown>) => Promise<unknown>,
  ): void {
    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
  }

  /**
   * Register an MCP prompt template with its expansion handler.
   *
   * @exam Domain 2.4 — Prompts are parameterised templates. The client
   * provides argument values; the server expands the template into
   * a list of messages ready to send to the model.
   */
  registerPrompt(
    prompt: MCPPrompt,
    handler: (args: Record<string, string>) => Promise<{ role: string; content: string }[]>,
  ): void {
    this.prompts.set(prompt.name, prompt);
    this.promptHandlers.set(prompt.name, handler);
  }

  // -------------------------------------------------------------------------
  // JSON-RPC message handling
  // -------------------------------------------------------------------------

  /**
   * Handle an incoming JSON-RPC 2.0 request and return a response.
   *
   * This is the main dispatch method. MCP clients send JSON-RPC requests;
   * we route them to the appropriate handler based on the method name.
   *
   * @exam Domain 2.4 — MCP method routing: initialize, resources/list,
   * tools/list, tools/call, prompts/list, prompts/get.
   */
  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      switch (request.method) {
        case "initialize":
          return this.handleInitialize(request);
        case "resources/list":
          return this.handleResourcesList(request);
        case "resources/read":
          return this.handleResourcesRead(request);
        case "tools/list":
          return this.handleToolsList(request);
        case "tools/call":
          return this.handleToolsCall(request);
        case "prompts/list":
          return this.handlePromptsList(request);
        case "prompts/get":
          return this.handlePromptsGet(request);
        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message,
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // MCP method handlers
  // -------------------------------------------------------------------------

  /**
   * Handle the MCP `initialize` handshake.
   *
   * @exam Domain 2.4 — The initialize handshake establishes the server's
   * capabilities. The client sends its protocol version; the server responds
   * with its name, version, and which MCP primitives it supports.
   */
  private handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          resources: { listChanged: false },
          tools: { listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: this.serverName,
          version: this.serverVersion,
        },
      },
    };
  }

  /**
   * List all registered MCP resources.
   */
  private handleResourcesList(request: JsonRpcRequest): JsonRpcResponse {
    const resources = Array.from(this.resources.values());
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { resources },
    };
  }

  /**
   * Read a specific MCP resource by URI.
   */
  private handleResourcesRead(request: JsonRpcRequest): JsonRpcResponse {
    const uri = (request.params?.["uri"] as string) ?? "";
    const resource = this.resources.get(uri);

    if (!resource) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32602,
          message: `Resource not found: ${uri}`,
        },
      };
    }

    // In a full implementation, we'd fetch the resource content here.
    // For now, return the resource metadata.
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: JSON.stringify({
              name: resource.name,
              description: resource.description,
            }),
          },
        ],
      },
    };
  }

  /**
   * List all registered MCP tools.
   */
  private handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
    const tools = Array.from(this.tools.values());
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { tools },
    };
  }

  /**
   * Execute an MCP tool call.
   *
   * @exam Domain 2.4 — tools/call is the MCP equivalent of tool_use.
   * The client sends the tool name and arguments; the server executes
   * and returns the result as content blocks.
   */
  private async handleToolsCall(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const toolName = (request.params?.["name"] as string) ?? "";
    const toolArgs = (request.params?.["arguments"] as Record<string, unknown>) ?? {};

    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32602,
          message: `Unknown tool: ${toolName}. Available: ${[...this.tools.keys()].join(", ")}`,
        },
      };
    }

    try {
      const result = await handler(toolArgs);
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: typeof result === "string" ? result : JSON.stringify(result),
            },
          ],
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tool execution failed";
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [{ type: "text", text: JSON.stringify({ error: message }) }],
          isError: true,
        },
      };
    }
  }

  /**
   * List all registered MCP prompts.
   */
  private handlePromptsList(request: JsonRpcRequest): JsonRpcResponse {
    const prompts = Array.from(this.prompts.values());
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { prompts },
    };
  }

  /**
   * Expand an MCP prompt template with the given arguments.
   *
   * @exam Domain 2.4 — prompts/get expands a template into messages.
   * This is how MCP standardises reusable prompt patterns.
   */
  private async handlePromptsGet(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const promptName = (request.params?.["name"] as string) ?? "";
    const promptArgs = (request.params?.["arguments"] as Record<string, string>) ?? {};

    const handler = this.promptHandlers.get(promptName);
    if (!handler) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32602,
          message: `Unknown prompt: ${promptName}. Available: ${[...this.prompts.keys()].join(", ")}`,
        },
      };
    }

    const messages = await handler(promptArgs);
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { messages },
    };
  }

  // -------------------------------------------------------------------------
  // Introspection
  // -------------------------------------------------------------------------

  /** Get server metadata. */
  getServerInfo(): { name: string; version: string } {
    return { name: this.serverName, version: this.serverVersion };
  }

  /** Get the count of registered primitives. */
  getRegisteredCounts(): { resources: number; tools: number; prompts: number } {
    return {
      resources: this.resources.size,
      tools: this.tools.size,
      prompts: this.prompts.size,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory function: createMCPServer
// ---------------------------------------------------------------------------

/**
 * Create and configure an MCP server with all ArchitectAI primitives registered.
 *
 * This is the main entry point for standing up the MCP server. It:
 * 1. Creates the server instance
 * 2. Registers question bank resources (one per domain)
 * 3. Registers study tools (quiz, progress, search)
 * 4. Registers prompt templates (study, quiz, assessment)
 *
 * @exam Domain 2.4 — A fully configured MCP server with resources, tools,
 * and prompts registered. This is the pattern for exposing agent capabilities
 * to external MCP clients.
 *
 * @param config - Optional server configuration overrides.
 * @returns A configured MCPServer instance ready to handle requests.
 */
export function createMCPServer(config?: MCPServerConfig): MCPServer {
  const server = new MCPServer(config);

  // -------------------------------------------------------------------------
  // Register resources: Question banks as MCP resources
  // -------------------------------------------------------------------------

  const domainNames: Record<number, string> = {
    1: "Agentic Architecture",
    2: "Tool Design & MCP",
    3: "CLI & Commands",
    4: "Prompt Engineering",
    5: "Context Management",
  };

  for (const [domainNum, domainName] of Object.entries(domainNames)) {
    server.registerResource({
      uri: `architect-ai://questions/domain-${domainNum}`,
      name: `Domain ${domainNum}: ${domainName} Questions`,
      description:
        `Exam preparation questions for Domain ${domainNum} (${domainName}). ` +
        `Contains scenario-based multiple-choice questions at foundation, ` +
        `intermediate, and advanced difficulty levels.`,
      mimeType: "application/json",
    });
  }

  // -------------------------------------------------------------------------
  // Register tools: Study operations as MCP tools
  // -------------------------------------------------------------------------

  const questionBankDef = toAnthropicToolDefinition(questionBankTool);
  server.registerTool(
    {
      name: questionBankDef.name,
      description: questionBankDef.description,
      inputSchema: questionBankDef.input_schema,
    },
    async (params) => {
      // Placeholder implementation — connects to question bank loader in production
      return {
        message: "Question bank query executed",
        params,
        questions: [],
      };
    },
  );

  const progressTrackerDef = toAnthropicToolDefinition(progressTrackerTool);
  server.registerTool(
    {
      name: progressTrackerDef.name,
      description: progressTrackerDef.description,
      inputSchema: progressTrackerDef.input_schema,
    },
    async (params) => {
      return {
        message: "Progress tracker action executed",
        params,
      };
    },
  );

  const codebaseSearchDef = toAnthropicToolDefinition(codebaseSearchTool);
  server.registerTool(
    {
      name: codebaseSearchDef.name,
      description: codebaseSearchDef.description,
      inputSchema: codebaseSearchDef.input_schema,
    },
    async (params) => {
      return {
        message: "Codebase search executed",
        params,
        snippets: [],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Register prompts: Study workflow templates as MCP prompts
  // -------------------------------------------------------------------------

  server.registerPrompt(
    {
      name: "study_session",
      description:
        "Start a focused study session for a specific exam domain. " +
        "Generates a structured study plan with questions and explanations.",
      arguments: [
        {
          name: "domain",
          description: "Domain number (1–5) to study",
          required: true,
        },
        {
          name: "difficulty",
          description: "Target difficulty: foundation, intermediate, or advanced",
          required: false,
        },
      ],
    },
    async (args) => {
      const domain = args["domain"] ?? "1";
      const difficulty = args["difficulty"] ?? "intermediate";
      return [
        {
          role: "user",
          content:
            `I want to study Domain ${domain} at ${difficulty} difficulty. ` +
            `Start by assessing my current knowledge, then present targeted ` +
            `questions. After each answer, explain the correct reasoning and ` +
            `connect it to exam concepts.`,
        },
      ];
    },
  );

  server.registerPrompt(
    {
      name: "quiz_mode",
      description:
        "Enter timed quiz mode simulating the real exam experience. " +
        "Presents questions without hints and scores at the end.",
      arguments: [
        {
          name: "count",
          description: "Number of questions (default: 10)",
          required: false,
        },
        {
          name: "domain",
          description: "Optional domain filter (1–5)",
          required: false,
        },
      ],
    },
    async (args) => {
      const count = args["count"] ?? "10";
      const domain = args["domain"];
      const domainFilter = domain ? ` from Domain ${domain}` : "";
      return [
        {
          role: "user",
          content:
            `Start a quiz with ${count} questions${domainFilter}. ` +
            `Present each question one at a time. Do not reveal answers ` +
            `until I respond. At the end, give me a score breakdown by ` +
            `domain and difficulty level.`,
        },
      ];
    },
  );

  server.registerPrompt(
    {
      name: "readiness_assessment",
      description:
        "Run a comprehensive readiness assessment across all exam domains. " +
        "Evaluates strengths, weaknesses, and overall pass probability.",
      arguments: [
        {
          name: "depth",
          description: "Assessment depth: quick (5 questions) or full (15 questions)",
          required: false,
        },
      ],
    },
    async (args) => {
      const depth = args["depth"] ?? "quick";
      const count = depth === "full" ? 15 : 5;
      return [
        {
          role: "user",
          content:
            `Run a readiness assessment with ${count} questions across all ` +
            `five exam domains. After I answer all questions, provide: ` +
            `1) Per-domain scores, 2) Weak areas below 72%, ` +
            `3) Overall pass probability, 4) Recommended study plan.`,
        },
      ];
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

/**
 * Start the MCP server and begin accepting connections.
 *
 * In a full implementation this would set up stdio or HTTP transport.
 * For now, it returns the configured server instance for programmatic use.
 *
 * @exam Domain 2.4 — MCP servers typically use stdio transport for local
 * use (e.g. Claude Desktop) or HTTP/SSE for remote deployment.
 *
 * @param config - Optional server configuration.
 * @returns The running MCPServer instance.
 */
export async function startServer(
  config?: MCPServerConfig,
): Promise<MCPServer> {
  const server = createMCPServer(config);
  const info = server.getServerInfo();
  const counts = server.getRegisteredCounts();

  // Log startup information
  console.log(
    `[MCP] ${info.name} v${info.version} started — ` +
      `${counts.resources} resources, ${counts.tools} tools, ${counts.prompts} prompts`,
  );

  return server;
}
