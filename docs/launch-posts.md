# ArchitectAI — Social Launch Posts

> **Ready-to-paste posts for each platform.** Copy, personalize if needed, and post.
> Replace `[LINK]` with `https://github.com/aviraldua93/architect-ai`.

---

## Hacker News

**Title:**

```
ArchitectAI – Free study tool where the codebase IS the curriculum (Claude Certified Architect exam)
```

**Body (paste as comment immediately after submission):**

```
I built ArchitectAI because every study resource for Anthropic's new Claude Certified
Architect (Foundations) exam was either paywalled, incomplete, or just flashcards. I wanted
something that teaches through working code — so I made the TypeScript codebase itself
map 1:1 to the exam domains. When the exam tests you on agentic loops, you open
src/agents/loop.ts and see a production implementation with annotated exam concepts.

What it does: 105+ scenario-based practice questions across all 5 exam domains, a timed
mock exam that mirrors the real CCA-F format (60 questions, 120 minutes, domain-weighted),
progress tracking with spaced repetition, and a dashboard that pinpoints your weak areas.
Everything runs from your terminal — `npx architect-ai quiz` and you're studying.

It's MIT licensed, zero cost for the full quiz/exam/dashboard experience (no API key
needed), and works completely offline. If you want AI-powered adaptive tutoring, bring
your own Anthropic API key (~$0.02/session). The project is also an MCP server, so it
plugs into Claude Desktop or any MCP-compatible client.

Repo: [LINK]
```

---

## Reddit r/learnprogramming

**Title:**

```
I built a free, open-source study tool for the Claude Certified Architect exam — the TypeScript code IS the curriculum
```

**Body:**

```
Hey r/learnprogramming,

I've been preparing for Anthropic's Claude Certified Architect (Foundations) exam and
got frustrated with the available resources. Most were expensive courses, paywalled
question banks, or shallow flashcard decks.

So I built ArchitectAI — a CLI study tool where the codebase itself teaches you the
exam concepts. Here's what I mean:

- The exam tests "agentic loop lifecycle" → open `src/agents/loop.ts` and read a
  production while-loop with annotated stop_reason checking
- The exam tests "tool design patterns" → open `src/tools/definitions.ts` and see
  Zod schemas with proper error handling
- The exam tests "MCP protocol" → open `src/mcp/server.ts` and see a working
  JSON-RPC 2.0 server with resources, tools, and prompts

It's not just reading code though. There are 105+ scenario-based questions that feel
like the real exam ("your agent stops after the third tool call — what's the most
likely cause?"), a timed mock exam that matches the CCA-F format, and spaced
repetition that focuses your study time on weak areas.

**Quick start:**

    npx architect-ai quiz

That's it. No API key, no account, no payment. Works offline.

If you're preparing for the CCA-F or just want to learn about agentic AI architecture
through working code, check it out:

[LINK]

It's MIT licensed and I'm actively looking for contributors — especially people who
want to add questions or improve explanations. Look for the `good-first-issue` labels.

Happy to answer any questions!
```

---

## Twitter/X Thread (5 Tweets)

**Tweet 1 (Hook):**

```
I just open-sourced ArchitectAI 🏗️

A study tool where the codebase IS the curriculum for the Claude Certified Architect exam.

105+ practice questions. Timed mock exams. Spaced repetition. All from your terminal.

No API key. No cost. Just: npx architect-ai quiz

🧵👇
```

**Tweet 2 (Demo):**

```
What makes it different from flashcards?

The TypeScript source code maps 1:1 to the exam domains.

When the exam asks about agentic loops → open src/agents/loop.ts
When it asks about tool design → open src/tools/definitions.ts
When it asks about MCP → open src/mcp/server.ts

You learn by reading production code.
```

**Tweet 3 (Features):**

```
Features:

🎯 105+ scenario-based questions (not trivia — realistic debugging scenarios)
⏱️ Timed mock exam matching the real CCA-F format
📊 Dashboard with domain-by-domain scoring
🔄 Spaced repetition targeting your weak areas
🔌 MCP server that plugs into Claude Desktop

All free. All offline.
```

**Tweet 4 (Tech):**

```
Built with:

• TypeScript (strict mode, zero `any`)
• Zod for runtime validation
• Anthropic SDK for Tier 3 adaptive tutoring
• MCP protocol for IDE integration
• Vitest for testing

The meta-pattern: it's built WITH the agentic patterns it teaches.
```

**Tweet 5 (CTA):**

```
ArchitectAI is MIT licensed and looking for contributors.

⭐ Star: github.com/aviraldua93/architect-ai
💬 Discord: discord.gg/architect-ai
🛠️ Contribute: check good-first-issue labels

If you're preparing for the CCA-F exam, this might save you real money and time.

Good luck 🚀
```

---

## LinkedIn

**Post:**

```
I just open-sourced ArchitectAI — a free study tool for Anthropic's Claude Certified
Architect (Foundations) exam.

The twist: the codebase IS the curriculum.

Most certification prep gives you flashcards or video lectures. ArchitectAI gives you
a production TypeScript codebase where every file maps to a specific exam domain and
task statement. When the exam tests "agentic loop lifecycle," you open
src/agents/loop.ts and read annotated production code.

What it includes:
→ 105+ scenario-based practice questions across all 5 exam domains
→ Timed mock exam mirroring the real CCA-F format
→ Progress tracking with spaced repetition
→ MCP server integration for Claude Desktop
→ Zero cost for the full experience — no API key needed

As someone who builds with AI daily, I believe the best way to learn architecture
patterns is to see them in working code — not to memorise definitions.

The project is MIT licensed and I'm looking for contributors, especially people who
want to add questions, improve explanations, or build out the web UI.

Quick start: npx architect-ai quiz

Repo: github.com/aviraldua93/architect-ai

#AI #Claude #Anthropic #OpenSource #Certification #AIArchitecture #TypeScript
```

---

## Dev.to Blog Post Outline

**Title:**

```
I Built a Free Study Tool Where the Codebase IS the Curriculum (Claude Certified Architect Exam)
```

**Tags:** `ai`, `typescript`, `opensource`, `certification`

**Cover image:** Screenshot of the CLI quiz in action (terminal, dark theme).

### Sections

**1. The Problem (200 words)**
- Anthropic launched the CCA-F certification
- Existing study resources: expensive, incomplete, or just flashcards
- I wanted something that teaches through code, not slides

**2. The Idea: Code as Curriculum (300 words)**
- What if the codebase itself mapped to the exam?
- Every file → a specific domain and task statement
- Example: `src/agents/loop.ts` teaches agentic loop lifecycle (Domain 1.1)
- Include a code snippet showing the annotated while-loop
- The meta-pattern: the project is built WITH the patterns it teaches

**3. What It Does (400 words)**
- 105+ scenario-based questions (show example question)
- Timed mock exam (60 questions, 120 min, domain-weighted)
- Progress dashboard with spaced repetition
- Three tiers: Free CLI → MCP Server → AI Tutoring (BYOK)
- Works offline, no API key for Tier 1

**4. Architecture Deep-Dive (300 words)**
- TypeScript strict mode, Zod validation, zero `any`
- CLI built with Commander.js
- MCP server: JSON-RPC 2.0 with resources, tools, and prompts
- Agent system: coordinator → spawner → loop → hooks
- Testing: 3-tier strategy (unit/integration/LLM-as-judge)

**5. How to Contribute (200 words)**
- Good-first-issue labels: add questions, improve explanations, write tests
- CONTRIBUTING.md walkthrough
- Discord community link

**6. CTA (100 words)**
- `npx architect-ai quiz` — try it in 10 seconds
- Star the repo: [LINK]
- Join Discord: [LINK]
- Preparing for CCA-F? This is your free study companion.

---

## Posting Schedule

| Day | Platform | Time (PT) | Notes |
|-----|----------|-----------|-------|
| Mon | Hacker News | 8:00 AM | Best engagement window |
| Mon | Twitter/X | 9:00 AM | Thread, 1 hour after HN |
| Tue | Reddit | 10:00 AM | r/learnprogramming, r/claude |
| Wed | LinkedIn | 8:00 AM | Professional audience |
| Thu | Dev.to | 8:00 AM | Full blog post |

> **Tip:** Respond to every comment in the first 4 hours on HN and Reddit. Engagement drives visibility.
