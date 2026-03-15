# Tier 2: End-to-End Tests

**Cost:** ~$3–4 per full run (Claude API calls).
**Speed:** Minutes, depending on API latency.
**When to use:** Before merging PRs that change agent logic, tool definitions, or MCP handlers.

## What This Tier Tests

Tier 2 runs real requests against the Claude API to validate end-to-end behaviour:

- **Agent workflow tests** — Full agentic loops: send prompt → tool calls → aggregation → final response.
- **Tool integration tests** — Tools execute correctly and return structured results.
- **CLI command tests** — Commands dispatch properly and produce expected output.
- **MCP protocol tests** — MCP server responds to tool/resource/prompt requests correctly.
- **Context management tests** — Conversation history stays within token budgets under load.

## Commands

```bash
bun run test:tier2    # Run all Tier 2 tests (requires ANTHROPIC_API_KEY)
```

## Why This Tier Costs Money

Every test makes real API calls to Claude. This is intentional — mocked responses cannot catch prompt regressions, tool description quality issues, or changes in model behaviour. Budget accordingly.
