# 🏗️ ArchitectAI

**AI-powered study tool for the Claude Certified Architect (Foundations) exam.**
**The codebase IS the curriculum — every file demonstrates an exam concept in production code.**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](src/mcp/)
[![Status](https://img.shields.io/badge/Status-In%20Development-orange.svg)]()

---

## What Is This?

ArchitectAI is an open-source study tool for the [Claude Certified Architect (Foundations)](https://www.anthropic.com/certification) exam — but with a twist: **the codebase itself teaches you the exam concepts**. Every architectural decision, every file, every pattern maps directly to one of the 30 exam task statements across 5 domains.

You don't just *read* about agentic loops — you see a production implementation in `src/agents/loop.ts`. You don't just *memorise* hook patterns — you see `PostToolUse` normalisation running live in `src/agents/hooks.ts`.

## Three Ways to Learn

<table>
<tr>
<td align="center" width="33%">

### 🖥️ Tier 1 — Static CLI
**No API Key Required**

Pre-generated question banks, explanations, and mock exams.

Works offline. Works on a plane.

**ZERO COST.**

</td>
<td align="center" width="33%">

### 🔌 Tier 2 — MCP Server
**No API Key Required**

Plugs into your existing Claude Desktop, GitHub Copilot, or any MCP client.

Our server provides content + tools. Your AI provides intelligence.

**ZERO COST.**

</td>
<td align="center" width="34%">

### 🤖 Tier 3 — Live Agents
**Bring Your Own Key**

Full multi-agent orchestration with adaptive study sessions, Socratic dialogue, and weakness detection.

You provide your own Claude API key.

**~$0.02–0.05 per session. FULL POWER.**

</td>
</tr>
</table>

## Exam Coverage

Every file maps to a specific exam domain and task statement:

| Domain | Weight | Source Directory | Key Concepts |
|--------|--------|-----------------|--------------|
| **1. Agentic Architecture** | 27% | `src/agents/` | Agentic loops, multi-agent orchestration, subagent context passing, workflow enforcement, SDK hooks, task decomposition, session state |
| **2. Tool Design & MCP** | 18% | `src/tools/`, `src/mcp/` | Tool descriptions, error schemas, tool_choice modes, MCP resources/tools/prompts, built-in tools |
| **3. Claude Code Config** | 20% | `src/cli/`, `.claude/` | CLAUDE.md hierarchy, slash commands, path rules, plan mode, iterative refinement, CI/CD |
| **4. Prompt Engineering** | 20% | `src/prompts/` | Explicit criteria, few-shot examples, structured output, validation-retry, batch API, multi-instance review |
| **5. Context & Reliability** | 15% | `src/context/` | Context preservation, escalation patterns, error propagation, codebase exploration, human review, provenance |

## Quick Start

> ⚠️ **In active development.** Tier 1 commands coming first. Star/watch to get notified.

```bash
# Clone
git clone https://github.com/aviraldua93/architect-ai.git
cd architect-ai

# Install
bun install        # or: npm install

# Tier 1: Offline study (no API key needed)
bun run study      # Interactive CLI quiz
bun run quiz       # Quick practice questions
bun run assess     # Check your exam readiness

# Tier 2: MCP server (plug into Claude Desktop / Copilot)
bun run mcp        # Start MCP server

# Tier 3: Live agents (requires ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY=your-key    # macOS/Linux
# $env:ANTHROPIC_API_KEY="your-key"  # Windows PowerShell
bun run agent      # Adaptive study session
```

## Project Structure

```
architect-ai/
├── CLAUDE.md                    ← Domain 3: Claude Code configuration
├── .claude/commands/            ← Domain 3: Slash commands (/study, /quiz, /explain, /assess)
├── .claude/rules/               ← Domain 3: Path-specific rules
├── src/
│   ├── agents/                  ← Domain 1: Agentic Architecture (27%)
│   │   ├── coordinator.ts          Hub-and-spoke orchestration (1.2)
│   │   ├── loop.ts                 Agentic loop lifecycle (1.1)
│   │   ├── spawner.ts              Subagent invocation (1.3)
│   │   ├── workflow-enforcer.ts    Programmatic enforcement (1.4)
│   │   ├── hooks.ts                PostToolUse & interception hooks (1.5)
│   │   ├── decomposer.ts           Task decomposition strategies (1.6)
│   │   └── session-state.ts        Session management & resumption (1.7)
│   ├── tools/                   ← Domain 2: Tool Design (18%)
│   │   ├── definitions.ts           Tool schemas & descriptions (2.1)
│   │   └── error-handling.ts        Structured error responses (2.2)
│   ├── mcp/                     ← Domain 2: MCP Integration
│   │   └── server.ts                MCP server: resources, tools, prompts (2.4)
│   ├── prompts/                 ← Domain 4: Prompt Engineering (20%)
│   │   ├── system-prompts.ts        Agent persona & constraints (4.1)
│   │   ├── few-shot.ts              Example banks & dynamic selection (4.2)
│   │   └── output-schemas.ts        Zod validation & retry loops (4.3)
│   ├── context/                 ← Domain 5: Context Management (15%)
│   │   ├── session-manager.ts       Session save/load/resume/fork (1.7, 5.1)
│   │   ├── progress-tracker.ts      Weighted scoring & spaced repetition (5.1)
│   │   └── escalation.ts            Tier 1→2→3 escalation patterns (5.2)
│   ├── cli/                     ← Domain 3: CLI & Commands (20%)
│   └── content/                 ← Pre-generated study material
│       ├── questions/              150 scenario-based questions
│       ├── explanations/           50 concept deep-dives
│       └── scenarios/              20 exam-realistic scenarios
├── test/
│   ├── tier1/                   ← Free static validation (<5s)
│   ├── tier2/                   ← E2E with real Claude (~$3-4/run)
│   └── tier3/                   ← LLM-as-judge quality checks (~$0.15/run)
└── docs/                        ← Architecture & contributor guides
```

## The Meta-Pattern

This project practices what it preaches. The way it's built IS a demonstration of exam concepts:

- **This README** → You're reading structured context passing (Domain 5)
- **The org that built this** → Hub-and-spoke multi-agent orchestration (Domain 1.2)
- **Branch protection + CI** → Programmatic enforcement over prompt-based guidance (Domain 1.4)
- **3-tier testing** → Task decomposition: per-file analysis + cross-file integration (Domain 1.6)
- **MCP server architecture** → Tool design with proper descriptions and error schemas (Domain 2.1, 2.2)

## Contributing

Contributions welcome! See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full guide — branch naming, PR process, testing, code style, and how to add questions.

## Question Banks

| Domain | Status | File |
|--------|--------|------|
| 1 — Agentic Architecture | ✅ Complete | `src/content/questions/domain-1-agentic-architecture.json` |
| 2 — Tool Design & MCP | 🚧 Coming soon | — |
| 3 — Claude Code Config | ✅ Complete | _(covered in `.claude/` config files)_ |
| 4 — Prompt Engineering | ✅ Complete | _(embedded in `src/prompts/few-shot.ts` examples)_ |
| 5 — Context & Reliability | ✅ Complete | _(covered by `src/context/` implementations)_ |
- See the repo's `.claude/` directory for project conventions

## About

**ArchitectAI** is an [aviraldua93](https://github.com/aviraldua93) project — built using the very agentic patterns it teaches.

---

*Preparing for the Claude Certified Architect exam? Star this repo and start with Tier 1. No API key. No cost. Just learning.*