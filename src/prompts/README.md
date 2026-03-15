# Domain 4: Prompt Engineering (20%)

Covers Domain 4 of the Claude Certified Architect (Foundations) exam — prompt design, structured output, validation-retry patterns, and multi-instance review.

## Files

No `.ts` files have been implemented yet. This directory is on the roadmap after Domains 1–3.

**Planned implementations:**
- System prompt templates with explicit success criteria (Task 4.1)
- Few-shot example injection for consistent output formatting (Task 4.2)
- Structured output schemas with validation and retry (Task 4.3)
- Batch API integration for bulk question generation (Task 4.4)
- Multi-instance review for content quality assurance (Task 4.5)

## Exam Concepts

- **4.1 Explicit Criteria** — System prompts must state success criteria unambiguously rather than relying on implicit understanding.
- **4.2 Few-Shot Examples** — Including 2–3 examples dramatically improves output consistency.
- **4.3 Structured Output + Validation** — Request JSON/XML, validate with a schema, and retry on parse failure.
- **4.4 Batch API** — High-throughput, lower-cost processing for non-interactive workloads.
- **4.5 Multi-Instance Review** — Run the same prompt N times and aggregate results for higher reliability.

## Connections

- **`src/agents/`** — Agent system prompts are the primary consumers of prompt engineering patterns.
- **`src/content/`** — Content generation (explanations, scenarios) will use templated prompts with few-shot examples.
- **`src/context/`** — Prompt length interacts directly with context window budgets.
