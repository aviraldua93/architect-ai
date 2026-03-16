# ArchitectAI — Sprint Backlog

> Last updated: 2026-03-16 by Raj Mehta (Sprint Lead)

---

## Web Application

### P0: Next.js App Scaffold & Core Setup
**What:** Initialise Next.js 14 app under web/ with Tailwind, TypeScript, App Router.
**Why:** Foundation for the entire web UI — nothing else can start without this.
**Context:** Using create-next-app with --app --src-dir --tailwind. Dark theme (slate-900/950). Design system in web/DESIGN_SYSTEM.md. 
**Effort:** M
**Priority:** P0
**Depends on:** None
**Status:** In Progress (Marcus Chen)

### P0: Quiz UI Components
**What:** QuestionCard, AnswerOption, ProgressBar, Timer, ScoreSummary, DomainFilter, badges.
**Why:** Core user-facing components for all quiz modes (practice, study, exam).
**Context:** 8 components total. Dark theme, keyboard accessible, ARIA roles. See DESIGN_SYSTEM.md for specs. Zustand store for state management.
**Effort:** L
**Priority:** P0
**Depends on:** Next.js scaffold
**Status:** Done (Zara Ibrahim + Suki Watanabe)

### P0: Page Routes & Quiz Engine
**What:** All 5 pages (home, quiz, study, exam, dashboard) + scoring engine + Zustand store.
**Why:** The actual user experience — without pages, components have nowhere to live.
**Context:** Quiz page has 3 phases (config → quiz → results). Exam mode has timer + question navigator. Dashboard uses localStorage for progress persistence.
**Effort:** L
**Priority:** P0
**Depends on:** Quiz UI components, Next.js scaffold
**Status:** Done (Liam O'Brien + Ravi Krishnan)

### P0: Role Instruction Files
**What:** .claude/roles/ with coo.md, ceo.md, sprint-lead.md, vp.md, ic.md.
**Why:** Agents are stateless — role files get prepended to every prompt so agents follow org rules.
**Context:** Per playbook Section 6. Authority boundaries, hierarchy, mandatory checks, communication rules.
**Effort:** M
**Priority:** P0
**Depends on:** None
**Status:** In Progress (Hannah Chen)

### P0: CLAUDE.md Overhaul
**What:** Rewrite CLAUDE.md, add slash commands (/study, /exam, /status), add path rules.
**Why:** Current CLAUDE.md is stale (says "AWS", wrong structure, TODO placeholders).
**Context:** Also create .claude/rules/engineering.md with per-path rules for agents, tools, content, web, tests.
**Effort:** M
**Priority:** P0
**Depends on:** None
**Status:** In Progress (Hannah Chen + Suki Watanabe)

### P1: CI Pipeline for Web
**What:** .github/workflows/web-ci.yml + Playwright config + initial test specs.
**Why:** Web app needs its own CI with Playwright E2E, separate from CLI tests.
**Context:** Triggers on web/** changes. 3 browsers. axe-core accessibility testing. Smoke + quiz flow + a11y specs.
**Effort:** M
**Priority:** P1
**Depends on:** Next.js scaffold
**Status:** Done (Fatima Al-Rashid + Jordan Blake)

### P1: Design System Specification
**What:** web/DESIGN_SYSTEM.md — complete design tokens, component specs, accessibility guidelines.
**Why:** Frontend engineers need implementable specs, not guesswork.
**Context:** 51KB spec covering colours, typography, 10 component specs, WCAG AA, responsive breakpoints, animations. Dark-first theme.
**Effort:** M
**Priority:** P1
**Depends on:** None
**Status:** Done (Anika Patel + Felix Andersson)

### P1: Integration Testing
**What:** Cross-browser testing, CLI↔web parity, regression suite. Minimum 3 people.
**Why:** Playbook rule: NEVER send one person to do integration alone.
**Context:** Tariq + Catherine + Chiara. Verify all pages render, quiz flow works, timer counts down, scores calculate correctly.
**Effort:** L
**Priority:** P1
**Depends on:** All P0 web tasks
**Status:** Pending

### P1: QA Sign-Off
**What:** Full QA pass with health score. Health score ≥70 required to ship.
**Why:** No demo without QA sign-off. Playbook rule.
**Context:** Use gstack QA report template. Categories: Console, Links, Visual, Functional, UX, Performance, Accessibility.
**Effort:** M
**Priority:** P1
**Depends on:** Integration testing
**Status:** Pending

---

## Content Quality

### P0: Fix d5-q02 (Wrong Answer)
**What:** Rewrite d5-q02 — uses "progressive summarisation" as correct answer, but curriculum says it's a TRAP.
**Why:** P0 content bug — students will learn the WRONG answer.
**Context:** Found in content audit. Curriculum explicitly flags progressive summarisation as an anti-pattern. Need to rewrite with correct answer.
**Effort:** S
**Priority:** P0
**Depends on:** None
**Status:** Pending

### P1: Content Coverage Gaps (21 issues)
**What:** Add 5-8 new questions for Domain 5 (missing case facts block, escalation triggers, confidence calibration, lost-in-the-middle). Fix D3 Task 3.2 (covers only commands, zero skills coverage).
**Why:** Students won't encounter key exam concepts if we don't test them.
**Context:** Full audit in docs/content-audit-d2-d5.md. D5 has worst coverage. D3 3.2 needs SKILL.md questions. D2/D5 both missing "access failure vs valid empty result" questions.
**Effort:** L
**Priority:** P1
**Depends on:** None
**Status:** Pending

### P2: Content Quality Improvements (20 issues)
**What:** Fix near-duplicate concepts, weak distractors, task statement misalignment across D2-D5.
**Why:** Improves question quality but doesn't block launch.
**Context:** Detailed in docs/content-audit-d2-d5.md. Each issue flagged with question ID and specific fix needed.
**Effort:** L
**Priority:** P2
**Depends on:** P1 content fixes
**Status:** Pending

---

## Infrastructure

### P1: Demo Day Checklist
**What:** Documented startup sequence for web UI demo.
**Why:** Playbook rule: "If the Owner can't experience it in a browser, it's not a demo."
**Context:** Must include: URL, startup commands, what Owner sees, what to click, happy path walkthrough.
**Effort:** S
**Priority:** P1
**Depends on:** Web app working
**Status:** In Progress

### P2: Branch Protection Setup
**What:** Enable branch protection on main now that gh CLI is authenticated.
**Why:** Playbook mandates: no direct push to main after scaffold, PR + review + CI required.
**Context:** gh CLI is now authenticated (aviraldua93). Can set up protection rules programmatically.
**Effort:** S
**Priority:** P2
**Depends on:** None
**Status:** Pending

---

## Completed

### Design System — Done (2026-03-16)
Anika Patel + Felix Andersson delivered 51KB design system spec.

### CI Pipeline — Done (2026-03-16)
Fatima + Jordan delivered web-ci.yml + Playwright config + test specs.

### Content Audit D2-5 — Done (2026-03-16)
Mei-Ling + Gabriel: 75 questions audited, 1 P0, 21 P1, 20 P2 found.

### Quiz Components — Done (2026-03-16)
Zara + Suki: 8 components, Zustand store, all wired.

### Page Routes + Engine — Done (2026-03-16)
Liam + Ravi: 27 files, 2,667 lines. All 5 pages + scoring engine.
