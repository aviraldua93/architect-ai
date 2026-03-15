# Domain 2: Tool Design (18%)

Covers the tool design portion of Domain 2 on the Claude Certified Architect (Foundations) exam. This directory handles tool abstraction, description quality, error schemas, and 	ool_choice modes.

## Files

| File | Exam Task | What It Demonstrates |
|------|-----------|---------------------|
| definitions.ts | 2.1 — Tool Interface Design | Zod-validated tool schemas (question_bank_query, progress_tracker, codebase_search) with best-practice descriptions: WHAT / WHEN / WHEN NOT / RETURNS / SIDE EFFECTS. Includes a lightweight Zod-to-JSON-Schema converter for the Anthropic Messages API. |
| rror-handling.ts | 2.2 — Structured Error Responses | ToolError class with machine-readable rror_type, etry_eligible, and suggested_action. Factory functions, retry logic, and a withStructuredErrors wrapper that ensures every tool failure reaches the model as structured data. |

## Exam Concepts

- **2.1 Tool Descriptions** — High-quality tool descriptions are the single biggest lever for tool-use accuracy.
- **2.2 Error Schemas** — Tools must return structured errors so the agent can reason about failures and retry.
- **2.3 	ool_choice Modes** — uto (model decides), ny (must use a tool), 	ool (must use a specific tool).
- **2.4 Built-in Tools** — Anthropic-provided tools (web search, code execution) vs custom tools.

## Connections

- **src/mcp/** — Tools are exposed to external clients via MCP; the two directories implement different sides of the same Domain 2 content.
- **src/agents/** — Agents consume tools at runtime; tool interfaces defined here are executed within agentic loops.