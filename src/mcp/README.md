# Domain 2: MCP Integration (18%)

Covers the Model Context Protocol (MCP) portion of Domain 2 on the Claude Certified Architect (Foundations) exam. MCP is the open protocol that lets ArchitectAI expose its study tools to any compatible client — Claude Desktop, GitHub Copilot, or any MCP-enabled IDE.

## Files

| File | Exam Task | What It Demonstrates |
|------|-----------|---------------------|
| server.ts | 2.4 — MCP Server Integration | Full MCP server implementation with JSON-RPC 2.0 dispatch. Registers resources (per-domain question banks), tools (quiz, progress, codebase search — bridged from src/tools/definitions.ts), and prompt templates (study session, quiz, assessment). Handles initialize, esources/list, esources/read, 	ools/list, 	ools/call, prompts/list, prompts/get. |

## Exam Concepts

- **MCP Resources** — Read-only data exposed to clients (question banks, explanations, domain summaries).
- **MCP Tools** — Callable actions: quiz, ssess, xplain.
- **MCP Prompts** — Pre-built prompt templates that clients can invoke for structured study sessions.
- **MCP Transport** — stdio for CLI integration, SSE for networked access.

## Connections

- **src/tools/** — Tool definitions are shared; MCP wraps them in the protocol layer for external clients.
- **src/content/** — MCP resources serve content from the question banks and explanations stored here.
- **src/agents/** — Tier 3 live agent sessions are accessible via MCP tool invocations.