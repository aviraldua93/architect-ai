# Contributing to ArchitectAI

Welcome! This guide covers everything you need to contribute cleanly.

## Branch Naming Convention

All branches must use a category prefix with a forward slash:

| Prefix   | Purpose                                |
| -------- | -------------------------------------- |
| `feat/`  | New features or capabilities           |
| `fix/`   | Bug fixes                              |
| `docs/`  | Documentation-only changes             |
| `test/`  | Adding or updating tests               |
| `chore/` | Tooling, CI, refactors, dependencies   |

**Examples:** `feat/quiz-timer`, `fix/undefined-domain-name`, `docs/api-reference`, `test/tier2-e2e`, `chore/ci-pipeline-and-build`

## PR Process

1. **Branch** — Create a branch from `main` using the naming convention above.
2. **Commit** — Make your changes. All commits must be authored as:
   ```
   Aviral Dua <aviraldua9@gmail.com>
   ```
3. **Push** — Push your branch to `origin`.
4. **Open a PR** — Target `main`. Fill in the PR template with a clear description.
5. **Review** — At least one other team member must approve the PR.
6. **CI green** — The Tier 1 CI pipeline must pass (typecheck + tests).
7. **Merge** — A reviewer merges the PR. **Nobody merges their own PR.**

## Running Tests Locally

### Prerequisites

- [Bun](https://bun.sh/) (latest stable)
- Node.js 18+ (for `tsx` scripts)

### Commands

```bash
# Install dependencies
bun install

# Type-check the entire codebase (src + test)
bun run typecheck

# Run Tier 1 tests (static validation, schema checks, integration contracts)
bun test test/tier1/

# Run the CLI locally
bun run start          # Show help
bun run quiz           # Quick practice quiz
bun run quiz -- -d 1   # Quiz filtered to Domain 1
```

### What CI Runs

The CI pipeline (`Tier 1 — Static Validation`) runs on every PR and push to `main`:

1. `bun run typecheck` — Full TypeScript strict-mode check across `src/` and `test/`.
2. `bun test test/tier1/` — All Tier 1 tests: schema validation, import health, integration contracts.

Your PR will not be merged unless both steps pass.

## Code Style Guidelines

### Language

Use **British English** throughout the codebase:

- ✅ `normalise`, `colour`, `behaviour`, `serialise`, `optimise`
- ❌ `normalize`, `color`, `behavior`, `serialize`, `optimize`

### JSDoc

All exported functions, classes, and interfaces must have JSDoc comments. Use the `@exam` tag to link code to exam domains:

```typescript
/**
 * Run a complete agentic loop.
 *
 * @exam Domain 1.1 — Agentic Loops
 *
 * @param client - An initialised Anthropic SDK client.
 * @param config - Loop configuration.
 * @returns The final loop result.
 */
export async function runAgenticLoop(
  client: Anthropic,
  config: AgenticLoopConfig,
  userMessage: string,
): Promise<AgenticLoopResult> {
  // ...
}
```

### TypeScript

- **Strict mode is mandatory** — the `tsconfig.json` enforces `"strict": true`.
- Prefer `interface` over `type` for object shapes.
- Use `as const` for literal arrays and objects.
- No `any` — use `unknown` and narrow with type guards.

### File Organisation

- `src/types/index.ts` is the **single source of truth** for shared types.
- `src/agents/` — Agent system modules (loop, coordinator, spawner, hooks).
- `src/tools/` — Tool definitions and structured error handling (Domain 2).
- `src/mcp/` — MCP server: resources, tools, prompts (Domain 2).
- `src/prompts/` — System prompts, few-shot examples, output schemas (Domain 4).
- `src/context/` — Session management, progress tracking, escalation (Domain 5).
- `src/cli/` — Terminal UI and command handling.
- `src/content/questions/` — Question bank loader and Zod schemas.
- `test/tier1/` — Fast, offline, static validation tests.

## How to Add Questions

### Question Format

All question banks live in `src/content/questions/` as JSON files. Each question must conform to the Zod schema in `schema.ts`:

```json
{
  "id": "d2-q001",
  "domain": 2,
  "taskStatement": "2.1",
  "difficulty": "intermediate",
  "scenario": "Your team is building a research agent with search and summarise tools...",
  "question": "What is the MOST LIKELY root cause of the tool selection error?",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text"
  },
  "correctAnswer": "B",
  "rationale": "Tool descriptions are the primary mechanism for selection...",
  "tags": ["tool-descriptions", "misrouting"]
}
```

### ID Convention

Question IDs follow the pattern `d{domain}-q{number}`:
- `d1-q001` through `d1-qNNN` — Domain 1
- `d2-q001` through `d2-qNNN` — Domain 2
- And so on for Domains 3–5

### File Naming

- One JSON file per domain: `domain-{N}-{slug}.json`
- Example: `domain-2-tool-design-mcp.json`

### Steps to Add Questions

1. Create or edit the domain JSON file in `src/content/questions/`.
2. Ensure every question has a unique `id`, valid `domain` (1–5), and valid `taskStatement` (e.g. `"2.1"`).
3. Run the schema validator: `bun test test/tier1/` — the schema tests will catch malformed questions.
4. Questions should be scenario-based with one correct answer and three plausible distractors.
5. The `rationale` field should explain **why** the correct answer is right and why common wrong answers are tempting.
6. Use British English throughout (normalise, colour, behaviour).