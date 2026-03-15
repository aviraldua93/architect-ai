# Domain 4: Prompt Engineering (20%)

Covers Domain 4 of the Claude Certified Architect (Foundations) exam — prompt design, structured output, validation-retry patterns, and multi-instance review.

## Files

| File | Exam Task | What It Demonstrates |
|------|-----------|---------------------|
| system-prompts.ts | 4.1 — Explicit Criteria | System prompts for Quiz, Explainer, and Assessor agents with explicit role definitions, behavioural constraints, output format specs, tool usage guidance, and self-evaluation criteria. |
| ew-shot.ts | 4.2 — Few-Shot Prompting | Example banks for quiz presentation, feedback, explanation, and assessment tasks. Dynamic selection respecting token budgets, progressive complexity ordering, and tag-based filtering. Includes ormatExamplesAsMessages for Messages API injection. |
| output-schemas.ts | 4.3 — Structured Output + Validation | Zod schemas for QuizResponse, Explanation, and Assessment outputs. alidateWithRetry utility re-prompts the model on validation failure. xtractJsonFromText strips markdown code fences. |

## Exam Concepts

- **4.1 Explicit Criteria** — System prompts must state success criteria unambiguously rather than relying on implicit understanding.
- **4.2 Few-Shot Examples** — Including 2-3 examples dramatically improves output consistency.
- **4.3 Structured Output + Validation** — Request JSON/XML, validate with a schema, and retry on parse failure.
- **4.4 Batch API** — High-throughput, lower-cost processing for non-interactive workloads.
- **4.5 Multi-Instance Review** — Run the same prompt N times and aggregate results for higher reliability.

## Connections

- **src/agents/** — Agent system prompts are the primary consumers of prompt engineering patterns.
- **src/content/** — Content generation (explanations, scenarios) will use templated prompts with few-shot examples.
- **src/context/** — Prompt length interacts directly with context window budgets.