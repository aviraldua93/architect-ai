# ArchitectAI — Free Study Tool for the Claude Certified Architect Exam

**The codebase IS the curriculum — every file demonstrates an exam concept in production code.**

[![GitHub stars](https://img.shields.io/github/stars/aviraldua93/architect-ai?style=flat-square)](https://github.com/aviraldua93/architect-ai/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/aviraldua93/architect-ai/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/aviraldua93/architect-ai/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)

---

## What Is This?

ArchitectAI is an open-source study tool for the [Claude Certified Architect (Foundations)](https://www.anthropic.com/certification) exam — but with a twist: **the codebase itself teaches you the exam concepts**. Every architectural decision, every file, every pattern maps directly to one of the 30 exam task statements across 5 domains.

You don't just *read* about agentic loops — you see a production implementation in `src/agents/loop.ts`. You don't just *memorise* hook patterns — you see `PostToolUse` normalisation running live in `src/agents/hooks.ts`.

> 🆓 **No API key required for Tier 1.** 105 practice questions, full CLI quiz — completely free and offline.

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| CLI Quiz (`quiz`) | ✅ Shipped | 105 questions across all 5 domains |
| MCP Server | ✅ Shipped | Full JSON-RPC 2.0 server with resources, tools, and prompts |
| Web UI | 🚧 In Progress | Next.js app with quiz, study, exam, and dashboard pages |
| CLI Study Mode (`study`) | 🚧 Coming Soon | Interactive guided study sessions |
| CLI Assessment (`assess`) | 🚧 Coming Soon | Readiness scoring and gap analysis |
| Timed Exam Simulation | 🚧 Coming Soon | Full mock exam with timer and scoring |
| Concept Deep-Dives | 🚧 Planned | In-depth explanations for all 30 task statements |
| Exam-Realistic Scenarios | 🚧 Planned | Extended scenario-based practice |

## Quick Start

```bash
git clone https://github.com/aviraldua93/architect-ai.git && cd architect-ai
npm install
npx architect-ai quiz
```

Or install globally:

```bash
npm install -g architect-ai
architect-ai quiz
```

> 💡 **That's it.** No API key, no account, no cost. Just `quiz` and start practicing.

## Three Ways to Learn

<table>
<tr>
<td align="center" width="33%">

### 🖥️ Tier 1 — Static CLI
**No API Key Required**

105 scenario-based questions across all 5 exam domains. Pre-generated explanations.

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

## Usage

```bash
# Tier 1: Offline study (no API key needed)
npx architect-ai quiz              # Quick practice questions
npx architect-ai quiz -d 1         # Filter by domain (1-5)
npx architect-ai quiz -t 1.2       # Filter by task statement

# Tier 2: MCP server (plug into Claude Desktop / Copilot)
npm run mcp                        # Start MCP server

# Tier 3: Live agents (requires ANTHROPIC_API_KEY — coming soon)
export ANTHROPIC_API_KEY=your-key   # macOS/Linux
# $env:ANTHROPIC_API_KEY="your-key" # Windows PowerShell
npm run agent                       # Adaptive study session
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
│       └── questions/              105 scenario-based questions
├── web/                         ← Next.js web UI (in progress)
├── test/
│   ├── tier1/                   ← Free static validation (<5s)
│   ├── tier2/                   ← E2E with real Claude (~$3-4/run)
│   └── tier3/                   ← LLM-as-judge quality checks (~$0.15/run)
└── docs/                        ← Architecture & contributor guides
```

## Question Banks

| Domain | Questions | Status |
|--------|-----------|--------|
| 1 — Agentic Architecture | 30 | ✅ Complete |
| 2 — Tool Design & MCP | 20 | ✅ Complete |
| 3 — Claude Code Config | 20 | ✅ Complete |
| 4 — Prompt Engineering | 20 | ✅ Complete |
| 5 — Context & Reliability | 15 | ✅ Complete |
| **Total** | **105** | |

## The Meta-Pattern

This project practices what it preaches. The way it's built IS a demonstration of exam concepts:

- **This README** → You're reading structured context passing (Domain 5)
- **The org that built this** → Hub-and-spoke multi-agent orchestration (Domain 1.2)
- **Branch protection + CI** → Programmatic enforcement over prompt-based guidance (Domain 1.4)
- **3-tier testing** → Task decomposition: per-file analysis + cross-file integration (Domain 1.6)
- **MCP server architecture** → Tool design with proper descriptions and error schemas (Domain 2.1, 2.2)

## Contributing

Contributions welcome! See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full guide — branch naming, PR process, testing, code style, and how to add questions.

## About

**ArchitectAI** is an [aviraldua93](https://github.com/aviraldua93) project — built by [Aviral Dua](https://github.com/aviraldua93) using the very agentic patterns it teaches.

---

*Preparing for the Claude Certified Architect exam? Star this repo and start with Tier 1. No API key. No cost. Just learning.*