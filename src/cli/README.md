# Domain 3: CLI & Commands (20%)

Implements the command-line interface for ArchitectAI, covering Domain 3 of the Claude Certified Architect (Foundations) exam. This is the primary user-facing entry point for Tier 1 offline study.

## Files

| File | What It Does |
|------|-------------|
| `index.ts` | Main CLI entry point. Parses commands (`study`, `quiz`, `assess`, `explain`, `version`, `help`) and dispatches to handlers. Supports domain/task-statement filtering via `-d` and `-t` flags. |
| `quiz.ts` | Interactive quiz engine. Loads questions from `src/content/questions/`, presents them in the terminal, tracks scores, and displays a domain-level breakdown. Works fully offline. |
| `formatter.ts` | Terminal output formatting. Zero-dependency ANSI colour helpers, box drawing, progress bars, and score displays. |

## Exam Concepts

- **CLAUDE.md Configuration** — The project's `CLAUDE.md` at the repo root demonstrates hierarchical project configuration (Domain 3).
- **Slash Commands** — `.claude/commands/` contains custom slash commands (`/study`, `/quiz`, `/explain`, `/assess`).
- **Path-Specific Rules** — `.claude/rules/` shows how to scope behaviour to specific directories.

## Connections

- **`src/content/`** — The quiz command loads question banks from `src/content/questions/`.
- **`src/agents/`** — The `study` and `explain` commands (Tier 3) launch agent workflows for adaptive sessions.
- **`.claude/`** — Slash commands and path rules live alongside the CLI as Domain 3 exam material.
