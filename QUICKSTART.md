# Quick Start — ArchitectAI

Get up and running in under 5 minutes.

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Git

## Setup

```bash
# Clone the repository
git clone https://github.com/aviraldua93/architect-ai.git
cd architect-ai

# Install dependencies
bun install        # or: npm install

# Build TypeScript
bun run build      # or: npm run build

# Verify everything works
bun run test:tier1
```

## Environment (optional)

Only needed for Tier 3 (live agent sessions):

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

## Start Learning

```bash
# Tier 1: Offline study — no API key needed
bun run quiz              # Quick practice questions
bun run quiz -- -d 1      # Filter to Domain 1
bun run study             # Interactive study session

# Tier 2: MCP server — plug into Claude Desktop or Copilot
bun run mcp

# Tier 3: Live agents — requires ANTHROPIC_API_KEY
bun run agent
```

## Project Layout

| Directory | Exam Domain | Weight |
|-----------|-------------|--------|
| `src/agents/` | Domain 1: Agentic Architecture | 27% |
| `src/tools/`, `src/mcp/` | Domain 2: Tool Design & MCP | 18% |
| `src/cli/`, `.claude/` | Domain 3: Claude Code Config | 20% |
| `src/prompts/` | Domain 4: Prompt Engineering | 20% |
| `src/context/` | Domain 5: Context & Reliability | 15% |
| `src/content/` | Pre-generated study material | — |

## Useful Commands

```bash
bun run build         # Compile TypeScript
bun run dev           # TypeScript watch mode
bun run lint          # ESLint
bun run format        # Prettier
bun run type-check    # TypeScript strict checking
bun run test:tier1    # Free static validation (<5s)
bun run test:tier2    # E2E tests (~$3-4/run, needs API key)
bun run test:tier3    # LLM-as-judge (~$0.15/run, needs API key)
```

## Next Steps

1. Read [`CLAUDE.md`](CLAUDE.md) for the full project architecture.
2. Explore the `src/` directories — each has a README mapping to exam domains.
3. Check [`TODOS.md`](TODOS.md) for the project backlog.
4. See [`docs/QA_STRATEGY.md`](docs/QA_STRATEGY.md) for the testing philosophy.
