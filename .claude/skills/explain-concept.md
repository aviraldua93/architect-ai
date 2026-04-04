---
description: Provide a deep-dive explanation of a CCA-F exam concept
allowed-tools: [Read, Grep]
argument-hint: "Which concept? (e.g., 'agentic loops', 'tool_choice modes', 'context windows')"
---

# Concept Explainer Skill

Provide a thorough, exam-focused explanation of a CCA-F concept, grounded in this codebase.

## Instructions

1. Identify the concept from the user's input.
2. Use `Grep` to find all files referencing the concept (search for `@exam` tags, domain numbers, and concept keywords).
3. Use `Read` to load the most relevant source files.
4. Deliver a layered explanation:

### Simple (1–2 sentences)
Plain English summary. No jargon.

### Detailed (1–2 paragraphs)
How it works, with a direct code reference from this codebase:

```typescript
// From: {file path}, lines {start}–{end}
{relevant code snippet}
```

### Advanced (optional)
Edge cases, trade-offs, and common exam traps.

### Exam Tips
- Which domain and task statement this maps to
- The most common wrong answer and why it's tempting
- Keywords to watch for in the question stem

5. End with 2–3 related concepts the student should review next.

## Concept Map (Quick Reference)

| Concept | Primary File | Exam Domain |
|---------|-------------|-------------|
| Agentic loops | `src/agents/loop.ts` | 1.1 |
| Hub-and-spoke | `src/agents/coordinator.ts` | 1.2 |
| Subagent isolation | `src/agents/spawner.ts` | 1.3 |
| SDK hooks | `src/agents/hooks.ts` | 1.5 |
| Tool descriptions | `src/tools/definitions.ts` | 2.1 |
| System prompts | `src/prompts/system-prompts.ts` | 4.1 |
| Context management | `src/context/` | 5.x |

## SKILL.md Feature Notes (CCA-F Exam Reference)

- **No `context` field**: Omitted (defaults to the main conversation context). This is intentional — explanations benefit from seeing what the student was just discussing, so they don't need isolation.
- **`allowed-tools`**: Only `Read` and `Grep` — the explainer never modifies files.
- **`argument-hint`**: Prompts the user with example concepts to explain, reducing friction.
