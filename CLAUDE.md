# ArchitectAI — Claude Certified Architect Study Tool

AI-powered study tool for the Claude Certified Architect (Foundations) exam. **The codebase IS the curriculum** — every architectural pattern the exam tests is implemented here.

## Architecture

Three-tier architecture, each tier adding capability:

| Tier | Name | Description |
|------|------|-------------|
| 1 | Offline CLI | Question bank, study mode, mock exams — no API key required |
| 2 | MCP Server | Expose study tools via Model Context Protocol for Claude Desktop |
| 3 | BYOK Live Agents | Bring-your-own-key agentic workflows with real Claude API calls |

### Key Patterns

- **Hub-and-spoke coordination**: Coordinator agent controls all subagent communication
- **Subagent isolation**: Subagents never share state — explicit context passing only
- **Agentic loops with `stop_reason`**: Loops terminate on `end_turn`, not arbitrary limits
- **Programmatic workflow enforcement**: Workflows enforced via code, not prompt instructions

## Exam Domains

| Domain | Name | Weight | Source |
|--------|------|--------|--------|
| 1 | Agentic Architecture & Orchestration | 27% | `src/agents/` |
| 2 | Tool Design & MCP Integration | 18% | `src/tools/`, `src/mcp/` |
| 3 | Claude Code Configuration & Workflows | 20% | `src/cli/`, `.claude/` |
| 4 | Prompt Engineering & Structured Output | 20% | `src/prompts/` |
| 5 | Context Management & Reliability | 15% | `src/context/` |

### Task Statements

**Domain 1 — Agentic Architecture & Orchestration**
1.1 Agentic Loops · 1.2 Multi-Agent Orchestration · 1.3 Subagent Invocation · 1.4 Workflow Enforcement · 1.5 Agent SDK Hooks · 1.6 Task Decomposition · 1.7 Session State

**Domain 2 — Tool Design & MCP Integration**
2.1 Tool Descriptions as Selection Mechanism · 2.2 Structured Error Responses · 2.3 Tool Choice Modes · 2.4 MCP Resources, Tools & Prompts · 2.5 Built-in vs Custom Tools

**Domain 3 — Claude Code Configuration & Workflows**
3.1 CLAUDE.md Hierarchy · 3.2 Slash Commands & Skills · 3.3 Path Rules with Glob Patterns · 3.4 Plan Mode Workflow · 3.5 Iterative Refinement · 3.6 CI/CD Integration

**Domain 4 — Prompt Engineering & Structured Output**
4.1 Explicit Criteria & Rubrics · 4.2 Few-Shot Examples · 4.3 Tool Use Schemas & Validation · 4.4 Validation-Retry Pattern · 4.5 Batch API · 4.6 Multi-Instance Review & Aggregation

**Domain 5 — Context Management & Reliability**
5.1 Context Preservation & Summarisation · 5.2 Escalation Patterns & Confidence · 5.3 Error Propagation in Multi-Agent Systems · 5.4 Codebase Exploration Strategies · 5.5 Human-in-the-Loop & Approval Gates · 5.6 Provenance & Audit Trails

## Content System

105 questions across 5 domains, stored as Zod-validated JSON in `src/content/questions/`. Each question includes:

- Scenario (≥50 chars), question text, four options (A–D)
- Correct answer, explanation (≥30 chars), exam trap, concepts tested
- Question IDs follow pattern: `d{domain}-q{number}` (e.g. `d1-q01`)
- Difficulty: `foundation` | `intermediate` | `advanced`

## Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Launch CLI (interactive menu) |
| `npm run quiz` | Quick quiz mode |
| `npm run study` | Study mode with explanations |
| `npm run assess` | Assessment / diagnostic |
| `npm run dev` | Watch mode (auto-reload on changes) |
| `npm run build` | Compile TypeScript (`tsc`) |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `npm run lint` | Lint via type-check (`tsc --noEmit`) |
| `npm test` | Run Tier 1 tests (`bun test test/tier1/`) |

### Running Directly

```bash
npx tsx src/cli/index.ts quiz           # Quick quiz
npx tsx src/cli/index.ts quiz -d 1      # Domain 1 only
npx tsx src/cli/index.ts quiz -t 1.3    # Task 1.3 only
npx tsx src/cli/index.ts study          # Study mode
npx tsx src/cli/index.ts assess         # Assessment
```

## Project Structure

```
architect-ai/
├── CLAUDE.md                    # This file — project configuration for Claude
├── package.json                 # Node.js project (tsx, vitest, zod, @anthropic-ai/sdk)
├── tsconfig.json                # TypeScript strict mode
├── VERSION                      # Semantic version
├── CHANGELOG.md                 # Release history
│
├── src/
│   ├── agents/                  # Domain 1: Agentic Architecture & Orchestration
│   ├── tools/                   # Domain 2: Tool Design
│   ├── mcp/                     # Domain 2: MCP Integration
│   ├── cli/                     # Domain 3: CLI framework
│   ├── config/                  # Application configuration
│   ├── prompts/                 # Domain 4: Prompt Engineering
│   ├── context/                 # Domain 5: Context Management
│   ├── content/                 # Question bank (Zod-validated JSON)
│   │   └── questions/           # 105 questions across 5 domains
│   └── types/                   # Single source of truth for shared types
│       └── index.ts             # DOMAIN_NAMES, TASK_STATEMENT_NAMES, Question, etc.
│
├── web/                         # Next.js 14 web application (App Router + Tailwind)
│
├── test/
│   ├── tier1/                   # Free, <5 seconds, runs on every PR
│   ├── tier2/                   # E2E with real API calls (gated by label)
│   └── tier3/                   # LLM-as-judge quality checks (gated by label)
│
├── docs/                        # Architecture & contributor documentation
│
└── .claude/
    ├── commands/                # Slash commands (/quiz, /study, /exam, /status)
    ├── rules/                   # Path-specific engineering rules
    └── roles/                   # Persona definitions for Claude sessions
```

## Testing

Three-tier testing strategy:

| Tier | Scope | Speed | Gate |
|------|-------|-------|------|
| 1 | Type-checking, schema validation, unit tests | <5 seconds | Every PR |
| 2 | End-to-end with real API calls | Minutes | Label-gated |
| 3 | LLM-as-judge quality evaluation | Minutes | Label-gated |

```bash
npm test                         # Tier 1 (default)
npm run typecheck                # Type-check only
```

## The `.claude/` Folder

The `.claude/` directory configures Claude's behaviour within this project:

- **`commands/`** — Slash commands available in Claude sessions (e.g. `/quiz`, `/study`, `/exam`, `/status`). Each `.md` file defines a command's purpose, usage, and implementation.
- **`rules/`** — Path-specific engineering rules applied automatically when Claude edits files matching glob patterns. Enforces coding standards, naming conventions, and domain-specific patterns.
- **`roles/`** — Persona definitions that give Claude specific expertise and context for different tasks (e.g. Domain Engineer, Technical Writer).

## Tech Stack

- **Runtime**: Node.js 18+ with tsx for TypeScript execution
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest + Bun test runner
- **Validation**: Zod schemas for all content
- **AI SDK**: @anthropic-ai/sdk for Tier 3 live agents
- **Web**: Next.js 14, Tailwind CSS, App Router
- **Protocol**: Model Context Protocol (MCP) for tool integration

## Licence

MIT

## Author

ArchitectAI Team
