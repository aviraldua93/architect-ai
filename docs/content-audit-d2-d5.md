# Content Audit: Domains 2–5

**Auditors:** Mei-Ling Wong (Content QA Lead) · Gabriel Santos (LLM Engineer)
**Date:** 2025-07-16
**Curriculum Reference:** `AgenticStartup/exam-curriculum-all-domains.md`

---

## Summary

| Metric | Count |
|---|---|
| Total questions audited | 75 |
| Questions passing all criteria | 55 |
| Questions needing fixes (any severity) | 20 |
| P0 — Wrong correct answer / curriculum conflict | 1 |
| P1 — Missing coverage gaps | 21 |
| P2 — Quality improvements | 20 |

### Severity Definitions
- **P0**: Correct answer contradicts curriculum, or answer is factually wrong. Must fix before shipping.
- **P1**: Curriculum task statement concept has <2 questions, or key exam-tested concept untested. Should fix in this sprint.
- **P2**: Distractor quality, explanation wording, or minor concept overlap. Fix when capacity allows.

---

## Domain 2: Tool Design & MCP (20 questions)

### Coverage

| Task Statement | Curriculum Topic | Questions | Count | Min Met? |
|---|---|---|---|---|
| 2.1 | Tool Interface Design | d2-q01, q02, q03, q04 | 4 | ✅ |
| 2.2 | Structured Error Responses | d2-q05, q06, q07, q08 | 4 | ✅ |
| 2.3 | Tool Distribution & tool_choice | d2-q09, q10, q11, q12 | 4 | ✅ |
| 2.4 | MCP Server Integration | d2-q13, q14, q15, q16 | 4 | ✅ |
| 2.5 | Built-in Tools | d2-q17, q18, q19, q20 | 4 | ✅ |

### Difficulty Distribution
- Foundation: 8 · Intermediate: 7 · Advanced: 5 ✅ Good mix

### Issues Found

#### P1 — Missing Coverage

1. **Task 2.2 — Access failure vs valid empty result**: The curriculum explicitly states "Confusing these two breaks recovery logic. The exam tests this." No question in D2 tests this distinction (a tool returning `[]` because no customer exists vs returning `[]` because the database was unreachable). This is a high-priority gap since the curriculum marks it as explicitly tested.

2. **Task 2.5 — Grep vs Glob distinction**: The curriculum states "The exam deliberately presents scenarios where using the wrong one wastes time or fails." All four Task 2.5 questions test built-in-vs-custom tool decisions. None test the Grep (file contents) vs Glob (file paths) distinction, which the curriculum flags as an explicit exam scenario.

3. **Task 2.5 — Edit vs Read+Write fallback**: The curriculum teaches "Edit: targeted modifications using unique text matching. When Edit fails: fall back to Read + Write." No question covers this fallback pattern.

#### P2 — Quality Improvements

4. **d2-q03**: Answer A says "8–10 most relevant tools per turn" but the curriculum says "Optimal: 4–5 tools per agent." The concept (dynamic filtering) is correct, but the number range is inconsistent with curriculum guidance. Consider aligning to "4–5" or noting the larger number is for contexts with high tool diversity.

5. **d2-q01 / d2-q04**: Both test "tool descriptions as primary selection mechanism" — d2-q01 (misrouting between similar tools) and d2-q04 (vague description prevents selection). While the angles differ, the core concept tested overlaps significantly. Consider replacing d2-q04 with a Grep-vs-Glob question to close coverage gap #2.

### Accuracy Verification
All 20 correct answers verified against curriculum. No P0 issues found. ✅

---

## Domain 3: Claude Code Configuration (20 questions)

### Coverage

| Task Statement | Curriculum Topic | Questions | Count | Min Met? |
|---|---|---|---|---|
| 3.1 | CLAUDE.md Hierarchy | d3-q01, q02, q03, q04 | 4 | ✅ |
| 3.2 | Custom Slash Commands & Skills | d3-q05, q06, q07 | 3 | ⚠️ Commands only |
| 3.3 | Path-Specific Rules | d3-q08, q09, q10 | 3 | ✅ |
| 3.4 | Plan Mode vs Direct Execution | d3-q11, q12, q13 | 3 | ✅ |
| 3.5 | Iterative Refinement | d3-q14, q15, q16 | 3 | ✅ |
| 3.6 | CI/CD Integration | d3-q17, q18, q19, q20 | 4 | ✅ |

### Difficulty Distribution
- Foundation: 7 · Intermediate: 6 · Advanced: 7 ✅ Good mix

### Issues Found

#### P1 — Missing Coverage

1. **Task 3.2 — Skills (SKILL.md frontmatter)**: All three Task 3.2 questions cover slash commands (`/commands/` directory, `$ARGUMENTS`, personal vs project). None test skill-specific concepts the curriculum explicitly teaches: `context: fork` (isolated sub-agent context), `allowed-tools` (tool restriction), `argument-hint` (parameter prompting), or the `.claude/skills/` directory with `SKILL.md` files.

2. **Task 3.2 — Skills vs CLAUDE.md distinction**: The curriculum states: "Skills = on-demand, task-specific workflows. CLAUDE.md = always-loaded, universal standards. Do not put task-specific procedures in CLAUDE.md." This key distinction has no question testing it.

3. **Task 3.5 — Concrete input/output examples**: The curriculum says "Concrete input/output examples (2–3 examples showing before/after): beat prose descriptions every time." This is the #1 technique in the curriculum's hierarchy and is untested. Questions d3-q14 through d3-q16 cover test-driven iteration and fix ordering but miss this core concept.

#### P2 — Quality Improvements

4. **d3-q08 through d3-q10**: These present glob-based rules as directives within CLAUDE.md files. The curriculum teaches path-specific rules in `.claude/rules/` files with YAML frontmatter (`paths: ["terraform/**/*"]`). The glob matching logic tested is correct, but the file location context does not match curriculum. Consider updating scenarios to reference `.claude/rules/` files with YAML frontmatter.

5. **Task 3.1 — `/memory` command**: The curriculum teaches `/memory` as the debugging tool for "inconsistent behaviour across sessions." No question tests this. Minor gap.

6. **Task 3.1 — `@import` syntax**: The curriculum teaches `@import` for referencing external files from CLAUDE.md and `.claude/rules/` directory for modular organisation. Untested.

7. **Task 3.4 — Plan-vs-direct decision criteria**: Questions test plan mode usage and workflow, but not the selection decision. The curriculum provides specific criteria: plan mode for "library migration affecting 45+ files" vs direct execution for "single-file bug fix with clear stack trace." Consider adding a question presenting multiple tasks and asking which mode applies.

8. **Task 3.4 — Explore subagent**: Curriculum teaches: "Isolates verbose discovery output from the main conversation. Returns summaries to preserve main conversation context." Untested.

9. **Task 3.5 — Interview pattern**: Curriculum: "Have Claude ask questions before implementing (surfaces considerations you would miss in unfamiliar domains)." Untested.

10. **Task 3.6 — Session context isolation**: Curriculum explicitly states: "The same Claude session that generated code is LESS effective at reviewing its own changes." No question tests this key concept (this also overlaps with Domain 4.6).

11. **d3-q20**: CI loop prevention is a practical concept but is not in the curriculum text for Task 3.6. The curriculum covers: `-p` flag, `--output-format json`, session isolation, incremental review context, and CLAUDE.md for CI. This question tests valid knowledge but goes beyond curriculum scope.

### Accuracy Verification
All 20 correct answers verified against curriculum. No P0 issues found. ✅

---

## Domain 4: Prompt Engineering & Structured Output (20 questions)

### Coverage

| Task Statement | Curriculum Topic | Questions | Count | Min Met? |
|---|---|---|---|---|
| 4.1 | Explicit Criteria | d4-q01, q02, q03, q04 | 4 | ✅ |
| 4.2 | Few-Shot Prompting | d4-q05, q06, q07 | 3 | ✅ |
| 4.3 | Structured Output (tool_use) | d4-q08, q09, q10 | 3 | ✅ |
| 4.4 | Validation-Retry Loops | d4-q11, q12, q13 | 3 | ✅ |
| 4.5 | Batch Processing | d4-q14, q15, q16 | 3 | ✅ |
| 4.6 | Multi-Instance Review | d4-q17, q18, q19, q20 | 4 | ✅ |

### Difficulty Distribution
- Foundation: 7 · Intermediate: 7 · Advanced: 6 ✅ Good mix

### Issues Found

#### P1 — Missing Coverage

1. **Task 4.1 — False positive trust problem**: The curriculum explicitly teaches: "High false positive rates in one category destroy trust in ALL categories. Fix: temporarily disable high false-positive categories while improving prompts." This is a key exam concept with no question.

2. **Task 4.3 — Optional/nullable fields to prevent fabrication**: The curriculum states: "Optional/nullable fields when source may not contain information. PREVENTS FABRICATION." This is a critical schema design concept (one of the exam's main takeaways for 4.3) and is untested.

3. **Task 4.5 — Batch API does NOT support multi-turn tool calling**: The curriculum explicitly teaches: "Does NOT support multi-turn tool calling within a single request." This is a key constraint that distinguishes batch from synchronous processing and has no question.

#### P2 — Quality Improvements

4. **d4-q01 / d4-q04**: Both test "explicit criteria/rubric for consistent output." d4-q01 (code quality rubric) and d4-q04 (documentation format rubric) test essentially the same concept in different domains. Consider replacing d4-q04 with a question on the false positive trust problem (gap #1).

5. **d4-q01 Option B**: "Add the word 'please' and 'carefully' to the prompt for emphasis" is too obviously wrong. A plausible distractor might be: "Add a system prompt stating 'You are an expert developer who always writes production-quality code.'"

6. **Task 4.3 — "unclear" enum value and "other" + freeform pattern**: Curriculum teaches these as schema design patterns: "'unclear' enum value for ambiguous cases, 'other' + freeform detail string for extensible categorisation." Untested.

7. **Task 4.4 — `detected_pattern` fields**: Curriculum teaches adding these to structured findings to enable dismissal pattern analysis. Untested.

8. **Task 4.4 — Self-correction flows**: Curriculum teaches: "Extract `calculated_total` alongside `stated_total` to flag discrepancies. Add `conflict_detected` booleans." Untested.

9. **Task 4.5 — `custom_id` for request/response correlation**: Curriculum explicitly names this as a Batch API feature. Untested but partially addressed in d4-q16 (which references identifying failed documents by ID).

10. **Task 4.6 — Per-file local analysis + cross-file integration pass**: Curriculum: "Per-file local analysis passes... Separate cross-file integration pass: catches data flow issues across files." Untested.

### Accuracy Verification
All 20 correct answers verified against curriculum. No P0 issues found. ✅

---

## Domain 5: Context Management & Reliability (15 questions)

### Coverage

| Task Statement | Curriculum Topic | Questions | Count | Min Met? |
|---|---|---|---|---|
| 5.1 | Context Preservation | d5-q01, q02, q03 | 3 | ✅ |
| 5.2 | Escalation & Ambiguity Resolution | d5-q04, q05, q06 | 3 | ⚠️ See issues |
| 5.3 | Error Propagation | d5-q07, q08 | 2 | ✅ |
| 5.4 | Codebase Exploration | d5-q09, q10 | 2 | ✅ |
| 5.5 | Human Review & Confidence Calibration | d5-q11, q12, q13 | 3 | ⚠️ See issues |
| 5.6 | Information Provenance | d5-q14, q15 | 2 | ✅ |

### Difficulty Distribution
- Foundation: 4 · Intermediate: 6 · Advanced: 5 ✅ Good mix

### Issues Found

#### P0 — Curriculum Conflict

1. **d5-q02 — "Progressive summarization" terminology conflict**: The correct answer (A) is labeled "Implement progressive summarization with multiple tiers." However, the curriculum explicitly teaches the **"progressive summarisation trap"**: "Condensing conversation history compresses numerical values, dates, percentages, and customer expectations into vague summaries." The curriculum's fix is: "extract transactional facts into a persistent 'case facts' block. Include in every prompt. Never summarise it."

   **Problem**: A well-prepared student who memorised "progressive summarisation = trap" would reject this answer. While the described implementation (tiered preservation proportional to recency) is more nuanced than naive summarisation, the terminology directly conflicts with curriculum language.

   **Recommended fix**: Rename the technique to avoid the "progressive summarization" term. For example: "Implement tiered context preservation: keep recent messages verbatim, maintain a detailed summary of the middle period, and a high-level summary of the earliest exchanges, while extracting key facts and data points into a persistent block that is never summarised." This aligns the answer with curriculum guidance while preserving the correct implementation.

#### P1 — Missing Coverage

2. **Task 5.1 — Persistent "case facts" block**: The curriculum's primary context preservation technique — extracting transactional facts (amounts, dates, order numbers) into a persistent block that is never summarised — has no question. This is the curriculum's #1 fix for context loss. **Critical gap.**

3. **Task 5.1 — "Lost in the middle" effect**: Curriculum: "Models process the beginning and end of long inputs reliably. Findings buried in the middle may be missed. Fix: place key findings summaries at the beginning." Untested.

4. **Task 5.1 — Tool result trimming**: Curriculum: "Order lookup returns 40+ fields. You need 5. Trim verbose results to relevant fields BEFORE appending to context." Untested.

5. **Task 5.2 — Three valid escalation triggers**: The curriculum defines: (1) customer explicitly requests a human — honour immediately, (2) policy exceptions or gaps, (3) inability to make meaningful progress. None of the D5.2 questions test these. Instead, d5-q04 tests medical triage triggers, d5-q05 tests multi-instance disagreement (a 4.6 concept), and d5-q06 tests aggregate risk thresholds. These are valid concepts but do not cover the curriculum's escalation framework.

6. **Task 5.2 — Frustration nuance**: Curriculum: "If issue is straightforward and customer is frustrated: acknowledge frustration, offer resolution. Only escalate if customer REITERATES their preference for a human after you offer help." Untested.

7. **Task 5.2 — Ambiguous customer matching**: Curriculum: "Multiple customers match a search query. Ask for additional identifiers. Do NOT select based on heuristics." Untested.

8. **Task 5.3 — Access failure vs valid empty result**: Repeated from D2 — the curriculum teaches this in BOTH 2.2 and 5.3: "Access failure: tool could not reach data source. Consider retry. Valid empty result: tool reached source, found no matches. No retry needed." Neither domain has a question testing this.

9. **Task 5.4 — Context degradation and `/compact`**: Curriculum: "Extended sessions: model starts referencing 'typical patterns' instead of specific classes. /compact: reduce context usage when it fills with verbose discovery output." Untested.

10. **Task 5.5 — Aggregate metrics trap**: Curriculum: "97% overall accuracy can hide 40% error rates on a specific document type. Always validate accuracy by document type AND field segment." This is the curriculum's #1 concept for Task 5.5 and is completely untested.

11. **Task 5.5 — Stratified random sampling**: Curriculum: "Sample high-confidence extractions for ongoing verification. Detects novel error patterns that would otherwise slip through." Untested.

12. **Task 5.5 — Field-level confidence calibration**: Curriculum: "Model outputs confidence per field. Calibrate thresholds using labelled validation sets (ground truth data). Route low-confidence fields to human review." Untested.

13. **Task 5.5 — Content mismatch**: Questions d5-q11 (environment approval gates), d5-q12 (multi-stakeholder procurement approval), d5-q13 (escalation chains with timeouts) test approval workflow patterns, **not** the curriculum's Task 5.5 content (aggregate metrics, stratified sampling, confidence calibration). These are valid questions but are mapped to the wrong task statement. They would fit better under Task 5.2 or a general "human oversight" umbrella.

14. **Task 5.6 — Conflict handling**: Curriculum: "Two credible sources report different statistics. Do NOT arbitrarily select one. Annotate with both values and source attribution." Untested.

#### P2 — Quality Improvements

15. **d5-q04 Option A**: Uses the label "confidence thresholds" but describes rule-based mandatory triggers. The curriculum explicitly lists "self-reported confidence scores" as an unreliable escalation trigger. While the option's substance is correct ("regardless of Claude's confidence"), the leading label could confuse students. Rephrase to: "Implement mandatory escalation rules in the system prompt: define specific trigger conditions (e.g., chest pain, breathing difficulty) that must always result in escalation to a human, regardless of Claude's assessment."

16. **d5-q05**: Multi-instance disagreement is a Task 4.6 concept (multi-instance review), not Task 5.2 (escalation). Consider remapping this question to 4.6 or replacing it with a curriculum-aligned 5.2 question about valid escalation triggers.

17. **Task 5.3 — Silent suppression and workflow termination anti-patterns**: Curriculum teaches these as the two key error propagation anti-patterns. Untested.

18. **Task 5.3 — Coverage annotations**: Curriculum: "Synthesis output should note which findings are well-supported vs which areas have gaps." Untested.

19. **Task 5.4 — Scratchpad files and subagent delegation**: Curriculum: "Write key findings to a file, reference it for subsequent questions. Spawn subagents for specific investigations." Untested.

20. **Task 5.6 — Temporal awareness**: Curriculum: "Require publication/data collection dates. Different dates explain different numbers." Untested.

### Accuracy Verification
- 14 of 15 correct answers verified. ✅
- 1 P0 issue found (d5-q02). ❌

---

## Cross-Domain Observations

### Duplicate / Near-Duplicate Concept Testing

| Questions | Shared Concept | Verdict |
|---|---|---|
| d2-q01 / d2-q04 | Tool descriptions as primary selection mechanism | Borderline — different angles (misrouting vs non-selection) but same core lesson |
| d4-q01 / d4-q04 | Explicit rubrics for output consistency | Borderline — code vs documentation but same technique |
| d5-q11 / d5-q12 / d5-q13 | Human approval gate patterns | Three questions on approval workflows, zero on the actual 5.5 curriculum (confidence calibration) |

### Explanation Quality
All 75 explanations follow the recommended pattern: explain why the correct answer is right, then explain why each distractor is wrong. No "X is correct" one-liners found. ✅

### Distractor Quality
Distractors are generally plausible. Two weak distractors flagged:
- **d4-q01 Option B** ("Add 'please' and 'carefully'") — too obviously wrong
- **d4-q14 Option D** ("Claude's built-in batch processing mode by separating items with newlines") — too obviously fabricated

---

## Recommendations

### Immediate (P0 — Must fix before release)

1. **Rewrite d5-q02** to remove "progressive summarization" terminology. Use "tiered context preservation" and include the curriculum's "persistent case facts block" concept in the correct answer.

### High Priority (P1 — Fix this sprint)

2. **Domain 5 needs 5–8 new questions** to cover the massive curriculum gaps:
   - Task 5.1: case facts block, "lost in the middle" effect, tool result trimming
   - Task 5.2: three valid escalation triggers, frustration nuance, ambiguous customer matching
   - Task 5.5: aggregate metrics trap, stratified random sampling, field-level confidence calibration
   - Task 5.6: conflict handling with dual annotation

3. **Remap d5-q11/q12/q13** from Task 5.5 to a more appropriate task statement (or replace with actual 5.5 content: aggregate metrics trap, stratified sampling, confidence calibration).

4. **Domain 3 needs 2–3 new questions** for:
   - Task 3.2: SKILL.md frontmatter (`context: fork`, `allowed-tools`, `argument-hint`)
   - Task 3.2: Skills vs CLAUDE.md distinction
   - Task 3.5: Concrete input/output examples as the top refinement technique

5. **Domain 4 needs 2–3 new questions** for:
   - Task 4.1: false positive trust problem
   - Task 4.3: nullable/optional fields to prevent fabrication
   - Task 4.5: Batch API does NOT support multi-turn tool calling

6. **Domain 2 needs 1–2 new questions** for:
   - Task 2.2: access failure vs valid empty result
   - Task 2.5: Grep (content search) vs Glob (path matching) distinction

7. **Add "access failure vs valid empty result" question** in either D2 or D5 (or both) — the curriculum calls this out in both domains as explicitly tested.

### Lower Priority (P2 — Fix when capacity allows)

8. Swap d2-q04 with a Grep-vs-Glob question to close D2 coverage gap.
9. Swap d4-q04 with a false-positive-trust-problem question to close D4 coverage gap.
10. Update d3-q08/q09/q10 scenarios to reference `.claude/rules/` files with YAML frontmatter instead of inline CLAUDE.md directives.
11. Improve weak distractors in d4-q01 (Option B) and d4-q14 (Option D).
12. Rephrase d5-q04 Option A to remove "confidence thresholds" label (replace with "mandatory escalation rules").
13. Consider remapping d5-q05 from Task 5.2 to Task 4.6 (multi-instance disagreement).
14. Add questions for: Edit-vs-Read+Write fallback (2.5), `/memory` command (3.1), `@import` syntax (3.1), Explore subagent (3.4), interview pattern (3.5), session isolation for reviews (3.6), `detected_pattern` fields (4.4), self-correction flows (4.4), per-file + cross-file pass (4.6).

---

## Appendix: Per-Question Audit Matrix

### Domain 2

| ID | Task | Diff | Correct? | Distractors | Explanation | Issues |
|---|---|---|---|---|---|---|
| d2-q01 | 2.1 | F | ✅ | Good | Good | Near-dup with d2-q04 |
| d2-q02 | 2.1 | I | ✅ | Good | Good | — |
| d2-q03 | 2.1 | A | ✅ | Good | Good | "8–10" vs curriculum "4–5" |
| d2-q04 | 2.1 | F | ✅ | Good | Good | Near-dup with d2-q01 |
| d2-q05 | 2.2 | F | ✅ | Good | Good | — |
| d2-q06 | 2.2 | I | ✅ | Good | Good | — |
| d2-q07 | 2.2 | A | ✅ | Good | Good | — |
| d2-q08 | 2.2 | I | ✅ | Good | Good | — |
| d2-q09 | 2.3 | F | ✅ | Good | Good | — |
| d2-q10 | 2.3 | I | ✅ | Good | Good | — |
| d2-q11 | 2.3 | A | ✅ | Good | Good | — |
| d2-q12 | 2.3 | F | ✅ | Good | Good | — |
| d2-q13 | 2.4 | F | ✅ | Good | Good | — |
| d2-q14 | 2.4 | I | ✅ | Good | Good | — |
| d2-q15 | 2.4 | A | ✅ | Good | Good | — |
| d2-q16 | 2.4 | I | ✅ | Good | Good | — |
| d2-q17 | 2.5 | F | ✅ | Good | Good | — |
| d2-q18 | 2.5 | I | ✅ | Good | Good | — |
| d2-q19 | 2.5 | A | ✅ | Good | Good | — |
| d2-q20 | 2.5 | F | ✅ | Good | Good | — |

### Domain 3

| ID | Task | Diff | Correct? | Distractors | Explanation | Issues |
|---|---|---|---|---|---|---|
| d3-q01 | 3.1 | F | ✅ | Good | Good | — |
| d3-q02 | 3.1 | I | ✅ | Good | Good | — |
| d3-q03 | 3.1 | F | ✅ | Good | Good | — |
| d3-q04 | 3.1 | A | ✅ | Good | Good | — |
| d3-q05 | 3.2 | F | ✅ | Good | Good | Commands only, no skills |
| d3-q06 | 3.2 | I | ✅ | Good | Good | Commands only, no skills |
| d3-q07 | 3.2 | A | ✅ | Good | Good | Commands only, no skills |
| d3-q08 | 3.3 | F | ✅ | Good | Good | Glob in CLAUDE.md vs .claude/rules/ |
| d3-q09 | 3.3 | I | ✅ | Good | Good | Glob in CLAUDE.md vs .claude/rules/ |
| d3-q10 | 3.3 | A | ✅ | Good | Good | Glob in CLAUDE.md vs .claude/rules/ |
| d3-q11 | 3.4 | F | ✅ | Good | Good | — |
| d3-q12 | 3.4 | I | ✅ | Good | Good | — |
| d3-q13 | 3.4 | A | ✅ | Good | Good | — |
| d3-q14 | 3.5 | F | ✅ | Good | Good | — |
| d3-q15 | 3.5 | I | ✅ | Good | Good | — |
| d3-q16 | 3.5 | A | ✅ | Good | Good | — |
| d3-q17 | 3.6 | F | ✅ | Good | Good | — |
| d3-q18 | 3.6 | I | ✅ | Good | Good | — |
| d3-q19 | 3.6 | A | ✅ | Good | Good | — |
| d3-q20 | 3.6 | A | ✅ | Good | Good | Beyond curriculum scope |

### Domain 4

| ID | Task | Diff | Correct? | Distractors | Explanation | Issues |
|---|---|---|---|---|---|---|
| d4-q01 | 4.1 | F | ✅ | Weak B | Good | Weak distractor (Option B) |
| d4-q02 | 4.1 | I | ✅ | Good | Good | — |
| d4-q03 | 4.1 | A | ✅ | Good | Good | — |
| d4-q04 | 4.1 | F | ✅ | Good | Good | Near-dup with d4-q01 |
| d4-q05 | 4.2 | I | ✅ | Good | Good | — |
| d4-q06 | 4.2 | F | ✅ | Good | Good | — |
| d4-q07 | 4.2 | A | ✅ | Good | Good | — |
| d4-q08 | 4.3 | F | ✅ | Good | Good | — |
| d4-q09 | 4.3 | I | ✅ | Good | Good | — |
| d4-q10 | 4.3 | A | ✅ | Good | Good | — |
| d4-q11 | 4.4 | F | ✅ | Good | Good | — |
| d4-q12 | 4.4 | I | ✅ | Good | Good | — |
| d4-q13 | 4.4 | A | ✅ | Good | Good | — |
| d4-q14 | 4.5 | F | ✅ | Weak D | Good | Weak distractor (Option D) |
| d4-q15 | 4.5 | I | ✅ | Good | Good | — |
| d4-q16 | 4.5 | A | ✅ | Good | Good | — |
| d4-q17 | 4.6 | F | ✅ | Good | Good | — |
| d4-q18 | 4.6 | I | ✅ | Good | Good | — |
| d4-q19 | 4.6 | A | ✅ | Good | Good | — |
| d4-q20 | 4.6 | I | ✅ | Good | Good | — |

### Domain 5

| ID | Task | Diff | Correct? | Distractors | Explanation | Issues |
|---|---|---|---|---|---|---|
| d5-q01 | 5.1 | F | ✅ | Good | Good | — |
| d5-q02 | 5.1 | I | ❌ P0 | Good | Good | "Progressive summarization" conflicts with curriculum |
| d5-q03 | 5.1 | A | ✅ | Good | Good | — |
| d5-q04 | 5.2 | F | ✅ | Good | Good | Misleading "confidence thresholds" label |
| d5-q05 | 5.2 | I | ✅ | Good | Good | Belongs in 4.6, not 5.2 |
| d5-q06 | 5.2 | A | ✅ | Good | Good | — |
| d5-q07 | 5.3 | I | ✅ | Good | Good | — |
| d5-q08 | 5.3 | A | ✅ | Good | Good | — |
| d5-q09 | 5.4 | F | ✅ | Good | Good | — |
| d5-q10 | 5.4 | I | ✅ | Good | Good | — |
| d5-q11 | 5.5 | F | ✅ | Good | Good | Not aligned with 5.5 curriculum |
| d5-q12 | 5.5 | I | ✅ | Good | Good | Not aligned with 5.5 curriculum |
| d5-q13 | 5.5 | A | ✅ | Good | Good | Not aligned with 5.5 curriculum |
| d5-q14 | 5.6 | I | ✅ | Good | Good | — |
| d5-q15 | 5.6 | A | ✅ | Good | Good | — |
