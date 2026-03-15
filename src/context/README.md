# Domain 5: Context & Reliability (15%)

Covers Domain 5 of the Claude Certified Architect (Foundations) exam — context window optimisation, escalation patterns, error propagation, and human review integration.

## Files

| File | Exam Task | What It Demonstrates |
|------|-----------|---------------------|
| session-manager.ts | 1.7 / 5.1 — Session State & Context Windows | SessionManager class: create, save, load, resume, and fork study sessions. Summary injection on resume (compact context instead of full replay). Stale context detection via file modification timestamps. |
| progress-tracker.ts | 5.1 — Optimise Context Windows | ProgressTracker class: per-domain scoring, weighted readiness summaries, weak area identification (below 72% pass threshold), and spaced repetition recommendations that allocate study time by marginal return. |
| scalation.ts | 5.2 — Escalation Patterns | Tier 1 to 2 to 3 escalation detection using consecutive wrong answers, declining performance trends, and guessing patterns (correct answers with low confidence). Structured EscalationContext passed to receiving tier. |

## Exam Concepts

- **5.1 Context Preservation** — Strategies for maintaining relevant context as conversations grow beyond the window.
- **5.2 Escalation Patterns** — Knowing when the agent should stop and escalate to human review.
- **5.3 Error Propagation** — Structured error reporting that lets callers (agents or humans) make informed decisions.
- **5.4 Codebase Exploration** — Systematic strategies for navigating large codebases within context limits.
- **5.5 Provenance & Traceability** — Tracking where information came from for auditability.

## Connections

- **src/agents/** — Context management is critical for long-running agentic loops that accumulate conversation history.
- **src/prompts/** — Prompt length directly competes with context budget; the two must be co-optimised.
- **src/cli/** — The CLI's ssess command evaluates readiness, which requires tracking study context across sessions.