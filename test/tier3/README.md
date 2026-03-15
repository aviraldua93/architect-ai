# Tier 3: LLM-as-Judge Evaluation

**Cost:** ~$0.15 per run (lightweight Claude API calls for evaluation only).
**Speed:** Under 30 seconds.
**When to use:** After content changes — new questions, explanations, or scenarios.

## What This Tier Evaluates

Tier 3 uses Claude as an evaluator to assess curriculum quality. It does not test code correctness (that is Tier 2's job); it tests whether the *content* is good enough to teach the exam:

- **Question quality** — Are scenarios realistic? Are distractors plausible? Is the rationale accurate?
- **Explanation clarity** — Are concept deep-dives clear, accurate, and exam-relevant?
- **Scenario completeness** — Do practice scenarios cover enough domains and edge cases?
- **Prompt effectiveness** — Do system prompts produce high-quality teaching interactions?

## Commands

```bash
bun run test:tier3    # Run all Tier 3 evaluations (requires ANTHROPIC_API_KEY)
```

## Why LLM-as-Judge?

Human review does not scale. Automated string matching cannot assess pedagogical quality. LLM-as-judge strikes the balance: it evaluates semantic quality (clarity, accuracy, completeness) at a fraction of the cost of human reviewers.
