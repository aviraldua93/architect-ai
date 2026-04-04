# Architecture Guide

> **Goal:** A new contributor understands the entire codebase in 10 minutes.

---

## 1. Module Dependency Graph

```
┌──────────────────────────────────────────────────────────────────┐
│                      src/index.ts (public API)                   │
│   Re-exports: Tools · Prompts · Few-shot · Schemas · MCP Server │
└──────────────────────┬───────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┬───────────────┐
       ▼               ▼               ▼               ▼
  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ agents/ │    │  tools/  │    │ prompts/ │    │  mcp/    │
  │ Domain 1│    │ Domain 2 │    │ Domain 4 │    │ Domain 2 │
  └────┬────┘    └────┬─────┘    └──────────┘    └────┬─────┘
       │              │                               │
       │              └──────────┬────────────────────┘
       ▼                         ▼
  ┌─────────┐              ┌──────────┐
  │ context/│              │  types/  │ ← single source of truth
  │ Domain 5│              │ index.ts │
  └─────────┘              └──────────┘

  ┌──────────┐    ┌──────────┐
  │  cli/    │    │ config/  │
  │ Domain 3 │    │ Domain 3 │  (no cross-imports — exam material only)
  └────┬─────┘    └──────────┘
       │
       ▼
  ┌──────────┐
  │ content/ │
  │ questions│
  └──────────┘
```

**Key rule:** Dependencies flow **downward**. `agents → tools → types`. The `mcp/` server imports from `tools/`. The `cli/` imports from `content/` and `types/`. The `config/` modules are self-contained Domain 3 exam material with zero cross-imports.

---

## 2. Three-Tier System

ArchitectAI operates across three tiers, matching how the exam tests progressively deeper Claude integration:

### Tier 1 — Offline CLI (zero API keys)

```
User ──► CLI (quiz.ts) ──► Content Loader ──► Question Bank JSON
              │                                     │
              ▼                                     ▼
         formatter.ts                    Zod schema validation
         (ANSI rendering)                (schema.ts)
```

- **What it does:** Interactive quiz in the terminal — loads questions from JSON, presents them, tracks scores per domain.
- **API keys required:** None.
- **Entry point:** `bun run quiz` → `src/cli/index.ts` → `src/cli/quiz.ts`
- **Key files:** `cli/quiz.ts`, `cli/formatter.ts`, `content/questions/index.ts`

### Tier 2 — MCP Server (JSON-RPC)

```
MCP Client ──► JSON-RPC 2.0 ──► MCPServer (server.ts)
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
              5 Resources        3 Tools            3 Prompts
            (question banks)  (query/track/search)  (study/quiz/assess)
```

- **What it does:** Exposes the study system as an MCP server with resources, tools, and prompts. Clients connect via stdio transport.
- **API keys required:** None for the server itself; clients may use Claude.
- **Key file:** `src/mcp/server.ts` (712 lines)
- **Protocol:** Full JSON-RPC 2.0 with `initialize` handshake, method routing for `resources/list`, `resources/read`, `tools/list`, `tools/call`, `prompts/list`, `prompts/get`.

### Tier 3 — Live Agents (Claude API)

```
User ──► Coordinator ──► decompose() ──► Spawner ──► runAgenticLoop()
              │                              │              │
              │         ┌────────────────────┤              ▼
              ▼         ▼                    ▼         Claude API
         synthesise()  Hooks             Subagents     (tool_use /
                     (pre/post)         (isolated)      tool_result)
```

- **What it does:** Full agentic architecture — coordinator decomposes tasks, spawns isolated subagents, each running an agentic loop with Claude.
- **API keys required:** `ANTHROPIC_API_KEY`
- **Key files:** `agents/loop.ts`, `agents/coordinator.ts`, `agents/spawner.ts`
- **Critical pattern:** The agentic loop checks `stop_reason`, NOT `content[0].type`. Loop terminates when `stop_reason === "end_turn"`.

---

## 3. Source Directory Map

| Directory | Domain | Files | Purpose |
|-----------|--------|-------|---------|
| `src/agents/` | 1 (28%) | `loop.ts`, `coordinator.ts`, `spawner.ts`, `hooks.ts`, `decomposer.ts`, `session-state.ts`, `workflow-enforcer.ts`, `types.ts` | Core agentic architecture: loops, orchestration, hooks, enforcement |
| `src/tools/` | 2 (24%) | `definitions.ts`, `error-handling.ts` | Tool schemas (Zod-validated), structured error handling |
| `src/mcp/` | 2 (24%) | `server.ts` | MCP server: resources, tools, prompts over JSON-RPC 2.0 |
| `src/config/` | 3 (16%) | `claude-md.ts`, `slash-commands.ts`, `path-rules.ts`, `plan-mode.ts`, `ci-integration.ts` | Claude Code patterns: config hierarchy, commands, plan mode, CI |
| `src/prompts/` | 4 (18%) | `system-prompts.ts`, `few-shot.ts`, `output-schemas.ts` | Prompt engineering: system prompts, few-shot examples, output validation |
| `src/context/` | 5 (14%) | `session-manager.ts`, `progress-tracker.ts`, `escalation.ts` | Session state, progress tracking, tier 1→2→3 escalation |
| `src/cli/` | 3 (16%) | `index.ts`, `quiz.ts`, `formatter.ts` | Terminal UI, command dispatch, ANSI rendering |
| `src/content/` | — | `questions/index.ts`, `questions/schema.ts`, `questions/*.json` | Question bank: loader, Zod schema, 5 domain JSON files |
| `src/types/` | — | `index.ts` | Single source of truth for all shared TypeScript interfaces |

---

## 4. Question Bank Schema

Questions live in `src/content/questions/` as one JSON file per domain. The Zod schema in `schema.ts` enforces:

```
┌─────────────────────────────────────────────────┐
│ Question                                         │
├──────────────┬──────────────────────────────────┤
│ id           │ "d{domain}-q{number}" (e.g. d2-q001) │
│ domain       │ 1–5                              │
│ taskStatement│ "X.Y" format (e.g. "2.1")        │
│ difficulty   │ foundation │ intermediate │ advanced │
│ scenario     │ ≥50 chars, real-world context     │
│ question     │ ≥10 chars                         │
│ options      │ { A, B, C, D } — each ≥5 chars   │
│ correctAnswer│ A │ B │ C │ D                     │
│ explanation  │ ≥30 chars, why correct + why wrong│
│ examTrap     │ ≥10 chars, common misconception   │
│ conceptsTested│ string[] (≥1 tag)               │
└──────────────┴──────────────────────────────────┘
```

**To add questions:** Create or edit `domain-{N}-{slug}.json` → run `bun test test/tier1/` to validate. See the [Contributing Guide](CONTRIBUTING.md#writing-exam-questions) for full instructions.

**Domain JSON files:**

| File | Domain |
|------|--------|
| `domain-1-agentic-architecture.json` | Agentic Architecture |
| `domain-2-tool-design.json` | Tool Design & MCP |
| `domain-3-claude-code.json` | Claude Code Best Practices |
| `domain-4-prompt-engineering.json` | Prompt Engineering |
| `domain-5-context.json` | Context Management & Reliability |

---

## 5. Testing Tiers

```
                          ┌──────────────────────┐
                          │ Tier 3: LLM-as-Judge │  ~$0.15/run · <30s
                          │ Content quality eval  │  (planned)
                          └──────────┬───────────┘
                                     │
                          ┌──────────┴───────────┐
                          │ Tier 2: End-to-End   │  ~$3–4/run · minutes
                          │ Full agentic loops   │  (planned)
                          └──────────┬───────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  │        Tier 1: Static Validation     │  Free · <5s
                  │ Schema checks · type safety · imports│  ✅ IMPLEMENTED
                  └─────────────────────────────────────┘
```

| Tier | What It Tests | Cost | Speed | When It Runs |
|------|---------------|------|-------|--------------|
| **Tier 1** | Zod schema validation, TypeScript strict mode, module imports, integration contracts | Free | <5 seconds | Every commit, every PR (CI) |
| **Tier 2** | Full agentic loops with real Claude API calls, MCP protocol correctness, CLI dispatch | ~$3–4 per run | Minutes | Before merging agent logic changes |
| **Tier 3** | Question quality (realism, distractors), explanation clarity, prompt effectiveness | ~$0.15 per run | <30 seconds | After content changes |

**Tier 1 test files** (all in `test/tier1/`):

| Test File | What It Validates |
|-----------|-------------------|
| `questions-schema.test.ts` | Every question in every domain JSON passes Zod schema |
| `tools-definitions.test.ts` | Tool schemas, JSON Schema conversion, constrained enums |
| `tools-error-handling.test.ts` | ToolError class, type guards, retry logic, error wrapping |
| `mcp-server.test.ts` | MCP server registration, JSON-RPC dispatch, method routing |
| `prompts-system.test.ts` | System prompt completeness, role exhaustiveness |
| `prompts-few-shot.test.ts` | Few-shot example selection, token budgeting |
| `prompts-output-schemas.test.ts` | Output schema validation, retry pattern |
| `context-session.test.ts` | Session create/save/load/resume/fork lifecycle |
| `context-progress.test.ts` | Domain scoring, weak area identification, spaced repetition |
| `context-escalation.test.ts` | Escalation triggers, tier transitions, confidence detection |
| `agents-types.test.ts` | Agent module exports, type definitions |
| `cli-imports.test.ts` | CLI module import health |
| `integration-contract.test.ts` | Cross-module type contracts |
| `integration.test.ts` | Question loading smoke test |

---

## 6. Build Pipeline

```
┌──────────────┐     ┌──────────┐     ┌─────────────────────┐     ┌────────┐
│ src/**/*.ts  │────►│   tsc    │────►│ dist/**/*.js        │────►│  npm   │
│ (TypeScript) │     │ (build)  │     │ dist/**/*.d.ts      │     │publish │
└──────────────┘     └──────────┘     │ dist/**/*.d.ts.map  │     └────────┘
                                      └─────────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────────┐
                                      │ bin: architect-ai    │
                                      │ → dist/cli/index.js  │
                                      └─────────────────────┘
```

**Key configuration:**
- **Target:** ES2022 · **Module:** ESNext · **Strict:** true · **Incremental:** true (cache in `.tsc-cache`)
- **Output:** `./dist` (JS + declaration files + source maps)
- **Entry points:** `dist/index.js` (library API) and `dist/cli/index.js` (CLI binary)

**Scripts:**

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `tsc` | Compile to `dist/` |
| `typecheck` | `tsc --noEmit` | Type-check without emitting |
| `test` | `bun test test/tier1/` | Run Tier 1 tests |
| `lint` | `eslint src/ test/ --ext .ts` | ESLint with TypeScript rules |
| `start` | `tsx src/cli/index.ts` | Run CLI in dev mode (no build needed) |
| `dev` | `tsx --watch src/cli/index.ts` | Watch mode for development |
| `prepublishOnly` | typecheck → test → build | Safety gate before npm publish |

**CI pipeline** (runs on every PR and push to `main`):
1. `bun install`
2. `bun run typecheck` — Full TypeScript strict-mode check
3. `bun test test/tier1/` — All Tier 1 tests

---

## 7. Codebase as Curriculum

ArchitectAI's unique angle: **the source code IS the study material.** Every module teaches exam concepts through production-grade TypeScript. `@exam` JSDoc tags link code directly to exam task statements.

### Domain 1: Agentic Architecture (28% of exam)

| Task | Concept | File | What You Learn |
|------|---------|------|----------------|
| 1.1 | Agentic Loops | `agents/loop.ts` | `stop_reason`-driven termination, tool execution cycle, model-driven decisions |
| 1.2 | Multi-Agent Orchestration | `agents/coordinator.ts` | Hub-and-spoke topology, task decomposition, isolated subagent contexts |
| 1.3 | Subagent Invocation | `agents/spawner.ts` | Context isolation, `Promise.allSettled` for parallel execution, structured context passing |
| 1.4 | Workflow Enforcement | `agents/workflow-enforcer.ts` | Programmatic (deterministic) vs prompt-based (probabilistic) rules, HITL handoffs |
| 1.5 | Agent SDK Hooks | `agents/hooks.ts` | Pre/post-tool-use hooks, composable pipelines, deterministic guardrails |
| 1.6 | Task Decomposition | `agents/decomposer.ts` | Fixed sequential vs dynamic adaptive, attention dilution guard, multi-pass batching |
| 1.7 | Session State | `agents/session-state.ts` | Three resumption strategies (full/fresh/fork), stale context detection |

### Domain 2: Tool Design & MCP (24% of exam)

| Task | Concept | File | What You Learn |
|------|---------|------|----------------|
| 2.1 | Tool Interfaces | `tools/definitions.ts` | Zod schemas, constrained enums, JSON Schema conversion, tool description best practices |
| 2.2 | Structured Errors | `tools/error-handling.ts` | `ToolError` class, 6 error types, retry logic, `withStructuredErrors` wrapper |
| 2.4 | MCP Protocol | `mcp/server.ts` | JSON-RPC 2.0, resources/tools/prompts registration, method dispatch, `initialize` handshake |

### Domain 3: Claude Code Best Practices (16% of exam)

| Task | Concept | File | What You Learn |
|------|---------|------|----------------|
| 3.1 | CLAUDE.md Hierarchy | `config/claude-md.ts` | Config inheritance (root → directory), rule parsing, merge strategy |
| 3.2 | Slash Commands | `config/slash-commands.ts` | `.claude/commands/` templates, `$ARGUMENTS` placeholder, command registry |
| 3.3 | Path Rules | `config/path-rules.ts` | `.claude/rules/` glob patterns, additive rule matching, frontmatter parsing |
| 3.4–3.5 | Plan Mode & Iteration | `config/plan-mode.ts` | Plan vs direct heuristics, edit-test-fix cycle, context compaction |
| 3.6 | CI Integration | `config/ci-integration.ts` | `--non-interactive`, `--allowedTools` whitelisting, `--output-format json`, max-turns cap |

### Domain 4: Prompt Engineering (18% of exam)

| Task | Concept | File | What You Learn |
|------|---------|------|----------------|
| 4.1 | System Prompts | `prompts/system-prompts.ts` | Three agent personas (Quiz/Explainer/Assessor), explicit constraints, output format specs |
| 4.2 | Few-Shot Prompting | `prompts/few-shot.ts` | Dynamic example selection within token budget, progressive complexity, tag-based filtering |
| 4.3 | Output Validation | `prompts/output-schemas.ts` | Zod schemas for structured output, `validateWithRetry` pattern, JSON extraction |

### Domain 5: Context Management & Reliability (14% of exam)

| Task | Concept | File | What You Learn |
|------|---------|------|----------------|
| 5.1 | Context Windows | `context/session-manager.ts` | Session persistence, summary injection on resume, stale file detection, domain score tracking |
| 5.1 | Progress Tracking | `context/progress-tracker.ts` | Weighted scoring (matching exam weights), weak area identification, spaced repetition |
| 5.2 | Escalation Patterns | `context/escalation.ts` | Tier 1→2→3 triggers, consecutive failures, declining trends, guessing pattern detection |

### How `@exam` Tags Work

Every teaching file uses JSDoc `@exam` tags to mark exactly which exam concept the surrounding code demonstrates:

```typescript
/**
 * Run a complete agentic loop.
 *
 * @exam Domain 1.1 — Agentic Loops
 */
export async function runAgenticLoop(
  client: Anthropic,
  config: AgenticLoopConfig,
  userMessage: string,
): Promise<AgenticLoopResult> {
  // The loop body IS the exam material
}
```

To find every exam-tagged section: `grep -rn "@exam" src/`

---

## 8. Key Architectural Patterns

### Pattern: Structured Error Recovery (Domain 2.2)
```
Tool throws → ToolError.toToolResult() → tool_result with is_error: true
                                              │
                                              ▼
                                    Model reads error_type,
                                    retry_eligible, suggested_action
                                              │
                                              ▼
                                    Model decides: retry? adjust? escalate?
```

### Pattern: Hub-and-Spoke Orchestration (Domain 1.2)
```
User Query → Coordinator.decompose() → [Task₁, Task₂, Task₃]
                                              │
                    ┌─────────────────────────┼─────────────────┐
                    ▼                         ▼                 ▼
              spawnSubagent()          spawnSubagent()    spawnSubagent()
              (isolated context)       (isolated context) (isolated context)
                    │                         │                 │
                    └─────────────────────────┼─────────────────┘
                                              ▼
                                    Coordinator.synthesise()
                                              │
                                              ▼
                                        Final Response
```

**Critical rule:** Subagents NEVER communicate directly. All context must be explicitly passed by the coordinator.

### Pattern: Deterministic vs Probabilistic Enforcement (Domain 1.4)
```
Programmatic rules  ──► check() function  ──► 100% guaranteed
                         (code runs every time)

Prompt-based rules  ──► promptGuidance    ──► ~95% reliable
                         (injected into system prompt)
```

Use programmatic enforcement for invariants (financial limits, PII redaction). Use prompt-based guidance for preferences (tone, style, format).

---

## 9. Quick Reference for Common Tasks

| I want to… | Start here |
|-------------|-----------|
| Add exam questions | `src/content/questions/` → see [CONTRIBUTING.md](CONTRIBUTING.md#writing-exam-questions) |
| Understand the agentic loop | `src/agents/loop.ts` (377 lines, heavily commented) |
| See how tools are defined | `src/tools/definitions.ts` (Zod schemas with `@exam 2.1` tags) |
| Trace the MCP protocol | `src/mcp/server.ts` → `handleRequest()` method dispatch |
| Read system prompts | `src/prompts/system-prompts.ts` (Quiz/Explainer/Assessor) |
| See escalation logic | `src/context/escalation.ts` → `shouldEscalate()` |
| Run the quiz locally | `bun run quiz` (zero API keys) |
| Run all tests | `bun test test/tier1/` |
| Build for npm | `npm run build` → outputs to `dist/` |
