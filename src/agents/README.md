# Domain 1: Agentic Architecture (27%)

Implements the highest-weighted domain on the Claude Certified Architect (Foundations) exam. Every file in this directory demonstrates a production pattern for building multi-agent systems with the Anthropic SDK.

## Files

| File | Exam Task | What It Demonstrates |
|------|-----------|---------------------|
| `loop.ts` | 1.1 — Agentic Loops | The core `while (stop_reason === "tool_use")` loop, tool execution, and conversation accumulation. |
| `coordinator.ts` | 1.2 — Multi-Agent Orchestration | Hub-and-spoke topology: a central coordinator decomposes tasks, routes to specialists, and aggregates results. |
| `spawner.ts` | 1.3 — Subagent Invocation | Isolated-context subagent spawning with parallel execution via `Promise.all`. |
| `hooks.ts` | 1.5 — Agent SDK Hooks | Deterministic `PostToolUse` guardrails vs probabilistic prompt-based guidance. |
| `types.ts` | Domain 1 (shared) | TypeScript interfaces for agents, hooks, tool results, and coordinator orchestration. Re-exports Anthropic SDK types. |

## Exam Concepts Demonstrated

- **1.1 Agentic Loops** — `loop.ts` implements the full loop lifecycle: send → inspect `stop_reason` → execute tools → append `tool_result` → repeat.
- **1.2 Multi-Agent Orchestration** — `coordinator.ts` shows hub-and-spoke routing where subagents never communicate directly.
- **1.3 Subagent Invocation** — `spawner.ts` demonstrates isolated context passing and parallel subagent execution.
- **1.5 SDK Hooks** — `hooks.ts` contrasts deterministic hooks (100% reliability) with probabilistic prompts (~95%).

## Connections

- **`src/tools/`** — Agents invoke tools; tool interfaces defined there are consumed here.
- **`src/cli/`** — The CLI dispatches user commands that ultimately trigger agent workflows.
- **`src/context/`** — Context window management feeds into how agents manage conversation history.
