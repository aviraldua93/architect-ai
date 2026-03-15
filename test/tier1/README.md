# Tier 1: Static Validation

**Cost:** Free — no API keys, no network access.
**Speed:** Under 5 seconds.
**When to use:** On every commit. Runs in CI and locally.

## What This Tier Tests

Tier 1 catches structural and syntactic issues without executing any code against Claude:

- **TypeScript type checking** — strict mode enabled, catches type errors at compile time.
- **ESLint** — code quality rules and best practices.
- **Prettier** — consistent formatting across the codebase.
- **Question schema validation** — ensures all JSON question banks conform to the Zod schema in `src/content/questions/schema.ts`.

## Commands

```bash
bun run test:tier1    # Run all Tier 1 checks
bun run type-check    # TypeScript compiler only
bun run lint          # ESLint only
bun run format        # Prettier only
```

## Why Three Tiers?

Static analysis is the foundation of the testing pyramid. It catches the cheapest-to-fix errors (typos, type mismatches, schema violations) before any money is spent on API calls in Tier 2 or Tier 3.
