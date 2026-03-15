# Domain 2: MCP Integration (18%)

Covers the Model Context Protocol (MCP) portion of Domain 2 on the Claude Certified Architect (Foundations) exam. MCP is the open protocol that lets ArchitectAI expose its study tools to any compatible client — Claude Desktop, GitHub Copilot, or any MCP-enabled IDE.

## Files

No `.ts` files have been implemented yet. This directory is next on the roadmap alongside `src/tools/`.

**Planned implementations:**
- MCP server exposing study tools (questions, explanations, assessments)
- MCP resource definitions for content access
- MCP prompt templates for guided study sessions
- Transport handling (stdio for local, SSE for remote)

## Exam Concepts

- **MCP Resources** — Read-only data exposed to clients (question banks, explanations, domain summaries).
- **MCP Tools** — Callable actions: `quiz`, `assess`, `explain`.
- **MCP Prompts** — Pre-built prompt templates that clients can invoke for structured study sessions.
- **MCP Transport** — stdio for CLI integration, SSE for networked access.

## Connections

- **`src/tools/`** — Tool definitions are shared; MCP wraps them in the protocol layer for external clients.
- **`src/content/`** — MCP resources serve content from the question banks and explanations stored here.
- **`src/agents/`** — Tier 3 live agent sessions are accessible via MCP tool invocations.
