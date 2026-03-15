# Domain 2: Tool Design (18%)

Covers the tool design portion of Domain 2 on the Claude Certified Architect (Foundations) exam. This directory handles tool abstraction, description quality, error schemas, and `tool_choice` modes.

## Files

No `.ts` files have been implemented yet. This directory is next on the roadmap.

**Planned implementations:**
- Tool interface contracts and description best practices (Task 2.1)
- Error schemas and structured error handling (Task 2.2)
- `tool_choice` modes: `auto`, `any`, `tool` (Task 2.3)
- Built-in tool integration: web search, code execution, file operations (Task 2.4)

## Exam Concepts

- **2.1 Tool Descriptions** — High-quality tool descriptions are the single biggest lever for tool-use accuracy.
- **2.2 Error Schemas** — Tools must return structured errors so the agent can reason about failures and retry.
- **2.3 `tool_choice` Modes** — `auto` (model decides), `any` (must use a tool), `tool` (must use a specific tool).
- **2.4 Built-in Tools** — Anthropic-provided tools (web search, code execution) vs custom tools.

## Connections

- **`src/mcp/`** — Tools are exposed to external clients via MCP; the two directories implement different sides of the same Domain 2 content.
- **`src/agents/`** — Agents consume tools at runtime; tool interfaces defined here are executed within agentic loops.
