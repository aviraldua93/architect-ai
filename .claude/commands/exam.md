# Mock Exam

Simulate a full Claude Certified Architect (CCA-F) exam.

## Usage

```
/exam               — Full 60-question timed exam (120 min)
/exam --no-timer    — Practice mode without countdown
/exam -q 10         — Quick practice exam with 10 questions
```

## What It Does

1. Selects questions weighted by official CCA-F domain percentages:
   - Domain 1 (Agentic Architecture): 27% → 16 questions
   - Domain 2 (Tool Design & MCP): 18% → 11 questions
   - Domain 3 (Claude Code Config): 20% → 12 questions
   - Domain 4 (Prompt Engineering): 20% → 12 questions
   - Domain 5 (Context & Reliability): 15% → 9 questions
2. Starts a 120-minute countdown timer (unless `--no-timer`)
3. Shows only ✓/✗ after each answer — no explanations until the end
4. At completion (or timeout), shows:
   - Scaled score out of 1000
   - PASS/FAIL verdict (threshold: 720/1000)
   - Per-domain breakdown with bar charts
   - Time used vs time allowed
   - Weakest domain recommendation
5. Saves results to `~/.architect-ai/exams/`

## Running Directly

```bash
npx tsx src/cli/exam.ts                          # Full exam
npx tsx src/cli/exam.ts --no-timer               # No timer
npx tsx src/cli/exam.ts --no-timer --questions 5  # Quick 5-question practice
npx tsx src/cli/index.ts exam --no-timer -q 10   # Via CLI entry point
```

## Passing Score

720/1000 (approximately 72%)
