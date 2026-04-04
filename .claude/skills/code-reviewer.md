---
description: Review student code implementations against CCA-F exam patterns
context: fork
allowed-tools: [Read, Grep, Glob]
---

# Code Review Skill

Review the student's code implementation for correctness against CCA-F exam patterns and best practices.

## Instructions

1. Use `Glob` to locate the file(s) the student wants reviewed (e.g., `src/agents/*.ts`).
2. Use `Read` to load each file.
3. Use `Grep` to cross-reference against canonical implementations in this codebase.
4. Evaluate the code against these CCA-F criteria:

### Agentic Loop (Domain 1.1)
- [ ] Uses `stop_reason` (not content type) for loop termination
- [ ] Does not parse natural language like "I'm done" for termination
- [ ] Safety cap (`maxIterations`) is a backstop, not the primary stop mechanism
- [ ] Tool results include matching `tool_use_id`

### Multi-Agent (Domain 1.2)
- [ ] Hub-and-spoke topology — subagents never communicate directly
- [ ] Subagents receive explicit context, not inherited conversation history

### Hooks (Domain 1.5)
- [ ] Deterministic guardrails are in hooks, not prompts
- [ ] PreToolUse hooks validate before execution
- [ ] PostToolUse hooks normalise data after execution

### Tool Design (Domain 2.1)
- [ ] Tool descriptions include: what, when, when-not, return format, side effects
- [ ] Parameter schemas use constrained types (enums, min/max)

5. Provide a structured review with ✅ passes and ❌ issues, citing specific line numbers.

## SKILL.md Feature Notes (CCA-F Exam Reference)

- **`context: fork`**: Isolates the review session so review comments don't pollute the main conversation.
- **`allowed-tools`**: Includes `Glob` (in addition to `Read` and `Grep`) because code review requires discovering files by pattern. No `Edit` or `Write` — this skill is read-only.
- **No `argument-hint`**: Omitted because the skill's intent is clear from the description. The user just invokes it and points at code.
