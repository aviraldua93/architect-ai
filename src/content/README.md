# Content: Pre-Generated Study Material

Pre-loaded curriculum for the **Claude Certified Architect (Foundations)** exam. This content powers Tier 1 (offline CLI) and Tier 2 (MCP server) — no API key required.

## Subdirectories

### `questions/`

Scenario-based question banks in JSON format, validated against a Zod schema.

| File | Description |
|------|-------------|
| `schema.ts` | Zod schema defining the question format: `id`, `domain`, `taskStatement`, `difficulty` (foundation/intermediate/advanced), `scenario`, `question`, `options` (A–D), `correctAnswer`, `rationale`, and `tags`. |
| `index.ts` | Loader module. Reads all JSON question banks, validates against the schema, and exports a typed `Question[]` array with optional domain/difficulty filtering. |
| `domain-1-agentic-architecture.json` | Domain 1 question bank — agentic loops, orchestration, subagent invocation, hooks. |
| `sample-questions.json` | Sample questions used during development and testing. |

### `explanations/`

Concept deep-dives in Markdown format with code examples. Currently empty — content to be added per domain.

### `scenarios/`

Exam-realistic practice scenarios combining multiple domains. Currently empty — scenarios to be added.

## Question Schema

```json
{
  "id": "d1-q001",
  "domain": 1,
  "taskStatement": "1.1",
  "difficulty": "foundation",
  "scenario": "You are building a CLI agent that...",
  "question": "What should you check to determine if the agent should continue looping?",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correctAnswer": "B",
  "rationale": "The stop_reason field indicates whether...",
  "tags": ["agentic-loop", "stop_reason"]
}
```

## Connections

- **`src/cli/`** — The `quiz` command loads questions from this directory and presents them interactively.
- **`src/mcp/`** — MCP resources will serve this content to external clients (Claude Desktop, Copilot).
- **`test/tier1/`** — Schema validation tests ensure all question files conform to the Zod schema.
