# Engineering Rules

## All Source Code (src/**)

- TypeScript strict mode
- Run `npx tsc --noEmit` before committing — ZERO errors
- British English spelling in all comments and documentation
- Every file must export types for its public API

## Agent Code (src/agents/**)

- Must demonstrate exam concepts from Domain 1
- Every agent pattern must be annotated with the task statement it demonstrates
- Hub-and-spoke: coordinator controls all subagent communication
- Subagents never share state — explicit context passing only

## Question Content (src/content/questions/**)

- All questions must pass Zod schema validation (src/content/questions/schema.ts)
- Question IDs follow pattern: d{domain}-q{number}
- Every question needs: scenario (≥50 chars), explanation (≥30 chars), examTrap, conceptsTested
- Difficulty must be: foundation | intermediate | advanced (NOT easy/medium/hard)
- Every task statement must have ≥2 questions

## CLI (src/cli/**)

- Use DOMAIN_NAMES and TASK_STATEMENT_NAMES from src/types/index.ts
- Never hardcode domain or task names
- All user-facing text must be colour-coded with ANSI helpers from formatter.ts

## Web App (web/**)

- Next.js 14 with App Router
- Tailwind CSS dark theme (see web/DESIGN_SYSTEM.md)
- 'use client' directive on any component with hooks/state/browser APIs
- All components must be keyboard accessible (WCAG AA)
- Import types from web/src/lib/types.ts (not directly from src/)

## Tests (test/**)

- Tier 1: Free, <5 seconds, runs on every PR
- Tier 2: E2E with real API calls (gated by label)
- Tier 3: LLM-as-judge quality checks (gated by label)
- Every bug fix must include a regression test
