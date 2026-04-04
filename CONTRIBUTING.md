# Contributing to ArchitectAI

Welcome! This guide covers everything you need to contribute cleanly.

> **New here?** Read [ARCHITECTURE.md](ARCHITECTURE.md) first — it explains the full codebase in 10 minutes.

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

---

## Writing Exam Questions

This section supplements the "How to Add Questions" section above with detailed guidance on writing high-quality exam questions.

### JSON Schema Reference

Every question must pass the Zod schema in `src/content/questions/schema.ts`. Here is the full shape:

```json
{
  "id": "d2-q015",
  "domain": 2,
  "taskStatement": "2.1",
  "difficulty": "intermediate",
  "scenario": "Your team is building a research agent with search and summarise tools. The agent consistently calls the search tool when users ask for summaries of previously retrieved content. Logs show the tool descriptions are nearly identical except for the verb used.",
  "question": "What is the MOST LIKELY root cause of the tool selection error?",
  "options": {
    "A": "The model's temperature is set too high for deterministic tool selection",
    "B": "The tool descriptions lack clear WHEN and WHEN NOT disambiguation",
    "C": "The search tool's input schema accepts too many parameter types",
    "D": "The summarise tool needs a higher priority in the tool registry"
  },
  "correctAnswer": "B",
  "explanation": "Tool descriptions are the primary mechanism Claude uses for tool selection. Without clear WHEN (use this tool for X) and WHEN NOT (do not use this for Y) sections, the model cannot distinguish between tools with overlapping capabilities.",
  "examTrap": "Option A is tempting because temperature affects randomness, but tool selection errors from ambiguous descriptions occur at any temperature setting.",
  "conceptsTested": ["tool-descriptions", "tool-disambiguation", "WHEN-WHEN-NOT-pattern"]
}
```

### Field Constraints

| Field | Constraint |
|-------|-----------|
| `id` | Pattern: `d{domain}-q{number}` — unique across all files |
| `domain` | Integer 1–5 |
| `taskStatement` | Format `"X.Y"` matching the exam blueprint (e.g. `"1.1"`, `"2.4"`) |
| `difficulty` | `"foundation"` · `"intermediate"` · `"advanced"` |
| `scenario` | ≥50 characters, real-world context |
| `question` | ≥10 characters |
| `options` | 4 options (A–D), each ≥5 characters |
| `correctAnswer` | One of `"A"`, `"B"`, `"C"`, `"D"` |
| `explanation` | ≥30 characters — explain why correct AND why wrong answers are tempting |
| `examTrap` | ≥10 characters — the most common misconception |
| `conceptsTested` | Array of ≥1 string tag |

### Picking Domain, Task, and Difficulty

1. **Domain** — Match the CCA-F exam blueprint. Check `src/types/index.ts` → `TASK_STATEMENT_NAMES` for the full list.
2. **Task statement** — Be specific. `"1.1"` (Agentic Loops) is better than just Domain 1.
3. **Difficulty levels:**
   - **Foundation** — Tests recall of a single concept (e.g. "What does `stop_reason: end_turn` mean?")
   - **Intermediate** — Tests application in a scenario (e.g. "Given this bug, what's the root cause?")
   - **Advanced** — Tests synthesis across multiple concepts (e.g. "Design a system that combines hooks, escalation, and multi-agent coordination")

### What Makes Good Distractors

A strong distractor is **plausible but wrong for a specific, explainable reason**:

- ✅ **Good:** "Increase the model's context window to 200K tokens" — sounds reasonable but doesn't address the root cause
- ✅ **Good:** "Add retry logic around the tool call" — a real pattern, but misapplied here
- ❌ **Bad:** "Add the word 'please' to the prompt" — obviously wrong, nobody would pick this
- ❌ **Bad:** "Restart the server" — not related to the domain at all

**Rules for distractors:**
1. Each distractor should be a real technique or pattern — just not the right one for this scenario.
2. At least one distractor should target a common misconception (document it in `examTrap`).
3. Avoid "all of the above" or "none of the above" options.
4. Options should be roughly the same length — a suspiciously long option signals the correct answer.

---

## Running Tests Locally

### Prerequisites

- [Bun](https://bun.sh/) (latest stable) — primary runtime for tests
- Node.js 18+ (for `tsx` scripts)

### Commands

```bash
# Install dependencies
bun install

# Type-check the entire codebase (src + test)
bun run typecheck          # or: npm run typecheck

# Run Tier 1 tests (static validation, schema checks, integration contracts)
bun test test/tier1/       # or: npm run test

# Run ESLint
npm run lint               # eslint src/ test/ --ext .ts
npm run lint:fix           # auto-fix where possible

# Run the CLI locally (zero API keys needed)
bun run start              # Show help
bun run quiz               # Quick practice quiz
bun run quiz -- -d 1       # Quiz filtered to Domain 1
```

### What CI Runs

The CI pipeline (`Tier 1 — Static Validation`) runs on every PR and push to `main`:

1. `bun run typecheck` — Full TypeScript strict-mode check across `src/` and `test/`.
2. `bun test test/tier1/` — All Tier 1 tests: schema validation, import health, integration contracts.

Your PR will not be merged unless both steps pass.

### Testing Tiers Explained

| Tier | What | Cost | When |
|------|------|------|------|
| **Tier 1** | Schema validation, type safety, module imports | Free | Every PR (CI) |
| **Tier 2** | Full agentic loops with Claude API | ~$3–4/run | Before merging agent logic |
| **Tier 3** | LLM-as-judge content quality eval | ~$0.15/run | After content changes |

---

## Code Style

### ESLint Configuration

The project uses ESLint with `@typescript-eslint`. Configuration lives in `.eslintrc.json`:

- **Parser:** `@typescript-eslint/parser`
- **Extends:** `eslint:recommended`, `plugin:@typescript-eslint/recommended`
- **Key rules:**
  - `@typescript-eslint/no-explicit-any: "warn"` — prefer `unknown` and narrow with type guards
  - `@typescript-eslint/no-unused-vars: "warn"` — prefix unused args with `_` (e.g. `_unused`)

Run `npm run lint` before submitting a PR.

### TypeScript Strict Mode

The `tsconfig.json` enforces `"strict": true`. This means:

- No implicit `any` — every variable must have a known type.
- No `any` casts — use `unknown` and narrow with type guards or Zod.
- Strict null checks — handle `null` and `undefined` explicitly.
- The project has **zero** explicit `any` types across 7,500+ lines — maintain this discipline.

### Language: British English

Use **British English** throughout the codebase:

- ✅ `normalise`, `colour`, `behaviour`, `serialise`, `optimise`, `organisation`
- ❌ `normalize`, `color`, `behavior`, `serialize`, `optimize`, `organization`

This applies to code, comments, documentation, question content, and commit messages.

### JSDoc and `@exam` Tags

All exported functions, classes, and interfaces must have JSDoc comments. Use the `@exam` tag to link code to exam domains:

```typescript
/**
 * Detect when a student needs escalation to a higher support tier.
 *
 * @exam Domain 5.2 — Escalation Patterns (Tier 1 → Tier 2 → Tier 3)
 *
 * @param answers - Recent answer history.
 * @param currentTier - The student's current escalation tier.
 * @param domain - The domain being studied.
 * @returns Whether escalation should occur and the context for the receiving tier.
 */
export function shouldEscalate(
  answers: AnswerRecord[],
  currentTier: EscalationTier,
  domain: number,
): EscalationCheckResult {
  // ...
}
```

### File Organisation

| Directory | Purpose |
|-----------|---------|
| `src/types/index.ts` | **Single source of truth** for shared types |
| `src/agents/` | Agent system modules (loop, coordinator, spawner, hooks) — Domain 1 |
| `src/tools/` | Tool definitions and structured error handling — Domain 2 |
| `src/mcp/` | MCP server: resources, tools, prompts — Domain 2 |
| `src/config/` | Claude Code patterns: CLAUDE.md, commands, path rules, plan mode, CI — Domain 3 |
| `src/prompts/` | System prompts, few-shot examples, output schemas — Domain 4 |
| `src/context/` | Session management, progress tracking, escalation — Domain 5 |
| `src/cli/` | Terminal UI and command handling |
| `src/content/questions/` | Question bank loader and Zod schemas |
| `test/tier1/` | Fast, offline, static validation tests |