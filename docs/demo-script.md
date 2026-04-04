# ArchitectAI Demo Script (5 minutes)

> **Purpose:** A tightly scripted walkthrough for a YouTube/Loom recording.
> Record with a split layout — terminal on the left, editor on the right.

---

## Pre-Recording Setup

```bash
# Terminal: clean state, large font (≥18pt), dark theme
cd ~/architect-ai
git checkout main && git pull
npm install
clear

# Editor: VS Code with Monokai Pro, minimap OFF, sidebar OFF
# Have src/agents/loop.ts open but hidden (Cmd+1 to reveal later)
```

**Screen layout:** 60% terminal / 40% editor (editor hidden until 2:30).
**Mic:** Warm, conversational tone. Not a lecture — a show-and-tell.

---

## 0:00–0:30 — Hook

> **[Camera: Terminal, blank screen]**

**Say:**

> "I needed to pass the Claude Certified Architect exam. Every study resource I found was either expensive, incomplete, or just flashcards. So I built ArchitectAI — a free, open-source study tool where the codebase IS the curriculum.
>
> Let me show you what that means in under 5 minutes."

**Type:**

```bash
npx architect-ai --help
```

> **[Pause 2 seconds to let the help output render. Highlight the commands: quiz, exam, dashboard.]**

---

## 0:30–1:30 — Quick Start (CLI Quiz)

> **[Camera: Terminal]**

**Say:**

> "Let's start with the quiz. 105 scenario-based questions, all 5 exam domains — no API key, no account, no cost."

**Type:**

```bash
npx architect-ai quiz -d 1
```

> **[Walk through 2–3 questions live:]**
>
> 1. Read the question aloud quickly.
> 2. Think through the answer: "This is testing agentic loop stop conditions — the answer is checking `stop_reason`, not content type."
> 3. Select the answer, show the explanation.

**Say:**

> "Every question is a realistic scenario. Not 'what is an agentic loop?' but 'your agent stops responding after the third tool call — what's the most likely cause?'"

**Type (show domain filtering):**

```bash
npx architect-ai quiz -t 1.1
```

> **[Show 1 question filtered to task statement 1.1. Highlight that filtering lets you drill into weak areas.]**

---

## 1:30–2:30 — Exam Simulation

> **[Camera: Terminal]**

**Say:**

> "When you're ready for the real thing, there's a full exam simulation. 60 questions, 120-minute timer, weighted by domain — just like the real CCA-F exam."

**Type:**

```bash
npx architect-ai exam
```

> **[Show the exam starting:]**
>
> - Point out the timer in the corner.
> - Point out the domain distribution (27% Domain 1, 20% Domain 3, etc.).
> - Answer 2–3 questions quickly.
> - Skip to the results screen (pre-recorded or fast-forward).

**Say:**

> "At the end, you get a pass/fail verdict and a domain-by-domain breakdown so you know exactly where to focus."

---

## 2:30–3:30 — The Code IS the Curriculum

> **[Camera: Switch to split view — terminal left, VS Code right]**

**Say:**

> "Here's what makes ArchitectAI different from every other study tool. The codebase itself teaches you the exam concepts."

**Action:** Reveal `src/agents/loop.ts` in VS Code.

**Say:**

> "See this `while` loop? This IS the agentic loop pattern tested on Domain 1.1 of the exam.
>
> Look at line 17 — we check `stop_reason`, NOT the content type. That's a critical exam concept: Claude can return text alongside `tool_use` blocks in the same response. If you check content type, you miss the tool call.
>
> When you get an exam question about stop conditions or runaway loops, you don't need to memorise a flashcard. You can come here and see exactly how it works in production code."

**Action:** Scroll to show the four exam concepts (❶ ❷ ❸ ❹) in the file header.

**Say:**

> "Every file is like this. `src/tools/definitions.ts` teaches tool design. `src/mcp/server.ts` teaches MCP protocol. `src/prompts/system-prompts.ts` teaches prompt engineering. The project structure maps 1:1 to the exam domains."

---

## 3:30–4:30 — Progress Tracking

> **[Camera: Back to full terminal]**

**Say:**

> "ArchitectAI tracks your progress across sessions and identifies your weak areas."

**Type:**

```bash
npx architect-ai dashboard
```

> **[Show the dashboard:]**
>
> - Domain-by-domain accuracy percentages.
> - Total questions attempted vs. remaining.
> - Weak areas highlighted (e.g., "Domain 2: Tool Design — 45%").
> - Spaced repetition schedule.

**Say:**

> "It uses spaced repetition — questions you get wrong come back sooner, questions you nail get spaced out. Your study time goes where it matters most."

**Action:** Point to a weak domain.

**Say:**

> "See Domain 2 at 45%? I can drill into that right now."

**Type:**

```bash
npx architect-ai quiz -d 2
```

> **[Answer 1 question from Domain 2 to show the loop.]**

---

## 4:30–5:00 — Call to Action

> **[Camera: Terminal with GitHub repo URL visible]**

**Say:**

> "ArchitectAI is free, open source, and MIT licensed. Zero cost for Tier 1 — that's the full quiz, exam simulation, and dashboard. No API key needed. Works offline. Works on a plane.
>
> If you want adaptive AI tutoring, bring your own Anthropic API key for Tier 3 — that's about 2 cents per session.
>
> Three things you can do right now:"

**Type (show each URL):**

```bash
echo "⭐ Star: github.com/aviraldua93/architect-ai"
echo "💬 Discord: discord.gg/architect-ai"
echo "🛠️ Contribute: look for good-first-issue labels"
```

**Say:**

> "Star the repo if this is useful. Join the Discord to study with other people preparing for the exam. And if you want to contribute — add questions, fix bugs, improve docs — check out the good-first-issue labels.
>
> Good luck on the CCA-F exam. Let's go."

> **[End screen: GitHub repo + Discord link + 'Star ⭐' animation]**

---

## Post-Recording Notes

- **Editing:** Cut any pauses longer than 2 seconds. Keep energy high.
- **Thumbnail:** Split screen — terminal on left, exam score on right, text: "Pass the CCA-F Exam (FREE)"
- **Description:** Include repo link, Discord link, exam info link, timestamps for each section.
- **Tags:** Claude, Anthropic, CCA-F, Claude Certified Architect, AI certification, study tool, open source
- **Upload to:** YouTube, then embed in README and share link in social posts.
