# Domain 5: Context & Reliability (15%)

Covers Domain 5 of the Claude Certified Architect (Foundations) exam — context window optimisation, escalation patterns, error propagation, and human review integration.

## Files

No `.ts` files have been implemented yet. This directory is on the roadmap after Domains 1–4.

**Planned implementations:**
- Token counting and context budget allocation (Task 5.1)
- Context preservation strategies across multi-turn conversations (Task 5.2)
- Escalation patterns: when to hand off to a human (Task 5.3)
- Error propagation and structured failure reporting (Task 5.4)
- Codebase exploration strategies for large repositories (Task 5.5)

## Exam Concepts

- **5.1 Context Preservation** — Strategies for maintaining relevant context as conversations grow beyond the window.
- **5.2 Escalation Patterns** — Knowing when the agent should stop and escalate to human review.
- **5.3 Error Propagation** — Structured error reporting that lets callers (agents or humans) make informed decisions.
- **5.4 Codebase Exploration** — Systematic strategies for navigating large codebases within context limits.
- **5.5 Provenance & Traceability** — Tracking where information came from for auditability.

## Connections

- **`src/agents/`** — Context management is critical for long-running agentic loops that accumulate conversation history.
- **`src/prompts/`** — Prompt length directly competes with context budget; the two must be co-optimised.
- **`src/cli/`** — The CLI's `assess` command evaluates readiness, which requires tracking study context across sessions.
